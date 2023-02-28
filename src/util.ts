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

export const closestPointsBetweenStates = (c1: NumPair, c2: NumPair): [NumPair, NumPair] => {
    const r = stateConfig.radius;
    const a = Math.atan2(c2[1] - c1[1], c2[0] - c1[0]);
    const rcos = r * Math.cos(a);
    const rsin = r * Math.sin(a);
    return [[c1[0] + rcos, c1[1] + rsin], [c2[0] - rcos, c2[1] - rsin]];
};
