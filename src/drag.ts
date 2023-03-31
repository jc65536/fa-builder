import { stateConfig } from "./config.js";
import { addState, Edge, State, states, edges, addEdge, canvas, stateLayer, edgeLayer, topLayer } from "./main.js";
import {
    BezierControls, ControlHandle, LineControls, ShortestLineControls, StartingEdgeControls
} from "./path-controls.js";
import {
    deselectEdge, deselectState, selectEdge,
    selectState, finishSelection, selectedStates
} from "./selection.js";
import {
    applyCTM, ifelse, setAttributes, screenToSvgCoords, lineIntersectsRect,
    bezierIntersectsRect, setLineCmd, createSvgElement
} from "./util.js";
import * as vec from "./vector.js";
import { Vec } from "./vector.js";

export abstract class DragCtx {
    abstract handleDrag(evt: MouseEvent): void;
    abstract handleDrop(evt: MouseEvent): void;
}

export class DragStatesCtx extends DragCtx {
    init: Vec;
    statesToDrag: Set<State>;
    handlesToDrag: Set<SVGCircleElement>;
    dragGroup: SVGGElement;
    transform: SVGTransform;

    constructor(statesToDrag: Set<State>, init: Vec) {
        super();
        this.init = init;
        this.statesToDrag = statesToDrag;
        this.handlesToDrag = new Set();

        this.dragGroup = createSvgElement("g");
        canvas.appendChild(this.dragGroup);

        this.transform = canvas.createSVGTransform();
        this.dragGroup.transform.baseVal
            .appendItem(this.transform)
            .setTranslate(0, 0);

        this.statesToDrag.forEach(s => {
            this.dragGroup.appendChild(s.groupElem);

            s.handles.forEach(({ circle }) => {
                if (topLayer.contains(circle)) {
                    this.dragGroup.appendChild(circle);
                    this.handlesToDrag.add(circle);
                }
            })
        });
    }

    updatePos(evt: MouseEvent) {
        const mousePos = screenToSvgCoords([evt.x, evt.y]);
        const delta = vec.sub(mousePos)(this.init);

        this.transform.setTranslate(...delta);

        this.statesToDrag.forEach(state => {
            const newPos: Vec = vec.add(delta)(state.pos);
            state.outEdges.forEach(edge => edge.controls.updateStart(newPos));
            state.inEdges.forEach(edge => edge.controls.updateEnd(newPos));
        });

        return delta;
    }

    handleDrag(evt: MouseEvent): void {
        this.updatePos(evt);
    }

    handleDrop(evt: MouseEvent): void {
        const delta = this.updatePos(evt);

        const updateTransform = (elem: SVGGraphicsElement) => {
            elem.transform.baseVal
                .appendItem(canvas.createSVGTransform())
                .setTranslate(...delta);
            elem.transform.baseVal.consolidate();
        };

        this.statesToDrag.forEach(state => {
            updateTransform(state.groupElem);
            state.handles.forEach(h => updateTransform(h.circle));

            state.pos = vec.add(state.pos)(delta);
            stateLayer.appendChild(state.groupElem);
        });

        this.handlesToDrag.forEach(circle => topLayer.appendChild(circle));

        this.dragGroup.remove();
    }
}

export class DragEdgeCtx extends DragCtx {
    edge: Edge;

    constructor(state: State) {
        super();

        const path = createSvgElement("path");
        path.classList.add("edge");
        edgeLayer.appendChild(path);

        this.edge = {
            startState: state,
            transChar: "",
            endState: state,
            pathElem: path,
            textElem: null,
            textPathElem: null,
            controls: null
        };
    }

    handleDrag(evt: MouseEvent): void {
        const mousePos = screenToSvgCoords([evt.x, evt.y]);
        const endState = [...states].find(state =>
            vec.dist(mousePos, state.pos) < stateConfig.radius);

        this.edge.endState = endState;

        const angle = vec.atanScreenVec(vec.sub(this.edge.startState.pos)
            (endState === undefined ? mousePos : endState.pos));
        const radius = vec.polar(stateConfig.radius, angle);
        const start = vec.add(this.edge.startState.pos)(radius);
        const end = endState === undefined ? mousePos : vec.sub(endState.pos)(radius);
        setLineCmd(this.edge.pathElem, { start, end });
    }

    handleDrop(evt: MouseEvent): void {
        if (this.edge.endState === undefined) {
            this.edge.pathElem.remove();
            return;
        }
        addEdge(this.edge)
    }
}

export const inRange = (a: number, x: number, b: number) => a <= x && x <= b;

export class DragSelectionCtx extends DragCtx {
    init: Vec;
    rect: SVGRectElement;

    constructor(init: Vec, rect: SVGRectElement) {
        super();
        this.init = init;
        this.rect = rect;
    }

    handleDrag(evt: MouseEvent): void {
        const mousePos = screenToSvgCoords([evt.x, evt.y]);
        const topLeft = this.init.map((x, i) => Math.min(x, mousePos[i])) as Vec;
        const dim = this.init.map((x, i) => Math.max(x, mousePos[i]) - topLeft[i]) as Vec;
        setAttributes(this.rect, ["x", "y", "width", "height"],
            topLeft.concat(dim).map(x => x.toString()));

        const botRight = vec.add(topLeft)(dim);
        edges.forEach(edge => {
            const controls = edge.controls;
            if (controls instanceof LineControls || controls instanceof ShortestLineControls || controls instanceof StartingEdgeControls) {
                const cpAbs = controls.calcAbsCtrlPts();
                ifelse(lineIntersectsRect(cpAbs.start, cpAbs.end, topLeft, botRight))
                    (selectEdge)(deselectEdge)(edge);
            } else if (controls instanceof BezierControls) {
                const cpAbs = controls.calcAbsCtrlPts();
                ifelse(bezierIntersectsRect(cpAbs.start, cpAbs.startCtrl,
                    cpAbs.endCtrl, cpAbs.end, topLeft, botRight))
                    (selectEdge)(deselectEdge)(edge);
            }
        });

        states.forEach(state => {
            const rad = stateConfig.radius;
            const [l, t] = topLeft;
            const [r, b] = botRight;
            const [x, y] = state.pos;

            const intersects = (inRange(l - rad, x, r + rad) && inRange(t, y, b))
                || (inRange(l, x, r) && inRange(t - rad, y, b + rad))
                || [topLeft, [l, b], [r, t], botRight]
                    .some((corner: Vec) => vec.dist(state.pos, corner) <= rad);

            ifelse(intersects)(selectState)(deselectState)(state);
        });
    }

    handleDrop(evt: MouseEvent): void {
        finishSelection();
        this.rect.remove();
    }
}

export class DragAddStateCtx extends DragCtx {
    offset: Vec;
    circle: HTMLElement;

    constructor(offset: Vec, circle: HTMLElement) {
        super();
        this.offset = offset;
        this.circle = circle;
    }

    handleDrag(evt: MouseEvent): void {
        [this.circle.style.left, this.circle.style.top] =
            vec.sub([evt.x, evt.y])(this.offset).map(n => `${n}px`);
    }

    handleDrop(evt: MouseEvent): void {
        const rect = this.circle.getBoundingClientRect();
        const center = vec.scale(0.5)
            (vec.add([rect.x, rect.y])([rect.right, rect.bottom]));
        addState(screenToSvgCoords(center));
        this.circle.remove();
    }
}

export class DragCtrlHandleCtx extends DragCtx {
    dragCallback: (mousePos: Vec) => void;

    constructor(dragCallback: (mousePos: Vec) => void) {
        super();
        this.dragCallback = dragCallback;
    }

    handleDrag(evt: MouseEvent): void {
        this.dragCallback(screenToSvgCoords([evt.x, evt.y]));
    }

    handleDrop(evt: MouseEvent): void {
        this.handleDrag(evt);
    }
}
