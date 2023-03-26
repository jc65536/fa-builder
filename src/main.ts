import {
    createSvgElement, screenToSvgCoords, CtrlPoints, setAttributes, solveCubic
} from "./util.js";
import * as vec from "./vector.js";
import { stateConfig } from "./config.js";
import { DragAddStateCtx, DragCtx, DragEdgeCtx, DragSelectionCtx, DragStateCtx } from "./drag.js";

export const canvas = document.querySelector<SVGSVGElement>("#canvas");
const addStateElem = document.querySelector<HTMLButtonElement>("#add-state");

export type State = {
    name: string,
    accepting: boolean,
    svgElem: SVGGraphicsElement,
    pos: vec.Vec,
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

export const states = new Set<State>();
const acceptingStates = new Set<State>();
export const transFun = new Map<StateInput, Edge>();

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

export const addState = (pos: vec.Vec) => {
    const circle = createSvgElement("circle");
    circle.setAttribute("r", stateConfig.radius.toString());

    const group = createSvgElement("g");
    group.classList.add("state");
    group.appendChild(circle);

    const trans = canvas.createSVGTransform();
    trans.setTranslate(pos[0], pos[1]);
    group.transform.baseVal.appendItem(trans);

    const state: State = {
        name: "",
        accepting: false,
        svgElem: group,
        pos: pos,
        inEdges: [],
        outEdges: []
    };

    group.addEventListener("mousedown", startDragOnState(state));
    group.addEventListener("dblclick", toggleAccept(state));
    states.add(state);
    canvas.appendChild(group);
};

let dragCtx: DragCtx = null;

const startDragSelection = (evt: MouseEvent) => {
    if (dragCtx !== null || evt.button !== 0)
        return;

    const init = screenToSvgCoords([evt.x, evt.y]);
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

            dragCtx = new DragStateCtx(state, screenToSvgCoords([evt.x, evt.y]),
                trans);

            state.svgElem.transform.baseVal.appendItem(trans);
            break;

        case 2:
            const path = createSvgElement("path");
            path.classList.add("edge");

            dragCtx = new DragEdgeCtx({
                from: state,
                to: state,
                svgElem: path,
                ctrlPoints: null
            });

            canvas.appendChild(path);
            break;
    }
}

const startDragAddState = (evt: MouseEvent) => {
    const circle = document.createElement("div");
    circle.classList.add("statelike", "draggable");
    const rect = addStateElem.getBoundingClientRect();
    circle.style.left = `${rect.x}px`;
    circle.style.top = `${rect.y}px`;
    const offset = vec.sub([evt.x, evt.y])([rect.x, rect.y]);
    dragCtx = new DragAddStateCtx(offset, circle);
    addStateElem.appendChild(circle);
}

addStateElem.addEventListener("mousedown", startDragAddState);

document.addEventListener("mousemove", (evt: MouseEvent) =>
    dragCtx?.handleDrag(evt));

document.addEventListener("mouseup", (evt: MouseEvent) => {
    dragCtx?.handleDrop(evt);
    dragCtx = null;
});

canvas.addEventListener("contextmenu", evt => evt.preventDefault());

canvas.addEventListener("mousedown", startDragSelection);
