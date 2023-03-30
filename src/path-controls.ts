import * as vec from "./vector.js";
import * as dragman from "./drag-manager.js";
import { ctrlHandleConfig, edgeConfig, stateConfig } from "./config.js";
import { canvas, Edge } from "./main.js";
import {
    createSvgElement, setAttributes, setBezierCmd, setLineCmd
} from "./util.js";
import { Vec } from "./vector.js";
import { DragCtrlHandleCtx } from "./drag.js";

export type LineCtrlPts = {
    start: Vec,
    end: Vec
};

export type BezierCtrlPts = {
    start: Vec,
    startCtrl: Vec,
    endCtrl: Vec,
    end: Vec
};

export type CtrlPts = LineCtrlPts | BezierCtrlPts;

const createHandle = (dragCallback: (mousePos: Vec) => void) => {
    const circle = createSvgElement("circle");
    circle.classList.add("control-handle");
    circle.setAttribute("r", ctrlHandleConfig.radius.toString());
    circle.addEventListener("mousedown", (evt: MouseEvent) => {
        if (dragman.hasContext() || evt.button !== 0)
            return;

        dragman.setContext(new DragCtrlHandleCtx(dragCallback));
    });
    return circle;
}

export abstract class PathControls {
    path: SVGPathElement;

    cp: {
        startStatePos: Vec;
        startAngle: number;
        endAngle: number;
        endStatePos: Vec;
    };

    handles: { [key: string]: SVGCircleElement };

    constructor(path: SVGPathElement,
        handles: { [key: string]: SVGCircleElement }) {
        this.path = path;
        this.handles = handles;
    }

    abstract updateStart(pos: Vec): void;
    abstract updateEnd(pos: Vec): void;
    abstract calcAbsCtrlPts(): CtrlPts;

    show() {
        Object.values(this.handles).forEach(handle => canvas.appendChild(handle));
    }

    hide() {
        Object.values(this.handles).forEach(handle => handle.remove());
    }
}

export class BezierControls extends PathControls {
    cp: {
        startStatePos: Vec,
        startAngle: number,
        startCtrlRel: Vec,
        endCtrlRel: Vec,
        endAngle: number,
        endStatePos: Vec
    };

    handles: {
        startHandle: SVGCircleElement,
        startCtrlHandle: SVGCircleElement,
        endCtrlHandle: SVGCircleElement,
        endHandle: SVGCircleElement
    };

    constructor(edge: Edge) {
        super(edge.pathElem, {
            startHandle: createHandle(mousePos => {
                const angle = vec.atanScreenVec(vec.sub(mousePos)(this.cp.startStatePos));
                this.cp.startAngle = angle;
                const absCp = this.calcAbsCtrlPts();
                this.updateStartHandles(absCp);
                setBezierCmd(this.path, absCp);
            }),
            startCtrlHandle: createHandle(mousePos => {
                const absCp = this.calcAbsCtrlPts();
                absCp.startCtrl = mousePos;
                this.cp.startCtrlRel = vec.sub(mousePos)(absCp.start);
                this.updateStartHandles(absCp);
                setBezierCmd(this.path, absCp);
            }),
            endCtrlHandle: createHandle(mousePos => {
                const absCp = this.calcAbsCtrlPts();
                absCp.endCtrl = mousePos;
                this.cp.endCtrlRel = vec.sub(mousePos)(absCp.end);
                this.updateEndHandles(absCp);
                setBezierCmd(this.path, absCp);
            }),
            endHandle: createHandle(mousePos => {
                const angle = vec.atanScreenVec(vec.sub(mousePos)(this.cp.endStatePos));
                this.cp.endAngle = angle;
                const absCp = this.calcAbsCtrlPts();
                this.updateEndHandles(absCp);
                setBezierCmd(this.path, absCp);
            })
        });

        const { startState, endState } = edge;

        if (startState === endState) {
            this.cp = {
                startStatePos: startState.pos,
                startAngle: Math.PI / 3,
                startCtrlRel: [0, -1.5 * stateConfig.radius],
                endCtrlRel: [0, -1.5 * stateConfig.radius],
                endAngle: 2 * Math.PI / 3,
                endStatePos: endState.pos
            };
        } else {
            const oldCp = edge.controls.cp;
            this.cp = {
                startStatePos: startState.pos,
                startAngle: oldCp.startAngle,
                startCtrlRel: vec.polar(stateConfig.radius * 1.5, oldCp.startAngle),
                endCtrlRel: vec.polar(stateConfig.radius * 1.5, oldCp.endAngle),
                endAngle: oldCp.endAngle,
                endStatePos: endState.pos
            };
        }

        const absCp = this.calcAbsCtrlPts();
        this.updateStartHandles(absCp);
        this.updateEndHandles(absCp);
        setBezierCmd(this.path, absCp);
    }

    updateStart(pos: Vec): void {
        this.cp.startStatePos = pos;
        const absCp = this.calcAbsCtrlPts();
        this.updateStartHandles(absCp);
        setBezierCmd(this.path, absCp);
    }

    updateEnd(pos: Vec): void {
        this.cp.endStatePos = pos;
        const absCp = this.calcAbsCtrlPts();
        this.updateEndHandles(absCp);
        setBezierCmd(this.path, absCp);
    }

    updateStartHandles(absCp: BezierCtrlPts) {
        setAttributes(this.handles.startHandle, ["cx", "cy"],
            absCp.start.map(x => x.toString()));
        setAttributes(this.handles.startCtrlHandle, ["cx", "cy"],
            absCp.startCtrl.map(x => x.toString()));
    }

    updateEndHandles(absCp: BezierCtrlPts) {
        setAttributes(this.handles.endHandle, ["cx", "cy"],
            absCp.end.map(x => x.toString()));
        setAttributes(this.handles.endCtrlHandle, ["cx", "cy"],
            absCp.endCtrl.map(x => x.toString()));
    }

    calcAbsStart() {
        return vec.add(this.cp.startStatePos)(vec.polar(stateConfig.radius, this.cp.startAngle));
    }

    calcAbsCtrlPts(): BezierCtrlPts {
        const start = this.calcAbsStart();
        const startCtrl = vec.add(start)(this.cp.startCtrlRel);
        const end = vec.add(this.cp.endStatePos)
            (vec.polar(stateConfig.radius, this.cp.endAngle));
        const endCtrl = vec.add(end)(this.cp.endCtrlRel);
        return { start, startCtrl, endCtrl, end };
    }
}

export class LineControls extends PathControls {
    cp: {
        startStatePos: Vec,
        startAngle: number,
        endAngle: number,
        endStatePos: Vec
    }

    handles: {
        startHandle: SVGCircleElement,
        endHandle: SVGCircleElement
    }

    constructor(edge: Edge) {
        super(edge.pathElem, {
            startHandle: createHandle(mousePos => {
                const angle = vec.atanScreenVec(vec.sub(mousePos)(this.cp.startStatePos));
                this.cp.startAngle = angle;
                const absCp = this.calcAbsCtrlPts();
                this.updateStartHandle(absCp);
                setLineCmd(this.path, absCp);
            }),
            endHandle: createHandle(mousePos => {
                const angle = vec.atanScreenVec(vec.sub(mousePos)(this.cp.endStatePos));
                this.cp.endAngle = angle;
                const absCp = this.calcAbsCtrlPts();
                this.updateEndHandle(absCp);
                setLineCmd(this.path, absCp);
            })
        });

        const { startState, endState } = edge;
        const oldCp = edge.controls.cp;

        this.cp = {
            startStatePos: startState.pos,
            startAngle: oldCp.startAngle,
            endAngle: oldCp.endAngle,
            endStatePos: endState.pos
        };

        const absCp = this.calcAbsCtrlPts();
        this.updateStartHandle(absCp);
        this.updateEndHandle(absCp);
        setLineCmd(this.path, absCp);
    }

    updateStart(pos: Vec): void {
        this.cp.startStatePos = pos;
        const absCp = this.calcAbsCtrlPts();
        this.updateStartHandle(absCp);
        setLineCmd(this.path, absCp);
    }

    updateEnd(pos: Vec): void {
        this.cp.endStatePos = pos;
        const absCp = this.calcAbsCtrlPts();
        this.updateEndHandle(absCp);
        setLineCmd(this.path, absCp);
    }

    updateStartHandle(absCp: LineCtrlPts) {
        setAttributes(this.handles.startHandle, ["cx", "cy"],
            absCp.start.map(x => x.toString()));
    }

    updateEndHandle(absCp: LineCtrlPts) {
        setAttributes(this.handles.endHandle, ["cx", "cy"],
            absCp.end.map(x => x.toString()));
    }

    calcAbsCtrlPts(): LineCtrlPts {
        const start = vec.add(this.cp.startStatePos)
            (vec.polar(stateConfig.radius, this.cp.startAngle));
        const end = vec.add(this.cp.endStatePos)
            (vec.polar(stateConfig.radius, this.cp.endAngle));
        return { start, end };
    }
}

export class ShortestLineControls extends PathControls {
    constructor(edge: Edge) {
        super(edge.pathElem, {});

        const { startState, endState } = edge;

        const angle = vec.angleBetweenScreenVec(startState.pos)(endState.pos);

        this.cp = {
            startStatePos: startState.pos,
            startAngle: angle,
            endAngle: angle + Math.PI,
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

    calcAbsCtrlPts(): LineCtrlPts {
        const angle = vec.angleBetweenScreenVec(this.cp.startStatePos)
            (this.cp.endStatePos);
        const radius = vec.polar(stateConfig.radius, angle);
        const start = vec.add(this.cp.startStatePos)(radius);
        const end = vec.sub(this.cp.endStatePos)(radius);
        return { start, end };
    }

    updatePath() {
        setLineCmd(this.path, this.calcAbsCtrlPts());
    }
}

export class StartingEdgeControls extends PathControls {
    handles: { endHandle: SVGCircleElement };

    constructor(edge: Edge) {
        super(edge.pathElem, {
            endHandle: createHandle(mousePos => {
                const angle = vec.atanScreenVec(vec.sub(mousePos)(this.cp.endStatePos));
                this.cp.endAngle = angle;
                const absCp = this.calcAbsCtrlPts();
                this.updateEndHandle(absCp);
                setLineCmd(this.path, absCp);
            })
        });

        this.cp = {
            startStatePos: null,
            startAngle: null,
            endAngle: Math.PI,
            endStatePos: edge.endState.pos
        };

        const absCp = this.calcAbsCtrlPts();
        this.updateEndHandle(absCp);
        setLineCmd(this.path, absCp);
    }

    updateStart(pos: vec.Vec): void { }

    updateEnd(pos: vec.Vec): void {
        this.cp.endStatePos = pos;
        const absCp = this.calcAbsCtrlPts();
        this.updateEndHandle(absCp);
        setLineCmd(this.path, absCp);
    }

    updateEndHandle(absCp: LineCtrlPts) {
        setAttributes(this.handles.endHandle, ["cx", "cy"],
            absCp.end.map(x => x.toString()));
    }

    calcAbsCtrlPts(): LineCtrlPts {
        const end = vec.add(this.cp.endStatePos)
            (vec.polar(stateConfig.radius, this.cp.endAngle));
        const start = vec.add(end)
            (vec.polar(edgeConfig.startingEdgeLength, this.cp.endAngle));
        return { start, end };
    }
}
