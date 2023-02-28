import { applyCTM, createSvgElement, dist, NumPair, screenToSvgCoords, closestPoints, setAttributes, ifelse } from "./util.js";
import { stateConfig } from "./config.js";

export const canvas = document.querySelector<SVGSVGElement>("#canvas");
const button = document.querySelector<HTMLButtonElement>("#add-state");

type State = {
    name: string,
    accepting: boolean,
    svgElem: SVGGraphicsElement,
    pos: NumPair
};

type StateInput = [State, string];

const states = new Set<State>();
const acceptingStates = new Set<State>();
const transFun = new Map<StateInput, State>();

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
        pos: [0, 0]
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
    from: State,
    to: State,
    edge: SVGElement
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
            }

            state.svgElem.transform.baseVal.appendItem(trans);
            break;

        case 2:
            const edge = createSvgElement("line");
            edge.classList.add("edge");
            edge.setAttribute("marker-end", "url(#arrow)");

            const cursorPos = screenToSvgCoords(evt.x, evt.y);
            setAttributes(edge, ["x1", "y1", "x2", "y2"],
                state.pos.concat(cursorPos).map(c => c.toString()));

            dragCtx = {
                type: Drag.Edge,
                from: state,
                to: state,
                edge: edge
            }

            canvas.appendChild(edge);
            break;
    }
}

const dragHandler = (evt: MouseEvent) => {
    switch (dragCtx.type) {
        case Drag.State:
            const init = dragCtx.init;
            const [tx, ty] = screenToSvgCoords(evt.x, evt.y).map((c, i) => c - init[i]);
            dragCtx.trans.setTranslate(tx, ty);
            break;

        case Drag.Edge:
            const cursorPos = screenToSvgCoords(evt.x, evt.y);
            const to = [...states].find(state =>
                dist(cursorPos, state.pos) < stateConfig.radius);
            
            const cursorPosOr = ifelse(to === undefined)(cursorPos);
            const [pos1, pos2] = closestPoints(dragCtx.from.pos, cursorPosOr(to?.pos))
            setAttributes(dragCtx.edge, ["x1", "y1", "x2", "y2"],
                pos1.concat(cursorPosOr(pos2)).map(x => x.toString()));
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
            break;
    }
    dragCtx = { type: Drag.None };
};

document.addEventListener("mousemove", dragHandler);
document.addEventListener("mouseup", dropHandler);

canvas.addEventListener("contextmenu", evt => evt.preventDefault());
