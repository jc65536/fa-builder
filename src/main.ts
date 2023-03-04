import { applyCTM, createSvgElement, dist, NumPair, screenToSvgCoords, closestPoints, setAttributes, ifelse, newStr, addVec, polarVec, setPathCmd, CtrlPoints, Path } from "./util.js";
import { stateConfig } from "./config.js";

export const canvas = document.querySelector<SVGSVGElement>("#canvas");
const button = document.querySelector<HTMLButtonElement>("#add-state");

type State = {
    name: string,
    accepting: boolean,
    svgElem: SVGGraphicsElement,
    pos: NumPair,
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

enum Drag { State, Edge, None }

type DragStateCtx = {
    type: Drag.State,
    state: State,
    init: NumPair,
    trans: SVGTransform,
    inCanvas: boolean
};

type DragEdgeCtx = {
    type: Drag.Edge,
    edge: Edge
};

let dragCtx: DragStateCtx | DragEdgeCtx | { type: Drag.None } = {
    type: Drag.None
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
    switch (dragCtx.type) {
        case Drag.State:
            const init = dragCtx.init;
            const [tx, ty] = screenToSvgCoords(evt.x, evt.y).map((c, i) => c - init[i]);
            dragCtx.trans.setTranslate(tx, ty);

            const state = dragCtx.state;
            const newPos: NumPair = addVec(state.pos)([tx, ty]);
            const addTrans = addVec([tx, ty]);

            state.outEdges.forEach(edge => {
                const cp = edge.ctrlPoints;
                switch (cp.type) {
                    case Path.Line:
                        [cp.p1, cp.p2] = closestPoints(newPos, edge.to.pos);
                        break;
                    case Path.Bezier:
                        cp.start = addTrans(cp.start);
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
                        cp.end = addTrans(cp.end);
                        break;
                }
                setPathCmd(edge.svgElem, cp);
            });
            break;

        case Drag.Edge:
            const cursorPos = screenToSvgCoords(evt.x, evt.y);
            const to = [...states].find(state =>
                dist(cursorPos, state.pos) < stateConfig.radius);

            const edge = dragCtx.edge;
            edge.to = to;

            const cursorPosOr = ifelse(to === undefined)(cursorPos);
            const [p1, p2] = closestPoints(edge.from.pos, cursorPosOr(to?.pos))
            edge.ctrlPoints = {
                type: Path.Line,
                p1: p1,
                p2: cursorPosOr(p2)
            }
            setPathCmd(edge.svgElem, edge.ctrlPoints);
            break;
    }
};

const dropHandler = (evt: MouseEvent) => {
    switch (dragCtx.type) {
        case Drag.State:
            if (evt.button !== 0)
                return;

            const state = dragCtx.state;
            state.svgElem.transform.baseVal.consolidate();
            state.pos = applyCTM(0, 0, state.svgElem.getCTM());
            break;

        case Drag.Edge:
            if (evt.button !== 2)
                return;

            const edge = dragCtx.edge;
            const path = edge.svgElem;

            if (edge.to === undefined) {
                path.remove();
            } else {
                if (edge.from === edge.to) {
                    const addToFrom = addVec(edge.from.pos);
                    edge.ctrlPoints = {
                        type: Path.Bezier,
                        start: addToFrom(polarVec(stateConfig.radius, Math.PI / 3)),
                        startCtrlRel: polarVec(1.5 * stateConfig.radius, Math.PI / 2),
                        endCtrlRel: polarVec(1.5 * stateConfig.radius, Math.PI / 2),
                        end: addToFrom(polarVec(stateConfig.radius, Math.PI * 2 / 3))
                    };
                    setPathCmd(path, edge.ctrlPoints);
                    path.setAttribute("marker-end", "url(#arrow)");
                    path.classList.add("edge");
                    canvas.appendChild(path);
                }

                transFun.set([edge.from, newStr()], edge);
                edge.from.outEdges.push(edge);
                edge.to.inEdges.push(edge);
            }

            break;
    }
    dragCtx = { type: Drag.None };
};

document.addEventListener("mousemove", dragHandler);
document.addEventListener("mouseup", dropHandler);

canvas.addEventListener("contextmenu", evt => evt.preventDefault());
