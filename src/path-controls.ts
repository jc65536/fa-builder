import { ctrlHandleConfig, stateConfig } from "./config.js";
import { canvas, State } from "./main.js";
import { closestPoints, createSvgElement, Path, setAttributes, setBezierCmd, setLineCmd } from "./util.js";
import * as vec from "./vector.js";
import * as dragman from "./dragman.js";
import { Vec } from "./vector.js";
import { DragCtrlHandleCtx } from "./drag.js";

export type LineCtrlPoints = {
    start: Vec,
    end: Vec
};

export type BezierCtrlPoints = {
    start: Vec,
    startCtrl: Vec,
    endCtrl: Vec,
    end: Vec
};

export type CtrlPoints = LineCtrlPoints | BezierCtrlPoints;

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
    handles: { [key: string]: SVGCircleElement };

    constructor(path: SVGPathElement,
        handles: { [key: string]: SVGCircleElement }) {
        this.path = path;
        this.handles = handles;
    }

    abstract updateStart(pos: Vec): void;
    abstract updateEnd(pos: Vec): void;
    abstract calcAbsCtrlPoints(): CtrlPoints;

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

    constructor(startState: State, endState: State, path: SVGPathElement) {
        super(path, {
            startHandle: createHandle(mousePos => {
                const angle = vec.atanScreenVec(vec.sub(mousePos)(this.cp.startStatePos));
                this.cp.startAngle = angle;
                const absCp = this.calcAbsCtrlPoints();
                this.updateStartHandles(absCp);
                setBezierCmd(this.path, absCp);
            }),
            startCtrlHandle: createHandle(mousePos => {
                const absCp = this.calcAbsCtrlPoints();
                absCp.startCtrl = mousePos;
                this.cp.startCtrlRel = vec.sub(mousePos)(absCp.start);
                this.updateStartHandles(absCp);
                setBezierCmd(this.path, absCp);
            }),
            endCtrlHandle: createHandle(mousePos => {
                const absCp = this.calcAbsCtrlPoints();
                absCp.endCtrl = mousePos;
                this.cp.endCtrlRel = vec.sub(mousePos)(absCp.end);
                this.updateEndHandles(absCp);
                setBezierCmd(this.path, absCp);
            }),
            endHandle: createHandle(mousePos => {
                const angle = vec.atanScreenVec(vec.sub(mousePos)(this.cp.endStatePos));
                this.cp.endAngle = angle;
                const absCp = this.calcAbsCtrlPoints();
                this.updateEndHandles(absCp);
                setBezierCmd(this.path, absCp);
            })
        });

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
            const angle = vec.angleBetweenScreenVec(startState.pos)(endState.pos);

            this.cp = {
                startStatePos: startState.pos,
                startAngle: angle,
                startCtrlRel: vec.polar(stateConfig.radius * 1.5, angle),
                endCtrlRel: vec.polar(stateConfig.radius * 1.5, angle + Math.PI),
                endAngle: angle + Math.PI,
                endStatePos: endState.pos
            };
        }

        const absCp = this.calcAbsCtrlPoints();
        this.updateStartHandles(absCp);
        this.updateEndHandles(absCp);
        setBezierCmd(this.path, absCp);
    }

    updateStart(pos: Vec): void {
        this.cp.startStatePos = pos;
        const absCp = this.calcAbsCtrlPoints();
        this.updateStartHandles(absCp);
        setBezierCmd(this.path, absCp);
    }

    updateEnd(pos: Vec): void {
        this.cp.endStatePos = pos;
        const absCp = this.calcAbsCtrlPoints();
        this.updateEndHandles(absCp);
        setBezierCmd(this.path, absCp);
    }

    updateStartHandles(absCp: BezierCtrlPoints) {
        setAttributes(this.handles.startHandle, ["cx", "cy"],
            absCp.start.map(x => x.toString()));
        setAttributes(this.handles.startCtrlHandle, ["cx", "cy"],
            absCp.startCtrl.map(x => x.toString()));
    }

    updateEndHandles(absCp: BezierCtrlPoints) {
        setAttributes(this.handles.endHandle, ["cx", "cy"],
            absCp.end.map(x => x.toString()));
        setAttributes(this.handles.endCtrlHandle, ["cx", "cy"],
            absCp.endCtrl.map(x => x.toString()));
    }

    calcAbsStart() {
        return vec.add(this.cp.startStatePos)(vec.polar(stateConfig.radius, this.cp.startAngle));
    }

    calcAbsCtrlPoints(): BezierCtrlPoints {
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

    constructor(startState: State, endState: State, path: SVGPathElement) {
        super(path, {
            startHandle: createHandle(mousePos => {
                const angle = vec.atanScreenVec(vec.sub(mousePos)(this.cp.startStatePos));
                this.cp.startAngle = angle;
                const absCp = this.calcAbsCtrlPoints();
                this.updateStartHandle(absCp);
                setLineCmd(this.path, absCp);
            }),
            endHandle: createHandle(mousePos => {
                const angle = vec.atanScreenVec(vec.sub(mousePos)(this.cp.endStatePos));
                this.cp.endAngle = angle;
                const absCp = this.calcAbsCtrlPoints();
                this.updateEndHandle(absCp);
                setLineCmd(this.path, absCp);
            })
        });

        const angle = vec.angleBetweenScreenVec(startState.pos)(endState.pos);

        this.cp = {
            startStatePos: startState.pos,
            startAngle: angle,
            endAngle: angle + Math.PI,
            endStatePos: endState.pos
        };

        const absCp = this.calcAbsCtrlPoints();
        this.updateStartHandle(absCp);
        this.updateEndHandle(absCp);
        setLineCmd(this.path, absCp);
    }

    updateStart(pos: vec.Vec): void {
        this.cp.startStatePos = pos;
        const absCp = this.calcAbsCtrlPoints();
        this.updateStartHandle(absCp);
        setLineCmd(this.path, absCp);
    }

    updateEnd(pos: vec.Vec): void {
        this.cp.endStatePos = pos;
        const absCp = this.calcAbsCtrlPoints();
        this.updateEndHandle(absCp);
        setLineCmd(this.path, absCp);
    }

    updateStartHandle(absCp: LineCtrlPoints) {
        setAttributes(this.handles.startHandle, ["cx", "cy"],
            absCp.start.map(x => x.toString()));
    }

    updateEndHandle(absCp: LineCtrlPoints) {
        setAttributes(this.handles.endHandle, ["cx", "cy"],
            absCp.end.map(x => x.toString()));
    }

    calcAbsCtrlPoints(): LineCtrlPoints {
        const start = vec.add(this.cp.startStatePos)
            (vec.polar(stateConfig.radius, this.cp.startAngle));
        const end = vec.add(this.cp.endStatePos)
            (vec.polar(stateConfig.radius, this.cp.endAngle));
        return { start, end };
    }
}

export class ShortestLine extends PathControls {
    startStatePos: Vec;
    endStatePos: Vec;

    constructor(startState: State, endState: State, path: SVGPathElement) {
        super(path, {});
        this.startStatePos = startState.pos;
        this.endStatePos = endState.pos;
        this.updatePath();
    }

    updateStart(pos: vec.Vec): void {
        this.startStatePos = pos;
        this.updatePath();
    }

    updateEnd(pos: vec.Vec): void {
        this.endStatePos = pos;
        this.updatePath();
    }

    calcAbsCtrlPoints(): LineCtrlPoints {
        const [start, end] = closestPoints(this.startStatePos, this.endStatePos);
        return { start, end };
    }

    updatePath() {
        setLineCmd(this.path, this.calcAbsCtrlPoints());
    }
}
