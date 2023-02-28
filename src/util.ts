import { canvas } from "./main.js";

const svgns = "http://www.w3.org/2000/svg";

export const createSvgElement = (name: string) =>
    document.createElementNS(svgns, name);

export const screenToSvgCoords = (x: number, y: number) => {
    const ictm = canvas.getScreenCTM().inverse();
    return [ictm.a * x + ictm.e, ictm.d * y + ictm.f];
};
