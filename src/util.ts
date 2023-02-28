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
    const a = Math.atan2(y2 - y1, x2 - x1);
    const rcos = r * Math.cos(a);
    const rsin = r * Math.sin(a);
    return [[x1 + rcos, y1 + rsin], [x2 - rcos, y2 - rsin]];
};

export const setAttributes = (elem: Element, attrs: string[], vals: string[]) =>
    attrs.forEach((attr, i) => elem.setAttribute(attr, vals[i]));

export const ifelse = (cond: boolean) => <T>(x: T) => (y: T) => cond ? x : y;
