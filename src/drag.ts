import { stateConfig } from "./config.js";
import { Edge, State, StateInput } from "./main.js";
import { Vec, subVec, addVec, Path, closestPoints, setPathCmd, applyCTM, dist, ifelse, polarVec, atanVec, side, newStr, setAttributes } from "./util.js";

export abstract class DragCtx {
    abstract handleDrag(mousePos: Vec): void;
    abstract handleDrop(mousePos: Vec): void;
}

export class DragStateCtx extends DragCtx {
    state: State;
    init: Vec;
    trans: SVGTransform;

    constructor(state: State, init: Vec, trans: SVGTransform) {
        super();
        this.state = state;
        this.init = init;
        this.trans = trans;
    }

    handleDrag(mousePos: Vec): void {
        const [tx, ty] = subVec(mousePos)(this.init);
        this.trans.setTranslate(tx, ty);

        const addTrans = addVec([tx, ty]);
        const newPos: Vec = addTrans(this.state.pos);

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

    handleDrop(mousePos: Vec): void {
        this.state.svgElem.transform.baseVal.consolidate();
        this.state.pos = applyCTM([0, 0], this.state.svgElem.getCTM());
    }
}

export class DragEdgeCtx extends DragCtx {
    canvas: SVGSVGElement;
    states: Set<State>;
    edge: Edge;
    transFun: Map<StateInput, Edge>;

    constructor(canvas: SVGSVGElement, states: Set<State>, transFun: Map<StateInput, Edge>, edge: Edge) {
        super();
        this.canvas = canvas;
        this.states = states;
        this.transFun = transFun;
        this.edge = edge;
    }

    handleDrag(mousePos: Vec): void {
        const to = [...this.states].find(state =>
            dist(mousePos, state.pos) < stateConfig.radius);

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

    handleDrop(mousePos: Vec): void {
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
                startCtrlRel: polarVec(1.5 * stateConfig.radius, Math.PI / 2),
                endCtrlRel: polarVec(1.5 * stateConfig.radius, Math.PI / 2),
                endA: Math.PI * 2 / 3,
                to: edge.from.pos
            };
            setPathCmd(path, edge.ctrlPoints);
            path.setAttribute("marker-end", "url(#arrow)");
            path.classList.add("edge");
            this.canvas.appendChild(path);

            edge.from.outEdges.filter(e => e.to === edge.to).forEach(e => {
                const cp = e.ctrlPoints;
                if (cp.type === Path.Bezier) {
                    cp.startA += Math.PI / 3;
                    cp.startCtrlRel = polarVec(1.5 * stateConfig.radius, cp.startA + Math.PI / 6);
                    cp.endA += Math.PI / 3;
                    cp.endCtrlRel = polarVec(1.5 * stateConfig.radius, cp.endA - Math.PI / 6);
                    setPathCmd(e.svgElem, cp);
                }
            });
        } else {
            edge.from.outEdges.filter(e => e.to === edge.to).forEach(e => {
                const cp = e.ctrlPoints;
                const fromPos = e.from.pos;
                const toPos = e.to.pos;
                const a = atanVec(fromPos)(toPos);
                const da = Math.PI / 6;
                switch (cp.type) {
                    case Path.Line:
                        e.ctrlPoints = {
                            type: Path.Bezier,
                            from: fromPos,
                            startA: a + da,
                            startCtrlRel: polarVec(1.5 * stateConfig.radius, a + da),
                            endCtrlRel: polarVec(1.5 * stateConfig.radius, a + Math.PI - da),
                            endA: a + Math.PI - da,
                            to: toPos
                        }
                        break;
                    case Path.Bezier:
                        cp.startA += side(a)(cp.startA) * da;
                        cp.startCtrlRel = polarVec(1.5 * stateConfig.radius, cp.startA);
                        cp.endA += side(a + Math.PI)(cp.endA) * da;
                        cp.endCtrlRel = polarVec(1.5 * stateConfig.radius, cp.endA);
                        break;
                }
                setPathCmd(e.svgElem, e.ctrlPoints);
            });
        }

        edge.from.inEdges.filter(e => e.from === edge.to);

        this.transFun.set([edge.from, newStr()], edge);
        edge.from.outEdges.push(edge);
        edge.to.inEdges.push(edge);
        edge.svgElem.addEventListener("click", _ => alert());
    }
}

export class DragSelectionCtx extends DragCtx {
    init: Vec;
    rect: SVGRectElement;

    constructor(init: Vec, rect: SVGRectElement) {
        super();
        this.init = init;
        this.rect = rect;
    }

    handleDrag(mousePos: Vec): void {
        const topLeft = this.init.map((x, i) => Math.min(x, mousePos[i]));
        const dim = this.init.map((x, i) => Math.max(x, mousePos[i]) - topLeft[i]);
        setAttributes(this.rect, ["x", "y", "width", "height"],
            topLeft.concat(dim).map(x => x.toString()));
    }

    handleDrop(mousePos: Vec): void {
        this.rect.remove();
    }
}
