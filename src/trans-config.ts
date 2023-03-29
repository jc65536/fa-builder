import { epsilonChar } from "./config.js";
import { canvas, Edge, edges } from "./main.js";
import {
    BezierControls, LineControls,
    ShortestLineControls
} from "./path-controls.js";

export const form = document.querySelector<HTMLFormElement>("#trans-config");

export const inputs = {
    transChar: form.querySelector<HTMLInputElement>("#trans-char"),
    epsilonTrans: form.querySelector<HTMLInputElement>("#epsilon-trans"),
    arrowType: {
        lineChoice: form.querySelector<HTMLInputElement>("#line-choice"),
        bezierChoice: form.querySelector<HTMLInputElement>("#bezier-choice"),
    },
    shortestLine: form.querySelector<HTMLInputElement>("#shortest-line"),
    delete: form.querySelector<HTMLButtonElement>("#delete")
}

let allSelected: Set<Edge> = null;
let selectedEdge: Edge = null;

export const showForm = (selected: Set<Edge>) => {
    if (selected.size === 0) {
        selectedEdge = allSelected = null;
        return;
    }

    form.classList.remove("hidden");

    if (selected.size === 1) {
        [selectedEdge] = allSelected = selected;
        initForm();
    } else {
        allSelected = selected;
        selectedEdge = null;
        form.classList.add("mult-selected");
    }

    allSelected.forEach(edge => edge.controls.show());
};

export const hideForm = () => {
    if (allSelected === null)
        return;

    canvas.querySelectorAll(".edge.selected")
        .forEach(e => e.classList.remove("selected"));
    form.classList.remove("mult-selected");
    form.classList.add("hidden");

    allSelected.forEach(edge => edge.controls.hide());
    selectedEdge = allSelected = null;
};

export const initForm = () => {
    const { transChar, epsilonTrans, shortestLine, arrowType } = inputs;

    transChar.value = selectedEdge.transChar;

    const isEpsilon = selectedEdge.transChar === epsilonChar;
    transChar.disabled = epsilonTrans.checked = isEpsilon;

    const controls = selectedEdge.controls;

    if (selectedEdge.startState === selectedEdge.endState) {
        arrowType.bezierChoice.checked = true;
        arrowType.lineChoice.disabled = true;
    } else {
        arrowType.lineChoice.disabled = false;

        if (controls instanceof LineControls || controls instanceof ShortestLineControls) {
            arrowType.lineChoice.checked = true;
            shortestLine.checked = selectedEdge.controls instanceof ShortestLineControls;
        } else if (controls instanceof BezierControls) {
            arrowType.bezierChoice.checked = true;
        }
    }
};

export const inputTransChar = (evt: Event) => {
    if (selectedEdge === null)
        return;

    const { transChar, epsilonTrans } = inputs;

    if (transChar.value === "epsilon")
        transChar.value = epsilonChar;

    selectedEdge.transChar = transChar.value;

    if (transChar.value === epsilonChar) {
        transChar.disabled = true;
        epsilonTrans.checked = true;
    }
}

export const changeEpsilonTrans = (evt: Event) => {
    if (selectedEdge === null)
        return;

    const { transChar, epsilonTrans } = inputs;

    if (epsilonTrans.checked) {
        selectedEdge.transChar = transChar.value = epsilonChar;
        transChar.disabled = true;
    } else {
        selectedEdge.transChar = transChar.value = "";
        transChar.disabled = false;
    }
}

const deleteEdge = (evt: Event) => {
    if (allSelected === null)
        return;

    allSelected.forEach(edge => {
        edge.startState.outEdges =
            edge.startState.outEdges.filter(e => e !== edge);
        edge.endState.inEdges =
            edge.endState.inEdges.filter(e => e !== edge);

        edge.svgElem.remove();
        edges.delete(edge);
    });
    hideForm();
};

const changeShortestLine = (evt: Event) => {
    if (selectedEdge === null)
        return;

    if (inputs.shortestLine.checked) {
        selectedEdge.controls.hide();
        selectedEdge.controls = new ShortestLineControls(selectedEdge);
        selectedEdge.controls.show();
    } else {
        selectedEdge.controls.hide();
        selectedEdge.controls = new LineControls(selectedEdge);
        selectedEdge.controls.show();
    }
};

const selectLineChoice = (evt: Event) => {
    if (selectedEdge === null)
        return;

    selectedEdge.controls.hide();
    inputs.shortestLine.checked = true;
    selectedEdge.controls = new ShortestLineControls(selectedEdge);
    selectedEdge.controls.show();
};

const selectBezierChoice = (evt: Event) => {
    if (selectedEdge === null)
        return;

    selectedEdge.controls.hide();
    selectedEdge.controls = new BezierControls(selectedEdge);
    selectedEdge.controls.show();
};

inputs.transChar.addEventListener("input", inputTransChar);
inputs.epsilonTrans.addEventListener("change", changeEpsilonTrans);
inputs.shortestLine.addEventListener("change", changeShortestLine);
inputs.delete.addEventListener("click", deleteEdge);

inputs.arrowType.bezierChoice.addEventListener("change", selectBezierChoice);
inputs.arrowType.lineChoice.addEventListener("change", selectLineChoice);
