import { stateConfig } from "./config.js";
import { canvas } from "./main.js";

export type NumPair = [number, number];

export const createSvgElement = <T extends keyof SVGElementTagNameMap>(name: T) =>
    document.createElementNS<T>("http://www.w3.org/2000/svg", name);

export const screenToSvgCoords = (x: number, y: number): NumPair =>
    applyCTM(x, y, canvas.getScreenCTM().inverse());

export const applyCTM = (x: number, y: number, ctm: DOMMatrix): NumPair =>
    [ctm.a * x + ctm.e, ctm.d * y + ctm.f];

export const dist = (p1: NumPair, p2: NumPair) =>
    Math.hypot(p1[0] - p2[0], p1[1] - p2[1]);

export const closestPoints = (c1: NumPair, c2: NumPair): [NumPair, NumPair] => {
    const r = stateConfig.radius;
    const [x1, y1] = c1;
    const [x2, y2] = c2;
    const a = Math.atan2(y1 - y2, x2 - x1);
    const offset = polarVec(r, a);
    return [addVec(c1)(offset), subVec(c2)(offset)];
};

export const setAttributes = (elem: Element, attrs: string[], vals: string[]) =>
    attrs.forEach((attr, i) => elem.setAttribute(attr, vals[i]));

export const ifelse = (cond: boolean) =>
    cond ? <T>(x: T) => (y: T) => x : <T>(x: T) => (y: T) => y;

export const polarVec = (r: number, a: number): NumPair =>
    [r * Math.cos(a), -r * Math.sin(a)];

export const addVec = (v1: NumPair) => (v2: NumPair): NumPair =>
    [v1[0] + v2[0], v1[1] + v2[1]];

export const subVec = (v1: NumPair) => (v2: NumPair): NumPair =>
    [v1[0] - v2[0], v1[1] - v2[1]];

export const scaleVec = (v: NumPair) => (c: number): NumPair =>
    [c * v[0], c * v[1]];

export enum Path { Line, Bezier }

type LineCtrlPoints = {
    type: Path.Line,
    p1: NumPair,
    p2: NumPair
};

type BezierCtrlPoints = {
    type: Path.Bezier,
    start: NumPair,
    startCtrlRel: NumPair,
    endCtrlRel: NumPair,
    end: NumPair
};
export type CtrlPoints = LineCtrlPoints | BezierCtrlPoints;

const pathCmd = (cp: CtrlPoints): string => {
    switch(cp.type) {
        case Path.Line:
            const {p1, p2} = cp;
            return `M ${p1[0]},${p1[1]} L ${p2[0]},${p2[1]}`;
        case Path.Bezier:
            const {start, startCtrlRel, endCtrlRel, end} = cp;
            const startCtrl = addVec(start)(startCtrlRel);
            const endCtrl = addVec(end)(endCtrlRel);
            return `M ${start[0]},${start[1]}
                    C ${startCtrl[0]},${startCtrl[1]}
                    ${endCtrl[0]},${endCtrl[1]}
                    ${end[0]},${end[1]}`;
    }
}

export const setPathCmd = (path: SVGPathElement, cp: CtrlPoints) =>
    path.setAttribute("d", pathCmd(cp));

// Debug helpers

let strCnt = 0;

export const newStr = () => (++strCnt).toString();
