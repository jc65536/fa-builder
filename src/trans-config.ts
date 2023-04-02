import { analyze } from "./analysis.js";
import { epsilonChar } from "./config.js";
import { Edge } from "./main.js";
import {
    BezierControls, LineControls, ShortestLineControls
} from "./path-controls.js";

export const form = document.querySelector<HTMLFormElement>("#trans-config");

export const inputs = {
    transChar: form.querySelector<HTMLInputElement>("#trans-char"),
    epsilonTrans: form.querySelector<HTMLInputElement>("#epsilon-trans"),
    lineChoice: form.querySelector<HTMLInputElement>("#line-choice"),
    bezierChoice: form.querySelector<HTMLInputElement>("#bezier-choice"),
    shortestLine: form.querySelector<HTMLInputElement>("#shortest-line")
}

let selectedEdge: Edge = null;

export const initForm = (edge: Edge) => {
    selectedEdge = edge;

    const { transChar, epsilonTrans, shortestLine, lineChoice,
        bezierChoice } = inputs;

    transChar.value = edge.transChar;

    const isEpsilon = edge.transChar === epsilonChar;
    transChar.disabled = epsilonTrans.checked = isEpsilon;

    const controls = edge.controls;

    if (edge.startState === edge.endState) {
        bezierChoice.checked = true;
        lineChoice.disabled = true;
    } else {
        lineChoice.disabled = false;

        if (controls instanceof LineControls || controls instanceof ShortestLineControls) {
            lineChoice.checked = true;
            shortestLine.checked = edge.controls instanceof ShortestLineControls;
        } else if (controls instanceof BezierControls) {
            bezierChoice.checked = true;
        }
    }
};

const checkNull = <T>(f: (_: T) => void) => (arg: T) => {
    if (selectedEdge !== null)
        f(arg);
};

export const inputTransChar = checkNull((evt: Event) => {
    const { transChar, epsilonTrans } = inputs;

    if (transChar.value === "epsilon")
        transChar.value = epsilonChar;

    selectedEdge.transChar = transChar.value;

    if (transChar.value === epsilonChar) {
        transChar.disabled = true;
        epsilonTrans.checked = true;
    }

    selectedEdge.textPathElem.textContent = transChar.value;

    analyze();
});

export const changeEpsilonTrans = checkNull((evt: Event) => {
    const { transChar, epsilonTrans } = inputs;

    if (epsilonTrans.checked) {
        selectedEdge.textPathElem.textContent
            = selectedEdge.transChar
            = transChar.value
            = epsilonChar;
        transChar.disabled = true;
    } else {
        selectedEdge.textPathElem.textContent
            = selectedEdge.transChar
            = transChar.value
            = "";
        transChar.disabled = false;
    }
});

const changeShortestLine = checkNull((evt: Event) => {
    selectedEdge.controls.hide();
    const controlsType = inputs.shortestLine.checked ?
        ShortestLineControls : LineControls;
    selectedEdge.controls = new controlsType(selectedEdge);
    selectedEdge.controls.show();
});

const selectLineChoice = checkNull((evt: Event) => {
    selectedEdge.controls.hide();
    inputs.shortestLine.checked = false;
    selectedEdge.controls = new LineControls(selectedEdge);
    selectedEdge.controls.show();
});

const selectBezierChoice = checkNull((evt: Event) => {
    selectedEdge.controls.hide();
    selectedEdge.controls = new BezierControls(selectedEdge, false);
    selectedEdge.controls.show();
});

inputs.transChar.addEventListener("input", inputTransChar);
inputs.epsilonTrans.addEventListener("change", changeEpsilonTrans);
inputs.shortestLine.addEventListener("change", changeShortestLine);
inputs.bezierChoice.addEventListener("change", selectBezierChoice);
inputs.lineChoice.addEventListener("change", selectLineChoice);

form.addEventListener("submit", e => e.preventDefault());
