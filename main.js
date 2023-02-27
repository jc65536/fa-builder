const svgns = "http://www.w3.org/2000/svg";
const canvas = document.getElementById("canvas");
const button = document.getElementById("add-state");

const add_state = () => {
    const circle = createSvgElement("circle");
    circle.setAttribute("cx", "100");
    circle.setAttribute("cy", "100");
    circle.setAttribute("r", stateConfig.radius);
    makeDraggable(circle);
    canvas.appendChild(circle);
};

button.addEventListener("click", add_state);

const startDrag = ctx => evt => ctx.draggedElem = evt.target;

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

makeDraggable(canvas);
