import { svg } from "./main.js";

const svgns = "http://www.w3.org/2000/svg";

export const createSvgElement = name => document.createElementNS(svgns, name);

export const screenToSvgCoords = (x, y) => {
    const ictm = svg.getScreenCTM().inverse();
    return [ictm.a * x + ictm.e, ictm.d * y + ictm.f];
};
