import { epsilonChar, stateConfig } from "./config.js";
import { addState, canvas, Edge, State, states, edges } from "./main.js";
import {
    Path, setPathCmd, applyCTM, closestPoints, ifelse, side, newStr,
    setAttributes, screenToSvgCoords, numOrd, lineIntersectsRect, bezierIntersectsRect
} from "./util.js";
import * as vec from "./vector.js";

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

        this.state.outEdges.forEach(edge => {
            const cp = edge.ctrlPoints;
            switch (cp.type) {
                case Path.Line:
                    [cp.p1, cp.p2] = closestPoints(newPos, edge.to.pos);
                    break;
                case Path.Bezier:
                    cp.from = newPos;
                    break;
            }
            setPathCmd(edge.svgElem, cp);
        });

        this.state.inEdges.forEach(edge => {
            const cp = edge.ctrlPoints;
            switch (cp.type) {
                case Path.Line:
                    [cp.p1, cp.p2] = closestPoints(edge.from.pos, newPos);
                    break;
                case Path.Bezier:
                    cp.to = newPos;
                    break;
            }
            setPathCmd(edge.svgElem, cp);
        });
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

        this.edge.to = to;

        const cursorPosOr = ifelse(to === undefined)(mousePos);
        const [p1, p2] = closestPoints(this.edge.from.pos, cursorPosOr(to?.pos))
        this.edge.ctrlPoints = {
            type: Path.Line,
            p1: p1,
            p2: cursorPosOr(p2)
        }
        setPathCmd(this.edge.svgElem, this.edge.ctrlPoints);
    }

    handleDrop(evt: MouseEvent): void {
        const edge = this.edge;
        const path = this.edge.svgElem;

        if (edge.to === undefined) {
            path.remove();
            return;
        }

        if (edge.from === edge.to) {
            edge.ctrlPoints = {
                type: Path.Bezier,
                from: edge.from.pos,
                startA: Math.PI / 3,
                startCtrlRel: vec.polar(1.5 * stateConfig.radius, Math.PI / 2),
                endCtrlRel: vec.polar(1.5 * stateConfig.radius, Math.PI / 2),
                endA: Math.PI * 2 / 3,
                to: edge.from.pos
            };
            setPathCmd(path, edge.ctrlPoints);
            path.setAttribute("marker-end", "url(#arrow)");
            path.classList.add("edge");
            canvas.appendChild(path);

            edge.from.outEdges.filter(e => e.to === edge.to).forEach(e => {
                const cp = e.ctrlPoints;
                if (cp.type === Path.Bezier) {
                    cp.startA += Math.PI / 3;
                    cp.startCtrlRel = vec.polar(1.5 * stateConfig.radius, cp.startA + Math.PI / 6);
                    cp.endA += Math.PI / 3;
                    cp.endCtrlRel = vec.polar(1.5 * stateConfig.radius, cp.endA - Math.PI / 6);
                    setPathCmd(e.svgElem, cp);
                }
            });
        } else {
            edge.from.outEdges.filter(e => e.to === edge.to).forEach(e => {
                const cp = e.ctrlPoints;
                const fromPos = e.from.pos;
                const toPos = e.to.pos;
                const a = vec.angleBetweenScreen(fromPos)(toPos);
                const da = Math.PI / 6;
                switch (cp.type) {
                    case Path.Line:
                        e.ctrlPoints = {
                            type: Path.Bezier,
                            from: fromPos,
                            startA: a + da,
                            startCtrlRel: vec.polar(1.5 * stateConfig.radius, a + da),
                            endCtrlRel: vec.polar(1.5 * stateConfig.radius, a + Math.PI - da),
                            endA: a + Math.PI - da,
                            to: toPos
                        }
                        break;
                    case Path.Bezier:
                        cp.startA += side(a)(cp.startA) * da;
                        cp.startCtrlRel = vec.polar(1.5 * stateConfig.radius, cp.startA);
                        cp.endA += side(a + Math.PI)(cp.endA) * da;
                        cp.endCtrlRel = vec.polar(1.5 * stateConfig.radius, cp.endA);
                        break;
                }
                setPathCmd(e.svgElem, e.ctrlPoints);
            });
        }

        edge.from.inEdges.filter(e => e.from === edge.to);

        edges.add(edge);
        edge.from.outEdges.push(edge);
        edge.to.inEdges.push(edge);
        edge.svgElem.addEventListener("click", _ => alert());
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

    handleDrag(evt: MouseEvent): void {
        const mousePos = screenToSvgCoords([evt.x, evt.y]);
        const topLeft = this.init.map((x, i) => Math.min(x, mousePos[i])) as vec.Vec;
        const dim = this.init.map((x, i) => Math.max(x, mousePos[i]) - topLeft[i]) as vec.Vec;
        setAttributes(this.rect, ["x", "y", "width", "height"],
            topLeft.concat(dim).map(x => x.toString()));

        const mark = (edge: Edge) => {
            this.selected.add(edge);
            edge.svgElem.classList.add("selected");
        };

        const unmark = (edge: Edge) => {
            this.selected.delete(edge);
            edge.svgElem.classList.remove("selected");
        };

        const botRight = vec.add(topLeft)(dim);
        edges.forEach(edge => {
            const cp = edge.ctrlPoints;
            switch (cp.type) {
                case Path.Line:
                    ifelse(lineIntersectsRect(cp.p1, cp.p2, topLeft, botRight))
                        (mark)(unmark)(edge);
                    break;
                case Path.Bezier:
                    const start = vec.add(cp.from)(vec.polar(stateConfig.radius, cp.startA));
                    const end = vec.add(cp.to)(vec.polar(stateConfig.radius, cp.endA));
                    const startCtrl = vec.add(start)(cp.startCtrlRel);
                    const endCtrl = vec.add(end)(cp.endCtrlRel);
                    ifelse(bezierIntersectsRect(start, startCtrl, endCtrl, end, topLeft, botRight))
                        (mark)(unmark)(edge);
                    break;
            }
        });
    }

    handleDrop(evt: MouseEvent): void {
        this.initTransConfigForm();
        this.rect.remove();
    }

    initTransConfigForm(): void {
        if (this.selected.size === 0)
            return;

        if (this.selected.size > 1) {
            return;
        }

        const [selected] = [...this.selected.values()];

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
