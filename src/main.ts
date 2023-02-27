import { createSvgElement, screenToSvgCoords } from "./util.js";
import { stateConfig } from "./config.js";

export const svg = document.querySelector("svg");
export const button = document.getElementById("add-state");


const states = new Set();
const acceptingStates = new Set();

const toggleAccept = state => () => {
    throw "error";
};

const addState = () => {
    const state = {
        svgElem: createSvgElement("circle"),
    };
    state.svgElem.setAttribute("cx", "100");
    state.svgElem.setAttribute("cy", "100");
    state.svgElem.setAttribute("r", stateConfig.radius);
    state.svgElem.classList.add("state");
    state.svgElem.addEventListener("dblclick", toggleAccept(state))
    states.add(state);
    svg.appendChild(state.svgElem);
};

button.addEventListener("click", addState);

const startDrag = ctx => evt => {
    if (evt.target.classList.contains("state"))
        ctx.draggedElem = evt.target;
};

const drag = ctx => evt => {
    const elem = ctx.draggedElem;
    if (elem !== null) {
        const [x, y] = screenToSvgCoords(evt.x, evt.y);
        elem.setAttribute("cx", x.toString());
        elem.setAttribute("cy", y.toString());
    }
};

const endDrag = ctx => () => ctx.draggedElem = null;

const makeDraggable = elem => {
    const ctx = { draggedElem: null };
    elem.addEventListener("mousedown", startDrag(ctx));
    elem.addEventListener("mousemove", drag(ctx));
    elem.addEventListener("mouseup", endDrag(ctx));
    elem.addEventListener("mouseleave", endDrag(ctx));
}

makeDraggable(svg);
