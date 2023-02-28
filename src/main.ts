import { createSvgElement, screenToSvgCoords } from "./util.js";
import { stateConfig } from "./config.js";

export const canvas = document.querySelector<SVGSVGElement>("svg#canvas");
const button = document.querySelector<HTMLButtonElement>("button#add-state");


const states = new Set();
const acceptingStates = new Set();

type State = {
    name: string,
    accepting: boolean,
    svgElem: SVGElement,
};

const toggleAccept = (state: State) => () => {

};

const addState = () => {
    const state: State = {
        name: "",
        accepting: false,
        svgElem: createSvgElement("g"),
    };
    const circle = createSvgElement("circle");
    circle.setAttribute("r", stateConfig.radius);
    circle.setAttribute("cx", "100");
    circle.setAttribute("cy", "100");
    state.svgElem.appendChild(circle);
    state.svgElem.classList.add("state");
    state.svgElem.addEventListener("dblclick", toggleAccept(state))
    states.add(state);
    canvas.appendChild(state.svgElem);
};

button.addEventListener("click", addState);

type DragCtx = {
    elem: Element,
    init: number[],
    trans: SVGTransform
};

type DragHandler = (ctx: DragCtx) => (evt: MouseEvent) => void;

const makeDraggable = (startDrag: DragHandler, drag: DragHandler,
    endDrag: DragHandler, elem: EventTarget) => {
    const ctx: DragCtx = {
        elem: null,
        init: null,
        trans: null
    };
    elem.addEventListener("mousedown", startDrag(ctx));
    elem.addEventListener("mousemove", drag(ctx));
    elem.addEventListener("mouseup", endDrag(ctx));
    elem.addEventListener("mouseleave", endDrag(ctx));
};

const startDragState: DragHandler = ctx => evt => {
    const elem = evt.target as Element;
    const stateElem = elem.closest(".state") as SVGGraphicsElement;
    if (stateElem === null)
        return;
    ctx.elem = stateElem;
    ctx.init = screenToSvgCoords(evt.x, evt.y);
    ctx.trans = canvas.createSVGTransform();
    ctx.trans.setTranslate(0, 0);
    stateElem.transform.baseVal.appendItem(ctx.trans);
};

const dragState: DragHandler = ctx => evt => {
    const elem = (ctx.elem as SVGGraphicsElement);
    if (elem === null)
        return;
    const [tx, ty] = screenToSvgCoords(evt.x, evt.y).map((c, i) => c - ctx.init[i]);
    ctx.trans.setTranslate(tx, ty);
};

const endDragState: DragHandler = ctx => () => {
    const elem = ctx.elem as SVGGraphicsElement;
    if (elem === null)
        return;
    elem.transform.baseVal.consolidate();
    ctx.elem = null;
};

makeDraggable(startDragState, dragState, endDragState, canvas);
