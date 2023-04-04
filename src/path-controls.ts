import * as vec from "./vector.js";
import * as dragMan from "./drag-manager.js";
import { ctrlHandleConfig, edgeConfig, stateConfig } from "./config.js";
import { canvas, Edge, State, topLayer } from "./main.js";
import {
    createSvgElement, setAttributes, setBezierCmd, setLineCmd
} from "./util.js";
import { Vec } from "./vector.js";
import { DragCtrlHandleCtx } from "./drag.js";

export type LineCtrlPts = { start: Vec, end: Vec };

export type BezierCtrlPts = LineCtrlPts & { startCtrl: Vec, endCtrl: Vec };

export type CtrlPts = LineCtrlPts | BezierCtrlPts;

export class ControlHandle {
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

    cp: CtrlPts;
    handles: { [key: string]: ControlHandle };

    startStatePos: Vec;
    endStatePos: Vec;

    reversed: boolean;

    constructor(edge: Edge, startHandles: ControlHandle[],
        endHandles: ControlHandle[]) {
        this.path = edge.pathElem;

        const { startState, endState } = edge;

        this.startStatePos = startState?.pos;
        this.endStatePos = endState.pos;

        this.reversed = edge.controls?.reversed ?? false;

        const initTransform = (state: State) => (handle: ControlHandle) => {
            handle.circle.transform.baseVal
                .appendItem(canvas.createSVGTransform())
                .setTranslate(...state.pos);
            state.handles.add(handle);
        };

        if (startState !== null)
            startHandles.forEach(initTransform(startState));

        endHandles.forEach(initTransform(endState));
    }

    abstract updateStart(pos: Vec): void;
    abstract updateEnd(pos: Vec): void;
    abstract calcAbsCtrlPts(): CtrlPts;
    abstract updatePath(): void;

    show() {
        Object.values(this.handles)
            .forEach(h => topLayer.appendChild(h.circle));
    }

    hide() {
        Object.values(this.handles).forEach(h => h.circle.remove());
    }

    toggleReversed() {
        this.path.classList.toggle("reversed");
        this.reversed = !this.reversed;
    }
}

export class BezierControls extends PathControls {
    cp: BezierCtrlPts;
    handles: { [key in keyof BezierCtrlPts]: ControlHandle };

    constructor(edge: Edge, shifted: boolean) {
        const updateHandle = (name: keyof BezierCtrlPts) =>
            (this.handles[name].updatePos(this.cp[name]), updateHandle);

        const startHandles = {
            start: new ControlHandle(mousePos => {
                const newStart = vec.polar(stateConfig.radius,
                    vec.atanScreenVec(vec.sub(mousePos)(this.startStatePos)));

                this.cp.startCtrl = vec.add(this.cp.startCtrl)
                    (vec.sub(newStart)(this.cp.start));
                this.cp.start = newStart;

                updateHandle("start")("startCtrl");
                this.updatePath();
            }),
            startCtrl: new ControlHandle(mousePos => {
                this.cp.startCtrl = vec.sub(mousePos)(this.startStatePos);
                updateHandle("startCtrl");
                this.updatePath();
            })
        };

        const endHandles = {
            endCtrl: new ControlHandle(mousePos => {
                this.cp.endCtrl = vec.sub(mousePos)(this.endStatePos);
                updateHandle("endCtrl");
                this.updatePath();
            }),
            end: new ControlHandle(mousePos => {
                const newEnd = vec.polar(stateConfig.radius,
                    vec.atanScreenVec(vec.sub(mousePos)(this.endStatePos)))

                this.cp.endCtrl = vec.add(this.cp.endCtrl)
                    (vec.sub(newEnd)(this.cp.end));
                this.cp.end = newEnd;

                updateHandle("endCtrl")("end");
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

            this.toggleReversed();
        } else {
            const oldCp = edge.controls.cp;
            const oldAbsCp = edge.controls.calcAbsCtrlPts();
            const ctrlFrom = vec.scale(1 + vec.dist(oldAbsCp.start,
                oldAbsCp.end) / (3 * stateConfig.radius));

            if (shifted) {
                const pi6 = Math.PI / 6;
                const start = vec.rotateScreenVec(pi6)(oldCp.start);
                const end = vec.rotateScreenVec(-pi6)(oldCp.end);

                this.cp = {
                    start,
                    startCtrl: ctrlFrom(start),
                    endCtrl: ctrlFrom(end),
                    end
                };
            } else {
                this.cp = {
                    start: oldCp.start,
                    startCtrl: ctrlFrom(oldCp.start),
                    endCtrl: ctrlFrom(oldCp.end),
                    end: oldCp.end
                };
            }
        }

        updateHandle("start")("startCtrl")("endCtrl")("end");
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
        setBezierCmd(this.path, this.calcAbsCtrlPts(), this.reversed);
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
        const updateHandle = (name: keyof LineCtrlPts) =>
            (this.handles[name].updatePos(this.cp[name]), updateHandle);

        const startHandle = new ControlHandle(mousePos => {
            this.cp.start = vec.polar(stateConfig.radius,
                vec.atanScreenVec(vec.sub(mousePos)(this.startStatePos)))
            updateHandle("start");
            this.updatePath();
        });

        const endHandle = new ControlHandle(mousePos => {
            this.cp.end = vec.polar(stateConfig.radius,
                vec.atanScreenVec(vec.sub(mousePos)(this.endStatePos)));
            this.handles.end.updatePos(this.cp.end);
            updateHandle("end");
            this.updatePath();
        });

        super(edge, [startHandle], [endHandle]);

        this.handles = { start: startHandle, end: endHandle };

        this.cp = edge.controls.cp;

        updateHandle("start")("end");
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
        setLineCmd(this.path, this.calcAbsCtrlPts(), this.reversed);
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
        this.handles = {};

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
            vec.atanScreenVec(vec.sub(this.endStatePos)(this.startStatePos)));
        this.cp.end = vec.scale(-1)(this.cp.start);

        setLineCmd(this.path, this.calcAbsCtrlPts(), this.reversed);
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
        const end = new ControlHandle(mousePos => {
            const angle = vec.atanScreenVec(vec.sub(mousePos)(this.endStatePos));
            this.cp.start = vec.polar(startingEdgeDist, angle);
            this.cp.end = vec.polar(stateConfig.radius, angle);
            this.updatePath();
        });

        super(edge, [], [end]);

        this.handles = { end };

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
        setLineCmd(this.path, this.calcAbsCtrlPts(), this.reversed);
    }

    calcAbsCtrlPts(): LineCtrlPts {
        return {
            start: vec.add(this.endStatePos)(this.cp.start),
            end: vec.add(this.endStatePos)(this.cp.end)
        }
    }
}
