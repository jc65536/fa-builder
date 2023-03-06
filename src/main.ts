import {
    applyCTM, createSvgElement, dist, Vec, screenToSvgCoords,
    closestPoints, ifelse, newStr, addVec, polarVec, setPathCmd, CtrlPoints,
    Path, subVec, side, atanVec, setAttributes
} from "./util.js";
import { stateConfig } from "./config.js";

export const canvas = document.querySelector<SVGSVGElement>("#canvas");
const button = document.querySelector<HTMLButtonElement>("#add-state");

type State = {
    name: string,
    accepting: boolean,
    svgElem: SVGGraphicsElement,
    pos: Vec,
    inEdges: Edge[],
    outEdges: Edge[]
};

type StateInput = [State, string];

type Edge = {
    from: State,
    to: State,
    svgElem: SVGPathElement,
    ctrlPoints: CtrlPoints
};

const states = new Set<State>();
const acceptingStates = new Set<State>();
const transFun = new Map<StateInput, Edge>();

const toggleAccept = (state: State) => () => {
    state.accepting = !state.accepting;
    if (state.accepting) {
        const innerCircle = createSvgElement("circle");
        innerCircle.setAttribute("r", stateConfig.innerRadius.toString());
        innerCircle.classList.add("inner-circle");
        state.svgElem.appendChild(innerCircle);
        acceptingStates.add(state);
    } else {
        state.svgElem.querySelector(".inner-circle").remove();
        acceptingStates.delete(state);
    }
};

const addState = () => {
    const circle = createSvgElement("circle");
    circle.setAttribute("r", stateConfig.radius.toString());

    const group = createSvgElement("g");
    group.classList.add("state");
    group.appendChild(circle);

    const state: State = {
        name: "",
        accepting: false,
        svgElem: group,
        pos: [0, 0],
        inEdges: [],
        outEdges: []
    };
    group.addEventListener("mousedown", startDrag(state));
    group.addEventListener("dblclick", toggleAccept(state));
    states.add(state);
    canvas.appendChild(group);
};

button.addEventListener("click", addState);

enum Drag { State, Edge, Selection, None }

type DragStateCtx = {
    type: Drag.State,
    state: State,
    init: Vec,
    trans: SVGTransform,
    inCanvas: boolean
};

type DragEdgeCtx = {
    type: Drag.Edge,
    edge: Edge
};

type DragSelectionCtx = {
    type: Drag.Selection,
    init: Vec,
    rect: SVGRectElement
}

let dragCtx: DragStateCtx | DragEdgeCtx | DragSelectionCtx | { type: Drag.None } = {
    type: Drag.None
};

const startDragSelection = (evt: MouseEvent) => {
    if (dragCtx.type !== Drag.None || evt.button !== 0)
        return;

    const init = screenToSvgCoords(evt.x, evt.y);
    const rect = createSvgElement("rect");
    rect.classList.add("selection");
    setAttributes(rect, ["x", "y", "width", "height"],
        init.concat([0, 0]).map(x => x.toString()));

    dragCtx = {
        type: Drag.Selection,
        init: init,
        rect: rect
    };

    canvas.appendChild(rect);
};

const startDrag = (state: State) => (evt: MouseEvent) => {
    if (dragCtx.type !== Drag.None)
        return;

    switch (evt.button) {
        case 0:
            const trans = canvas.createSVGTransform();
            trans.setTranslate(0, 0);

            dragCtx = {
                type: Drag.State,
                state: state,
                init: screenToSvgCoords(evt.x, evt.y),
                trans: trans,
                inCanvas: false
            };

            state.svgElem.transform.baseVal.appendItem(trans);
            break;

        case 2:
            const path = createSvgElement("path");
            path.classList.add("edge");
            path.setAttribute("marker-end", "url(#arrow)");

            dragCtx = {
                type: Drag.Edge,
                edge: {
                    from: state,
                    to: state,
                    svgElem: path,
                    ctrlPoints: null
                }
            };

            canvas.appendChild(path);
            break;
    }
}

const dragHandler = (evt: MouseEvent) => {
    if (dragCtx.type === Drag.None)
        return;

    const mousePos = screenToSvgCoords(evt.x, evt.y);

    switch (dragCtx.type) {
        case Drag.State:
            const init = dragCtx.init;
            const [tx, ty] = subVec(mousePos)(init);
            dragCtx.trans.setTranslate(tx, ty);

            const addTrans = addVec([tx, ty]);
            const state = dragCtx.state;
            const newPos: Vec = addTrans(state.pos);

            state.outEdges.forEach(edge => {
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

            state.inEdges.forEach(edge => {
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
            break;

        case Drag.Edge:
            const to = [...states].find(state =>
                dist(mousePos, state.pos) < stateConfig.radius);

            const edge = dragCtx.edge;
            edge.to = to;

            const cursorPosOr = ifelse(to === undefined)(mousePos);
            const [p1, p2] = closestPoints(edge.from.pos, cursorPosOr(to?.pos))
            edge.ctrlPoints = {
                type: Path.Line,
                p1: p1,
                p2: cursorPosOr(p2)
            }
            setPathCmd(edge.svgElem, edge.ctrlPoints);
            break;
        
        case Drag.Selection:
            const topLeft = dragCtx.init.map((x, i) => Math.min(x, mousePos[i]));
            const dim = dragCtx.init.map((x, i) => Math.max(x, mousePos[i]) - topLeft[i]);
            setAttributes(dragCtx.rect, ["x", "y", "width", "height"],
                topLeft.concat(dim).map(x => x.toString()));
    }
};

const dropHandler = (evt: MouseEvent) => {
    switch (dragCtx.type) {
        case Drag.State:
            if (evt.button !== 0)
                return;

            const state = dragCtx.state;
            state.svgElem.transform.baseVal.consolidate();
            state.pos = applyCTM([0, 0], state.svgElem.getCTM());
            break;

        case Drag.Edge:
            if (evt.button !== 2)
                return;

            const edge = dragCtx.edge;
            const path = edge.svgElem;

            if (edge.to === undefined) {
                path.remove();
                break;
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
                canvas.appendChild(path);

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

            transFun.set([edge.from, newStr()], edge);
            edge.from.outEdges.push(edge);
            edge.to.inEdges.push(edge);
            edge.svgElem.addEventListener("click", _ => alert());

            break;
        
        case Drag.Selection:
            dragCtx.rect.remove();
    }
    dragCtx = { type: Drag.None };
};

document.addEventListener("mousemove", dragHandler);
document.addEventListener("mouseup", dropHandler);

canvas.addEventListener("contextmenu", evt => evt.preventDefault());

canvas.addEventListener("mousedown", startDragSelection);
