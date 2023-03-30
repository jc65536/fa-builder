import * as vec from "./vector.js";
import * as dragMan from "./drag-manager.js";
import { Vec } from "./vector.js";
import { edgeConfig, stateConfig } from "./config.js";
import {
    createSvgElement, screenToSvgCoords, setAttributes, uniqueStr
} from "./util.js";
import {
    DragAddStateCtx, DragEdgeCtx, DragSelectionCtx, DragStateCtx
} from "./drag.js";
import {
    BezierControls, PathControls,
    ShortestLineControls, StartingEdgeControls
} from "./path-controls.js";
import { cancelSelection } from "./selection.js";

// Important DOM elements

export const canvas = document.querySelector<SVGSVGElement>("#canvas");
const addStateElem = document.querySelector<HTMLButtonElement>("#add-state");
export const configMenuContainer =
    document.querySelector<HTMLDivElement>("#config-menu-container");

// State machine data types and global structures for storing the state machine

export type State = {
    name: string,
    accepting: boolean,
    groupElem: SVGGElement,
    textElem: SVGTextElement,
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
    textElem: SVGTextElement,
    textPathElem: SVGTextPathElement,
    controls: PathControls
};

export const states = new Set<State>();
export const acceptingStates = new Set<State>();
export const edges = new Set<Edge>();

export const [setStartingState, getStartingState, getStartingEdge] = (() => {
    let startingState: State = null;

    const path = createSvgElement("path");
    path.classList.add("edge");
    path.id = "starting-edge";

    const startingEdge: Edge = {
        startState: null,
        transChar: null,
        endState: null,
        pathElem: path,
        textElem: null,
        textPathElem: null,
        controls: null
    };

    const setStartingState = (state: State) => {
        // Unlink previous starting state
        if (startingState !== null) {
            startingState.inEdges =
                startingState.inEdges.filter(e => e !== startingEdge);
        }

        if (state === null) {
            edges.delete(startingEdge);
            startingEdge.pathElem.remove();
        } else {
            state.inEdges.push(startingEdge);
            startingEdge.endState = state;
            startingEdge.controls = new StartingEdgeControls(startingEdge);
            edges.add(startingEdge);
            canvas.appendChild(path);
        }

        startingState = state;
    };

    return [setStartingState, () => startingState, () => startingEdge];
})();

// Basic interactions with states/edges

export const toggleAccept = (state: State) => {
    state.accepting = !state.accepting;
    if (state.accepting) {
        const innerCircle = createSvgElement("circle");
        innerCircle.setAttribute("r", stateConfig.innerRadius.toString());
        innerCircle.classList.add("inner-circle");
        state.groupElem.appendChild(innerCircle);
        acceptingStates.add(state);
    } else {
        state.groupElem.querySelector(".inner-circle").remove();
        acceptingStates.delete(state);
    }
};

export const addState = (pos: Vec) => {
    const rad = stateConfig.radius.toString();
    const circle = createSvgElement("circle");
    circle.setAttribute("r", rad);

    const group = createSvgElement("g");
    group.classList.add("state");
    group.appendChild(circle);

    const trans = canvas.createSVGTransform();
    trans.setTranslate(pos[0], pos[1]);
    group.transform.baseVal.appendItem(trans);

    const name = `q${uniqueStr("state")}`;

    const text = createSvgElement("text");
    text.textContent = name;
    text.classList.add("state-name");
    group.appendChild(text);

    const state: State = {
        name: name,
        accepting: false,
        groupElem: group,
        textElem: text,
        pos: pos,
        inEdges: [],
        outEdges: []
    };

    group.addEventListener("mousedown", startDragOnState(state));
    group.addEventListener("dblclick", () => toggleAccept(state));
    states.add(state);
    canvas.appendChild(group);
};

export const deleteState = (state: State) => {
    state.outEdges.forEach(deleteEdge);
    state.inEdges.forEach(deleteEdge);

    if (state.accepting)
        acceptingStates.delete(state);

    if (state === getStartingState())
        setStartingState(null);

    state.groupElem.remove();
    states.delete(state);
};

export const addEdge = (edge: Edge) => {
    const controlsType = edge.startState === edge.endState ?
        BezierControls : ShortestLineControls;
    edge.controls = new controlsType(edge);

    edges.add(edge);
    edge.startState.outEdges.push(edge);
    edge.endState.inEdges.push(edge);

    const id = `edge-${uniqueStr("edge")}`;

    edge.pathElem.id = id;
    canvas.appendChild(edge.pathElem);

    const transCharContainer = createSvgElement("text");
    transCharContainer.setAttribute("dy", edgeConfig.textVertOffset.toString());
    transCharContainer.classList.add("trans-char-container");
    edge.textElem = transCharContainer;

    const textPath = createSvgElement("textPath");
    textPath.setAttribute("startOffset", "50%");
    textPath.setAttribute("href", `#${id}`);
    edge.textPathElem = textPath;
    transCharContainer.appendChild(textPath);

    canvas.appendChild(transCharContainer);
}

export const deleteEdge = (edge: Edge) => {
    if (edge === getStartingEdge()) {
        setStartingState(null);
    } else {
        edge.startState.outEdges =
            edge.startState.outEdges.filter(e => e !== edge);

        edge.endState.inEdges =
            edge.endState.inEdges.filter(e => e !== edge);

        edge.pathElem.remove();
        edge.textElem.remove();
        edges.delete(edge);
    }
};

// Drag initialization functions

const startDragOnState = (state: State) => (evt: MouseEvent) => {
    if (dragMan.hasContext())
        return;

    switch (evt.button) {
        case 0:
            const trans = canvas.createSVGTransform();
            trans.setTranslate(0, 0);

            dragMan.setContext(new DragStateCtx(state,
                screenToSvgCoords([evt.x, evt.y]), trans));

            state.groupElem.transform.baseVal.appendItem(trans);
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
                textPathElem: null,
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

const startDragSelection = (evt: MouseEvent) => {
    if (dragMan.hasContext() || evt.button !== 0)
        return;

    const init = screenToSvgCoords([evt.x, evt.y]);
    const rect = createSvgElement("rect");
    rect.classList.add("selection");
    setAttributes(rect, ["x", "y", "width", "height"],
        init.concat([0, 0]).map(x => x.toString()));

    cancelSelection();

    dragMan.setContext(new DragSelectionCtx(init, rect));

    canvas.appendChild(rect);
};

addStateElem.addEventListener("mousedown", startDragAddState);

canvas.addEventListener("contextmenu", evt => evt.preventDefault());
canvas.addEventListener("mousedown", startDragSelection);

document.addEventListener("mousemove", dragMan.handleDrag);
document.addEventListener("mouseup", dragMan.handleDrop);
