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

export type CtrlPts = LineCtrlPts | BezierCtrlPts;

class ControlHandle {
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
        setAttributes(this.circle, ["cx", "cy"], pos.map(x => x.toString()));
    }
}

export abstract class PathControls {
    path: SVGPathElement;

    startGroup: SVGGElement;
    endGroup: SVGGElement;

    startStatePos: Vec;
    endStatePos: Vec;

    cp: CtrlPts;

    // Handle objects' positions are relative to its group
    startHandles: ControlHandle[];
    endHandles: ControlHandle[];

    constructor(edge: Edge, startHandles: ControlHandle[],
        endHandles: ControlHandle[]) {
        this.path = edge.pathElem;
        this.startGroup = edge.startState?.groupElem;
        this.endGroup = edge.endState.groupElem;
        
        this.startStatePos = edge.startState?.pos;
        this.endStatePos = edge.endState.pos;

        this.startHandles = startHandles;
        this.endHandles = endHandles;
    }

    abstract updateStart(pos: Vec): void;
    abstract updateEnd(pos: Vec): void;
    abstract calcAbsCtrlPts(): CtrlPts;

    show() {
        this.startHandles.forEach(h => this.startGroup.appendChild(h.circle));
        this.endHandles.forEach(h => this.endGroup.appendChild(h.circle));
    }

    hide() {
        this.startHandles.forEach(h => h.circle.remove());
        this.endHandles.forEach(h => h.circle.remove());
    }
}

export class BezierControls extends PathControls {
    cp: BezierCtrlPts;

    handles: { [key in keyof BezierCtrlPts]: ControlHandle };

    constructor(edge: Edge) {
        const startHandles = {
            start: new ControlHandle(mousePos => {
                const newStart = vec.polar(stateConfig.radius,
                    vec.atanScreenVec(vec.sub(mousePos)(this.startStatePos)));

                this.cp.startCtrl = vec.add(this.cp.startCtrl)
                    (vec.sub(newStart)(this.cp.start));
                this.cp.start = newStart;

                this.handles.start.updatePos(this.cp.start);
                this.handles.startCtrl.updatePos(this.cp.startCtrl);
                this.updatePath();
            }),
            startCtrl: new ControlHandle(mousePos => {
                this.cp.startCtrl = vec.sub(mousePos)(this.startStatePos);
                this.handles.startCtrl.updatePos(this.cp.startCtrl);
                this.updatePath();
            })
        };

        const endHandles = {
            endCtrl: new ControlHandle(mousePos => {
                this.cp.endCtrl = vec.sub(mousePos)(this.endStatePos);
                this.handles.endCtrl.updatePos(this.cp.endCtrl);
                this.updatePath();
            }),
            end: new ControlHandle(mousePos => {
                const newEnd = vec.polar(stateConfig.radius,
                    vec.atanScreenVec(vec.sub(mousePos)(this.endStatePos)))

                this.cp.endCtrl = vec.add(this.cp.endCtrl)
                    (vec.sub(newEnd)(this.cp.end));
                this.cp.end = newEnd;

                this.handles.endCtrl.updatePos(this.cp.endCtrl);
                this.handles.end.updatePos(this.cp.end);
                this.updatePath();
            })
        };

        super(edge, Object.values(startHandles), Object.values(endHandles));

        this.handles = { ...startHandles, ...endHandles };

        const { startState, endState } = edge;

        if (startState === endState) {
            const start = vec.polar(stateConfig.radius, Math.PI / 3);
            const end = vec.add(start)([-stateConfig.radius, 0]);
            const ctrlFrom = vec.add([0, -1.5 * stateConfig.radius])

            this.cp = {
                start: start,
                startCtrl: ctrlFrom(start),
                endCtrl: ctrlFrom(end),
                end: end
            };
        } else {
            const oldCp = edge.controls.cp;
            const ctrlFrom = vec.scale(2.5);

            this.cp = {
                start: oldCp.start,
                startCtrl: ctrlFrom(oldCp.start),
                endCtrl: ctrlFrom(oldCp.end),
                end: oldCp.end
            };
        }

        this.handles.start.updatePos(this.cp.start);
        this.handles.startCtrl.updatePos(this.cp.startCtrl);
        this.handles.endCtrl.updatePos(this.cp.endCtrl);
        this.handles.end.updatePos(this.cp.end);
        this.updatePath();
    }

    updateStart(pos: Vec): void {
        this.startStatePos = pos;
        this.updatePath();
    }

    updateEnd(pos: Vec): void {
        this.endStatePos = pos;
        this.updatePath();
    }

    updatePath() {
        setBezierCmd(this.path, this.calcAbsCtrlPts());
    }

    calcAbsCtrlPts(): BezierCtrlPts {
        return {
            start: vec.add(this.startStatePos)(this.cp.start),
            startCtrl: vec.add(this.startStatePos)(this.cp.startCtrl),
            endCtrl: vec.add(this.endStatePos)(this.cp.endCtrl),
            end: vec.add(this.endStatePos)(this.cp.end)
        };
    }
}

export class LineControls extends PathControls {
    cp: LineCtrlPts;

    handles: { [key in keyof LineCtrlPts]: ControlHandle };


    constructor(edge: Edge) {
        const startHandle = new ControlHandle(mousePos => {
            this.cp.start = vec.polar(stateConfig.radius,
                vec.atanScreenVec(vec.sub(mousePos)(this.startStatePos)))
            this.handles.start.updatePos(this.cp.start);
            this.updatePath();
        });

        const endHandle = new ControlHandle(mousePos => {
            this.cp.end = vec.polar(stateConfig.radius,
                vec.atanScreenVec(vec.sub(mousePos)(this.endStatePos)));
            this.handles.end.updatePos(this.cp.end);
            this.updatePath();
        });

        super(edge, [startHandle], [endHandle]);

        this.handles = { start: startHandle, end: endHandle };

        this.cp = edge.controls.cp;

        this.handles.start.updatePos(this.cp.start);
        this.handles.end.updatePos(this.cp.end);
        this.updatePath();
    }

    updateStart(pos: Vec): void {
        this.startStatePos = pos;
        this.updatePath();
    }

    updateEnd(pos: Vec): void {
        this.endStatePos = pos;
        this.updatePath();
    }

    updatePath() {
        setLineCmd(this.path, this.calcAbsCtrlPts());
    }

    calcAbsCtrlPts(): LineCtrlPts {
        return {
            start: vec.add(this.startStatePos)(this.cp.start),
            end: vec.add(this.endStatePos)(this.cp.end)
        };
    }
}

export class ShortestLineControls extends PathControls {
    constructor(edge: Edge) {
        super(edge, [], []);

        this.cp = { start: null, end: null };

        this.updatePath();
    }

    updateStart(pos: Vec): void {
        this.startStatePos = pos;
        this.updatePath();
    }

    updateEnd(pos: Vec): void {
        this.endStatePos = pos;
        this.updatePath();
    }

    updatePath() {
        this.cp.start = vec.polar(stateConfig.radius,
            vec.angleBetweenScreenVec(this.startStatePos)(this.endStatePos));
        this.cp.end = vec.scale(-1)(this.cp.start);

        setLineCmd(this.path, this.calcAbsCtrlPts());
    }

    calcAbsCtrlPts(): LineCtrlPts {
        return {
            start: vec.add(this.startStatePos)(this.cp.start),
            end: vec.add(this.endStatePos)(this.cp.end)
        };
    }
}

const startingEdgeDist = stateConfig.radius + edgeConfig.startingEdgeLength;

export class StartingEdgeControls extends PathControls {
    handles: { end: ControlHandle };

    constructor(edge: Edge) {
        const endHandle = new ControlHandle(mousePos => {
            const angle = vec.atanScreenVec(vec.sub(mousePos)(this.endStatePos));
            this.cp.start = vec.polar(startingEdgeDist, angle);
            this.cp.end = vec.polar(stateConfig.radius, angle);
            this.updatePath();
        });

        super(edge, [], [endHandle]);

        this.handles.end = endHandle;

        this.cp = {
            start: [-startingEdgeDist, 0],
            end: [-stateConfig.radius, 0]
        };

        this.updatePath();
    }

    updateStart(_: vec.Vec): void { }

    updateEnd(pos: vec.Vec): void {
        this.endStatePos = pos;
        this.updatePath();
    }

    updatePath() {
        this.handles.end.updatePos(this.cp.end);
        setLineCmd(this.path, this.calcAbsCtrlPts());
    }

    calcAbsCtrlPts(): LineCtrlPts {
        return {
            start: vec.add(this.endStatePos)(this.cp.start),
            end: vec.add(this.endStatePos)(this.cp.end)
        }
    }
}
