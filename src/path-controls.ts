import * as vec from "./vector.js";
import * as dragMan from "./drag-manager.js";
import { ctrlHandleConfig, edgeConfig, stateConfig } from "./config.js";
import { canvas, Edge, State } from "./main.js";
import {
    createSvgElement, setAttributes, setBezierCmd, setLineCmd
} from "./util.js";
import { Vec } from "./vector.js";
import { DragCtrlHandleCtx } from "./drag.js";

export type LineCtrlPts = { start: Vec, end: Vec };

export type BezierCtrlPts = LineCtrlPts & { startCtrl: Vec, endCtrl: Vec };

type BaseCtrlPts = LineCtrlPts & { startStatePos: Vec, endStatePos: Vec };

export type CtrlPts = LineCtrlPts | BezierCtrlPts;

class ControlHandle {
    pos: Vec;
    circle: SVGCircleElement;

    constructor(dragCallback: (_: Vec) => void) {
        this.circle = createSvgElement("circle")
        this.circle.classList.add("control-handle");
        this.circle.setAttribute("r", ctrlHandleConfig.radius.toString());

        this.circle.addEventListener("mousedown", (evt: MouseEvent) => {
            if (dragMan.hasContext() || evt.button !== 0)
                return;

            dragMan.setContext(new DragCtrlHandleCtx(dragCallback));
        });
    }

    updatePos(pos: Vec) {
        this.pos = pos;
        setAttributes(this.circle, ["cx", "cy"], pos.map(x => x.toString()));
    }
}

type HandleMap = { [key: string]: ControlHandle };

export abstract class PathControls {
    path: SVGPathElement;
    startGroup: SVGGElement;
    endGroup: SVGGElement;

    cp: BaseCtrlPts;

    // Handle objects' positions are relative to its group
    startHandles: HandleMap;
    endHandles: HandleMap;

    constructor(edge: Edge, startHandles: HandleMap, endHandles: HandleMap) {
        this.path = edge.pathElem;
        this.startGroup = edge.startState?.groupElem;
        this.endGroup = edge.endState.groupElem;
        this.startHandles = startHandles;
        this.endHandles = endHandles;
    }

    abstract updateStart(pos: Vec): void;
    abstract updateEnd(pos: Vec): void;
    abstract calcAbsCtrlPts(): CtrlPts;

    show() {
        Object.values(this.startHandles)
            .forEach(h => this.startGroup.appendChild(h.circle));
        Object.values(this.endHandles)
            .forEach(h => this.endGroup.appendChild(h.circle));
    }

    hide() {
        Object.values(this.startHandles).forEach(h => h.circle.remove());
        Object.values(this.endHandles).forEach(h => h.circle.remove());
    }
}

export class BezierControls extends PathControls {
    cp: BaseCtrlPts & BezierCtrlPts;

    startHandles: {
        startHandle: ControlHandle,
        startCtrlHandle: ControlHandle
    };

    endHandles: {
        endCtrlHandle: ControlHandle,
        endHandle: ControlHandle
    };

    constructor(edge: Edge) {
        super(edge, {
            startHandle: new ControlHandle(mousePos => {
                const newStart = vec.polar(stateConfig.radius,
                    vec.atanScreenVec(vec.sub(mousePos)(this.cp.startStatePos)));

                this.cp.startCtrl = vec.add(this.cp.startCtrl)
                    (vec.sub(newStart)(this.cp.start));
                this.cp.start = newStart;
                    
                this.startHandles.startHandle.updatePos(this.cp.start);
                this.startHandles.startCtrlHandle.updatePos(this.cp.startCtrl);
                this.updatePath();
            }),
            startCtrlHandle: new ControlHandle(mousePos => {
                this.cp.startCtrl = vec.sub(mousePos)(this.cp.startStatePos);
                this.startHandles.startCtrlHandle.updatePos(this.cp.startCtrl);
                this.updatePath();
            })
        }, {
            endCtrlHandle: new ControlHandle(mousePos => {
                this.cp.endCtrl = vec.sub(mousePos)(this.cp.endStatePos);
                this.endHandles.endCtrlHandle.updatePos(this.cp.endCtrl);
                this.updatePath();
            }),
            endHandle: new ControlHandle(mousePos => {
                const newEnd = vec.polar(stateConfig.radius,
                    vec.atanScreenVec(vec.sub(mousePos)(this.cp.endStatePos)))
                
                this.cp.endCtrl = vec.add(this.cp.endCtrl)
                    (vec.sub(newEnd)(this.cp.end));
                this.cp.end = newEnd;
                
                this.endHandles.endHandle.updatePos(this.cp.end);
                this.endHandles.endCtrlHandle.updatePos(this.cp.endCtrl);
                this.updatePath();
            })
        });

        const { startState, endState } = edge;

        if (startState === endState) {
            const start = vec.polar(stateConfig.radius, Math.PI / 3);
            const end = vec.add(start)([-stateConfig.radius, 0]);
            const ctrlFrom = vec.add([0, -1.5 * stateConfig.radius])

            this.cp = {
                startStatePos: startState.pos,
                start: start,
                startCtrl: ctrlFrom(start),
                endCtrl: ctrlFrom(end),
                end: end,
                endStatePos: endState.pos
            };
        } else {
            const oldCp = edge.controls.cp;
            const ctrlFrom = vec.scale(2.5);

            this.cp = {
                startStatePos: startState.pos,
                start: oldCp.start,
                startCtrl: ctrlFrom(oldCp.start),
                endCtrl: ctrlFrom(oldCp.end),
                end: oldCp.end,
                endStatePos: endState.pos
            };
        }

        this.startHandles.startHandle.updatePos(this.cp.start);
        this.startHandles.startCtrlHandle.updatePos(this.cp.startCtrl);
        this.endHandles.endHandle.updatePos(this.cp.end);
        this.endHandles.endCtrlHandle.updatePos(this.cp.endCtrl);
        this.updatePath();
    }

    updateStart(pos: Vec): void {
        this.cp.startStatePos = pos;
        this.updatePath();
    }

    updateEnd(pos: Vec): void {
        this.cp.endStatePos = pos;
        this.updatePath();
    }

    updatePath() {
        setBezierCmd(this.path, this.calcAbsCtrlPts());
    }

    calcAbsCtrlPts(): BezierCtrlPts {
        return {
            start: vec.add(this.cp.startStatePos)(this.cp.start),
            startCtrl: vec.add(this.cp.startStatePos)(this.cp.startCtrl),
            endCtrl: vec.add(this.cp.endStatePos)(this.cp.endCtrl),
            end: vec.add(this.cp.endStatePos)(this.cp.end)
        };
    }
}

export class LineControls extends PathControls {
    cp: BaseCtrlPts & LineCtrlPts;

    startHandles: { startHandle: ControlHandle };
    endHandles: { endHandle: ControlHandle };

    constructor(edge: Edge) {
        super(edge, {
            startHandle: new ControlHandle(mousePos => {
                this.cp.start = vec.polar(stateConfig.radius,
                    vec.atanScreenVec(vec.sub(mousePos)(this.cp.startStatePos)))
                this.startHandles.startHandle.updatePos(this.cp.start);
                this.updatePath();
            })
        }, {
            endHandle: new ControlHandle(mousePos => {
                this.cp.end = vec.polar(stateConfig.radius,
                    vec.atanScreenVec(vec.sub(mousePos)(this.cp.endStatePos)));
                this.endHandles.endHandle.updatePos(this.cp.end);
                this.updatePath();
            })
        });

        this.cp = edge.controls.cp;

        this.startHandles.startHandle.updatePos(this.cp.start);
        this.endHandles.endHandle.updatePos(this.cp.end);
        this.updatePath();
    }

    updateStart(pos: Vec): void {
        this.cp.startStatePos = pos;
        this.updatePath();
    }

    updateEnd(pos: Vec): void {
        this.cp.endStatePos = pos;
        this.updatePath();
    }

    updatePath() {
        setLineCmd(this.path, this.calcAbsCtrlPts());
    }

    calcAbsCtrlPts(): LineCtrlPts {
        return {
            start: vec.add(this.cp.startStatePos)(this.cp.start),
            end: vec.add(this.cp.endStatePos)(this.cp.end)
        };
    }
}

export class ShortestLineControls extends PathControls {
    constructor(edge: Edge) {
        super(edge, {}, {});

        const { startState, endState } = edge;

        this.cp = {
            startStatePos: startState.pos,
            start: null,
            end: null,
            endStatePos: endState.pos
        }

        this.updatePath();
    }

    updateStart(pos: Vec): void {
        this.cp.startStatePos = pos;
        this.updatePath();
    }

    updateEnd(pos: Vec): void {
        this.cp.endStatePos = pos;
        this.updatePath();
    }

    updatePath() {
        this.cp.start = vec.polar(stateConfig.radius,
            vec.angleBetweenScreenVec(this.cp.startStatePos)
                (this.cp.endStatePos));
        this.cp.end = vec.scale(-1)(this.cp.start);

        setLineCmd(this.path, this.calcAbsCtrlPts());
    }

    calcAbsCtrlPts(): LineCtrlPts {
        return {
            start: vec.add(this.cp.startStatePos)(this.cp.start),
            end: vec.add(this.cp.endStatePos)(this.cp.end)
        };
    }
}

const startingEdgeDist = stateConfig.radius + edgeConfig.startingEdgeLength;

export class StartingEdgeControls extends PathControls {
    endHandles: { endHandle: ControlHandle };

    constructor(edge: Edge) {
        super(edge, {}, {
            endHandle: new ControlHandle(mousePos => {
                const angle = vec.atanScreenVec(vec.sub(mousePos)(this.cp.endStatePos));
                this.cp.start = vec.polar(startingEdgeDist, angle);
                this.cp.end = vec.polar(stateConfig.radius, angle);
                this.updatePath();
            })
        });

        this.cp = {
            startStatePos: null,
            start: [-startingEdgeDist, 0],
            end: [-stateConfig.radius, 0],
            endStatePos: edge.endState.pos
        };

        this.updatePath();
    }

    updateStart(_: vec.Vec): void { }

    updateEnd(pos: vec.Vec): void {
        this.cp.endStatePos = pos;
        this.updatePath();
    }

    updatePath() {
        this.endHandles.endHandle.updatePos(this.cp.end);
        setLineCmd(this.path, this.calcAbsCtrlPts());
    }

    calcAbsCtrlPts(): LineCtrlPts {
        return {
            start: vec.add(this.cp.endStatePos)(this.cp.start),
            end: vec.add(this.cp.endStatePos)(this.cp.end)
        }
    }
}
