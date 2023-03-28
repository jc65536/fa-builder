import { epsilonChar } from "./config.js";
import { canvas, Edge, edges } from "./main.js";

export const form = document.querySelector<HTMLFormElement>("#trans-config");

export const inputs = {
    transChar: form.querySelector<HTMLInputElement>("#trans-char"),
    epsilonTrans: form.querySelector<HTMLInputElement>("#epsilon-trans"),
    arrowType: form.querySelectorAll<HTMLInputElement>("[name=arrow-type]"),
    deleteTrans: form.querySelector<HTMLButtonElement>("#delete-trans")
}

let selectedEdge: Edge = null;

export const setEdge = (edge: Edge) => {
    selectedEdge = edge;

    const { transChar, epsilonTrans } = inputs;

    transChar.value = selectedEdge.transChar;

    const isEpsilon = selectedEdge.transChar === epsilonChar;
    transChar.disabled = epsilonTrans.checked = isEpsilon;
};

export const unsetEdge = () => selectedEdge = null;

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
    selectedEdge.from.outEdges =
        selectedEdge.from.outEdges.filter(e => e !== selectedEdge);
    selectedEdge.to.inEdges =
        selectedEdge.to.inEdges.filter(e => e !== selectedEdge);
    edges.delete(selectedEdge);
    selectedEdge.svgElem.remove();
};

inputs.transChar.addEventListener("input", inputTransChar);
inputs.epsilonTrans.addEventListener("change", changeEpsilonTrans);
inputs.deleteTrans.addEventListener("click", deleteEdge);
