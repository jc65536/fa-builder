const createSvgElement = name => document.createElementNS(svgns, name);

const screenToSvgCoords = (x, y) => {
    const ictm = canvas.getScreenCTM().inverse();
    return [ictm.a * x + ictm.e, ictm.d * y + ictm.f];
};
