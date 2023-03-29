import { epsilonChar } from "./config.js";
import { canvas, Edge, edges } from "./main.js";
import { BezierControls, LineControls, ShortestLine } from "./path-controls.js";

export const form = document.querySelector<HTMLFormElement>("#trans-config");

export const inputs = {
    transChar: form.querySelector<HTMLInputElement>("#trans-char"),
    epsilonTrans: form.querySelector<HTMLInputElement>("#epsilon-trans"),
    arrowType: {
        lineChoice: form.querySelector<HTMLInputElement>("#line-choice"),
        bezierChoice: form.querySelector<HTMLInputElement>("#bezier-choice"),
    },
    shortestLine: form.querySelector<HTMLInputElement>("#shortest-line"),
    deleteTrans: form.querySelector<HTMLButtonElement>("#delete-trans")
}

let selectedEdge: Edge = null;

export const setEdge = (edge: Edge) => {
    selectedEdge = edge;

    const { transChar, epsilonTrans, shortestLine, arrowType } = inputs;

    transChar.value = selectedEdge.transChar;

    const isEpsilon = selectedEdge.transChar === epsilonChar;
    transChar.disabled = epsilonTrans.checked = isEpsilon;

    const controls = selectedEdge.controls;

    if (selectedEdge.from === selectedEdge.to) {
        arrowType.bezierChoice.checked = true;
        arrowType.lineChoice.disabled = true;
    } else {
        arrowType.lineChoice.disabled = false;

        if (controls instanceof LineControls || controls instanceof ShortestLine) {
            arrowType.lineChoice.checked = true;
            shortestLine.checked = edge.controls instanceof ShortestLine;
        } else if (controls instanceof BezierControls) {
            arrowType.bezierChoice.checked = true;
        }
    }

    controls.show();
};

export const unsetEdge = () => {
    if (selectedEdge === null)
        return;

    selectedEdge.controls.hide();
    selectedEdge = null;
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
    selectedEdge.from.outEdges =
        selectedEdge.from.outEdges.filter(e => e !== selectedEdge);
    selectedEdge.to.inEdges =
        selectedEdge.to.inEdges.filter(e => e !== selectedEdge);
    edges.delete(selectedEdge);
    selectedEdge.svgElem.remove();
};

const changeShortestLine = (evt: Event) => {
    if (inputs.shortestLine.checked) {
        selectedEdge.controls.hide();
        selectedEdge.controls = new ShortestLine(selectedEdge.from,
            selectedEdge.to, selectedEdge.svgElem);
        selectedEdge.controls.show();
    } else {
        selectedEdge.controls.hide();
        selectedEdge.controls = new LineControls(selectedEdge.from,
            selectedEdge.to, selectedEdge.svgElem);
        selectedEdge.controls.show();
    }
};

const selectLineChoice = (evt: Event) => {
    selectedEdge.controls.hide();
    inputs.shortestLine.checked = true;
    selectedEdge.controls = new ShortestLine(selectedEdge.from,
        selectedEdge.to, selectedEdge.svgElem);
    selectedEdge.controls.show();
};

const selectBezierChoice = (evt: Event) => {
    selectedEdge.controls.hide();
    selectedEdge.controls = new BezierControls(selectedEdge.from,
        selectedEdge.to, selectedEdge.svgElem);
    selectedEdge.controls.show();
};

inputs.transChar.addEventListener("input", inputTransChar);
inputs.epsilonTrans.addEventListener("change", changeEpsilonTrans);
inputs.shortestLine.addEventListener("change", changeShortestLine);
inputs.deleteTrans.addEventListener("click", deleteEdge);

inputs.arrowType.bezierChoice.addEventListener("change", selectBezierChoice);
inputs.arrowType.lineChoice.addEventListener("change", selectLineChoice);
