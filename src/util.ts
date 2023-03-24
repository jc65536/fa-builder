import { stateConfig } from "./config.js";
import { canvas } from "./main.js";

export type Vec = [number, number];

export const createSvgElement = <T extends keyof SVGElementTagNameMap>(name: T) =>
    document.createElementNS<T>("http://www.w3.org/2000/svg", name);

export const screenToSvgCoords = (pos: Vec): Vec =>
    applyCTM(pos, canvas.getScreenCTM().inverse());

export const applyCTM = (pos: Vec, ctm: DOMMatrix): Vec =>
    [ctm.a * pos[0] + ctm.e, ctm.d * pos[1] + ctm.f];

export const dist = (p1: Vec, p2: Vec) =>
    Math.hypot(p1[0] - p2[0], p1[1] - p2[1]);

export const closestPoints = (c1: Vec, c2: Vec): [Vec, Vec] => {
    const r = stateConfig.radius;
    const a = atanVec(c1)(c2);
    const offset = polarVec(r, a);
    return [addVec(c1)(offset), subVec(c2)(offset)];
};

export const setAttributes = (elem: Element, attrs: string[], vals: string[]) =>
    attrs.forEach((attr, i) => elem.setAttribute(attr, vals[i]));

export const ifelse = (c: boolean) =>
    c ? <T>(x: T) => (y: T) => x : <T>(x: T) => (y: T) => y;

export const polarVec = (r: number, a: number): Vec =>
    [r * Math.cos(a), -r * Math.sin(a)];

export const addVec = (v1: Vec) => (v2: Vec): Vec =>
    [v1[0] + v2[0], v1[1] + v2[1]];

export const subVec = (v1: Vec) => (v2: Vec): Vec =>
    [v1[0] - v2[0], v1[1] - v2[1]];

export const scaleVec = (c: number) => (v: Vec): Vec =>
    [c * v[0], c * v[1]];

export const side = (a1: number) => (a2: number) =>
    Math.sin(a2 - a1) >= 0 ? 1 : -1;

export const atanVec = (p1: Vec) => (p2: Vec) =>
    Math.atan2(p1[1] - p2[1], p2[0] - p1[0]);

export enum Path { Line, Bezier }

type LineCtrlPoints = {
    type: Path.Line,
    p1: Vec,
    p2: Vec
};

type BezierCtrlPoints = {
    type: Path.Bezier,
    from: Vec,
    startA: number,
    startCtrlRel: Vec,
    endCtrlRel: Vec,
    endA: number,
    to: Vec
};

export type CtrlPoints = LineCtrlPoints | BezierCtrlPoints;

const pathCmd = (cp: CtrlPoints): string => {
    switch(cp.type) {
        case Path.Line:
            const {p1, p2} = cp;
            return `M ${p1[0]},${p1[1]} L ${p2[0]},${p2[1]}`;
        case Path.Bezier:
            const {from, startA, startCtrlRel, endCtrlRel, endA, to} = cp;
            const start = addVec(from)(polarVec(stateConfig.radius, startA));
            const end = addVec(to)(polarVec(stateConfig.radius, endA));
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
