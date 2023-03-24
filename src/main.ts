import {
    applyCTM, createSvgElement, dist, Vec, screenToSvgCoords,
    closestPoints, ifelse, newStr, addVec, polarVec, setPathCmd, CtrlPoints,
    Path, subVec, side, atanVec, setAttributes
} from "./util.js";
import { stateConfig } from "./config.js";
import { DragCtx, DragEdgeCtx, DragSelectionCtx, DragStateCtx } from "./drag.js";

export const canvas = document.querySelector<SVGSVGElement>("#canvas");
const button = document.querySelector<HTMLButtonElement>("#add-state");

export type State = {
    name: string,
    accepting: boolean,
    svgElem: SVGGraphicsElement,
    pos: Vec,
    inEdges: Edge[],
    outEdges: Edge[]
};

export type StateInput = [State, string];

export type Edge = {
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
    group.addEventListener("mousedown", startDragOnState(state));
    group.addEventListener("dblclick", toggleAccept(state));
    states.add(state);
    canvas.appendChild(group);
};

button.addEventListener("click", addState);

let dragCtx: DragCtx = null;

const startDragSelection = (evt: MouseEvent) => {
    if (dragCtx !== null || evt.button !== 0)
        return;

    const init = screenToSvgCoords(evt.x, evt.y);
    const rect = createSvgElement("rect");
    rect.classList.add("selection");
    setAttributes(rect, ["x", "y", "width", "height"],
        init.concat([0, 0]).map(x => x.toString()));

    dragCtx = new DragSelectionCtx(init, rect);

    canvas.appendChild(rect);
};

const startDragOnState = (state: State) => (evt: MouseEvent) => {
    if (dragCtx !== null)
        return;

    switch (evt.button) {
        case 0:
            const trans = canvas.createSVGTransform();
            trans.setTranslate(0, 0);

            dragCtx = new DragStateCtx(state, screenToSvgCoords(evt.x, evt.y),
                trans);

            state.svgElem.transform.baseVal.appendItem(trans);
            break;

        case 2:
            const path = createSvgElement("path");
            path.classList.add("edge");

            dragCtx = new DragEdgeCtx(canvas, states, transFun, {
                from: state,
                to: state,
                svgElem: path,
                ctrlPoints: null
            })

            canvas.appendChild(path);
            break;
    }
}

document.addEventListener("mousemove", (evt: MouseEvent) =>
    dragCtx?.handleDrag(screenToSvgCoords(evt.x, evt.y)));

document.addEventListener("mouseup", (evt: MouseEvent) => {
    dragCtx?.handleDrop(screenToSvgCoords(evt.x, evt.y));
    dragCtx = null;
});

canvas.addEventListener("contextmenu", evt => evt.preventDefault());

canvas.addEventListener("mousedown", startDragSelection);
