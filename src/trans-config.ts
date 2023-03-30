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
    shortestLine: form.querySelector<HTMLInputElement>("#shortest-line")
}

let selectedEdge: Edge = null;

export const initForm = (edge: Edge) => {
    selectedEdge = edge;
    
    const { transChar, epsilonTrans, shortestLine, arrowType } = inputs;

    transChar.value = edge.transChar;

    const isEpsilon = edge.transChar === epsilonChar;
    transChar.disabled = epsilonTrans.checked = isEpsilon;

    const controls = edge.controls;

    if (edge.startState === edge.endState) {
        arrowType.bezierChoice.checked = true;
        arrowType.lineChoice.disabled = true;
    } else {
        arrowType.lineChoice.disabled = false;

        if (controls instanceof LineControls || controls instanceof ShortestLineControls) {
            arrowType.lineChoice.checked = true;
            shortestLine.checked = edge.controls instanceof ShortestLineControls;
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

    selectedEdge.textElem.textContent = transChar.value;
}

export const changeEpsilonTrans = (evt: Event) => {
    if (selectedEdge === null)
        return;

    const { transChar, epsilonTrans } = inputs;

    if (epsilonTrans.checked) {
        selectedEdge.textElem.textContent
            = selectedEdge.transChar
            = transChar.value
            = epsilonChar;
        transChar.disabled = true;
    } else {
        selectedEdge.textElem.textContent
            = selectedEdge.transChar
            = transChar.value
            = "";
        transChar.disabled = false;
    }
}

const changeShortestLine = (evt: Event) => {
    if (selectedEdge === null)
        return;

    selectedEdge.controls.hide();
    const controlsType = inputs.shortestLine.checked ?
        ShortestLineControls : LineControls;
    selectedEdge.controls = new controlsType(selectedEdge);
    selectedEdge.controls.show();
};

const selectLineChoice = (evt: Event) => {
    if (selectedEdge === null)
        return;

    selectedEdge.controls.hide();
    inputs.shortestLine.checked = false;
    selectedEdge.controls = new LineControls(selectedEdge);
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
inputs.arrowType.bezierChoice.addEventListener("change", selectBezierChoice);
inputs.arrowType.lineChoice.addEventListener("change", selectLineChoice);

form.addEventListener("submit", e => e.preventDefault());
