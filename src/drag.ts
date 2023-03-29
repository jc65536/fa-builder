import { stateConfig } from "./config.js";
import { addState, canvas, Edge, State, states, edges } from "./main.js";
import {
    BezierControls, LineControls, ShortestLineControls
} from "./path-controls.js";
import * as transConfig from "./trans-config.js"
import {
    applyCTM, closestPoints, ifelse, setAttributes, screenToSvgCoords,
    lineIntersectsRect, bezierIntersectsRect, setLineCmd
} from "./util.js";
import * as vec from "./vector.js";
import { Vec } from "./vector.js";

export abstract class DragCtx {
    abstract handleDrag(evt: MouseEvent): void;
    abstract handleDrop(evt: MouseEvent): void;
}

export class DragStateCtx extends DragCtx {
    state: State;
    init: vec.Vec;
    trans: SVGTransform;

    constructor(state: State, init: vec.Vec, trans: SVGTransform) {
        super();
        this.state = state;
        this.init = init;
        this.trans = trans;
    }

    handleDrag(evt: MouseEvent): void {
        const mousePos = screenToSvgCoords([evt.x, evt.y]);
        const [tx, ty] = vec.sub(mousePos)(this.init);
        this.trans.setTranslate(tx, ty);

        const addTrans = vec.add([tx, ty]);
        const newPos: vec.Vec = addTrans(this.state.pos);

        this.state.outEdges.forEach(edge => edge.controls.updateStart(newPos));
        this.state.inEdges.forEach(edge => edge.controls.updateEnd(newPos));
    }

    handleDrop(evt: MouseEvent): void {
        this.state.svgElem.transform.baseVal.consolidate();
        this.state.pos = applyCTM([0, 0], this.state.svgElem.getCTM());
    }
}

export class DragEdgeCtx extends DragCtx {
    edge: Edge;

    constructor(edge: Edge) {
        super();
        this.edge = edge;
    }

    handleDrag(evt: MouseEvent): void {
        const mousePos = screenToSvgCoords([evt.x, evt.y]);
        const to = [...states].find(state =>
            vec.dist(mousePos, state.pos) < stateConfig.radius);

        this.edge.endState = to;

        const cursorPosOr = ifelse(to === undefined)(mousePos);
        const [start, end] = closestPoints(this.edge.startState.pos, cursorPosOr(to?.pos))
        setLineCmd(this.edge.svgElem, { start, end: cursorPosOr(end) });
    }

    handleDrop(evt: MouseEvent): void {
        const edge = this.edge;
        const path = edge.svgElem;

        if (edge.endState === undefined) {
            path.remove();
            return;
        }

        if (edge.startState === edge.endState) {
            edge.controls = new BezierControls(edge);
            edge.controls.updateStart(edge.startState.pos);
            edge.controls.updateEnd(edge.endState.pos);
        } else {
            edge.controls = new ShortestLineControls(edge);
        }

        edges.add(edge);
        edge.startState.outEdges.push(edge);
        edge.endState.inEdges.push(edge);

        path.classList.add("edge");
        canvas.appendChild(path);
    }
}

export class DragSelectionCtx extends DragCtx {
    init: vec.Vec;
    rect: SVGRectElement;
    selected: Set<Edge>;

    constructor(init: vec.Vec, rect: SVGRectElement) {
        super();
        this.init = init;
        this.rect = rect;
        this.selected = new Set();
    }

    select = (edge: Edge) => {
        this.selected.add(edge);
        edge.svgElem.classList.add("selected");
    };

    deselect = (edge: Edge) => {
        this.selected.delete(edge);
        edge.svgElem.classList.remove("selected");
    };

    handleDrag(evt: MouseEvent): void {
        const mousePos = screenToSvgCoords([evt.x, evt.y]);
        const topLeft = this.init.map((x, i) => Math.min(x, mousePos[i])) as vec.Vec;
        const dim = this.init.map((x, i) => Math.max(x, mousePos[i]) - topLeft[i]) as vec.Vec;
        setAttributes(this.rect, ["x", "y", "width", "height"],
            topLeft.concat(dim).map(x => x.toString()));

        const botRight = vec.add(topLeft)(dim);
        edges.forEach(edge => {
            const controls = edge.controls;
            if (controls instanceof LineControls || controls instanceof ShortestLineControls) {
                const cpAbs = controls.calcAbsCtrlPts();
                ifelse(lineIntersectsRect(cpAbs.start, cpAbs.end, topLeft, botRight))
                    (this.select)(this.deselect)(edge);
            } else if (controls instanceof BezierControls) {
                const cpAbs = controls.calcAbsCtrlPts();
                ifelse(bezierIntersectsRect(cpAbs.start, cpAbs.startCtrl,
                    cpAbs.endCtrl, cpAbs.end, topLeft, botRight))
                    (this.select)(this.deselect)(edge);
            }
        });
    }

    handleDrop(evt: MouseEvent): void {
        transConfig.showForm(this.selected);
        this.rect.remove();
    }
}

export class DragAddStateCtx extends DragCtx {
    offset: vec.Vec;
    circle: HTMLElement;

    constructor(offset: vec.Vec, circle: HTMLElement) {
        super();
        this.offset = offset;
        this.circle = circle;
    }

    handleDrag(evt: MouseEvent): void {
        const style = this.circle.style;
        [style.left, style.top] = vec.sub([evt.x, evt.y])(this.offset).map(n => `${n}px`);
    }

    handleDrop(evt: MouseEvent): void {
        const rect = this.circle.getBoundingClientRect();
        const center = vec.scale(0.5)(vec.add([rect.x, rect.y])([rect.right, rect.bottom]));
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
    }
}
