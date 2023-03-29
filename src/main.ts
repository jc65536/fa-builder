import * as vec from "./vector.js";
import * as dragMan from "./drag-manager.js";
import * as transConfig from "./trans-config.js";
import { Vec } from "./vector.js";
import { stateConfig } from "./config.js";
import {
    createSvgElement, screenToSvgCoords, setAttributes
} from "./util.js";
import {
    DragAddStateCtx, DragEdgeCtx, DragSelectionCtx, DragStateCtx
} from "./drag.js";
import { PathControls } from "./path-controls.js";

export const canvas = document.querySelector<SVGSVGElement>("#canvas");
const addStateElem = document.querySelector<HTMLButtonElement>("#add-state");
export const textPathContainer =
    canvas.querySelector<SVGTextElement>("#textpath-container");

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
    startState: State,
    transChar: string,
    endState: State,
    pathElem: SVGPathElement,
    textElem: SVGTextPathElement,
    controls: PathControls
};

export const states = new Set<State>();
const acceptingStates = new Set<State>();
export const edges = new Set<Edge>();

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

export const addState = (pos: Vec) => {
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

const startDragSelection = (evt: MouseEvent) => {
    if (dragMan.hasContext() || evt.button !== 0)
        return;

    const init = screenToSvgCoords([evt.x, evt.y]);
    const rect = createSvgElement("rect");
    rect.classList.add("selection");
    setAttributes(rect, ["x", "y", "width", "height"],
        init.concat([0, 0]).map(x => x.toString()));

    transConfig.hideForm();

    dragMan.setContext(new DragSelectionCtx(init, rect));

    canvas.appendChild(rect);
};

const startDragOnState = (state: State) => (evt: MouseEvent) => {
    if (dragMan.hasContext())
        return;

    switch (evt.button) {
        case 0:
            const trans = canvas.createSVGTransform();
            trans.setTranslate(0, 0);

            dragMan.setContext(new DragStateCtx(state,
                screenToSvgCoords([evt.x, evt.y]), trans));

            state.svgElem.transform.baseVal.appendItem(trans);
            break;

        case 2:
            const path = createSvgElement("path");
            path.classList.add("edge");

            dragMan.setContext(new DragEdgeCtx({
                startState: state,
                transChar: "",
                endState: state,
                pathElem: path,
                textElem: null,
                controls: null
            }));

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
    dragMan.setContext(new DragAddStateCtx(offset, circle));
    addStateElem.appendChild(circle);
}

addStateElem.addEventListener("mousedown", startDragAddState);

canvas.addEventListener("contextmenu", evt => evt.preventDefault());
canvas.addEventListener("mousedown", startDragSelection);

document.addEventListener("mousemove", dragMan.handleDrag);
document.addEventListener("mouseup", dragMan.handleDrop);
