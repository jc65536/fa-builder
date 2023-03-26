import * as cmpx from "./complex.js";
import { stateConfig } from "./config.js";
import { canvas } from "./main.js";
import * as vec from "./vector.js";
import { Vec } from "./vector.js";

export const createSvgElement = <T extends keyof SVGElementTagNameMap>(name: T) =>
    document.createElementNS<T>("http://www.w3.org/2000/svg", name);

export const screenToSvgCoords = (pos: Vec): Vec =>
    applyCTM(pos, canvas.getScreenCTM().inverse());

export const applyCTM = (pos: Vec, ctm: DOMMatrix): Vec =>
    [ctm.a * pos[0] + ctm.e, ctm.d * pos[1] + ctm.f];

export const closestPoints = (c1: Vec, c2: Vec): [Vec, Vec] => {
    const r = stateConfig.radius;
    const a = vec.angleBetweenScreen(c1)(c2);
    const offset = vec.polar(r, a);
    return [vec.add(c1)(offset), vec.sub(c2)(offset)];
};

export const setAttributes = (elem: Element, attrs: string[], vals: string[]) =>
    attrs.forEach((attr, i) => elem.setAttribute(attr, vals[i]));

export const ifelse = (c: boolean) =>
    c ? <T>(x: T) => (_: T) => x : <T>(_: T) => (y: T) => y;

export const side = (a1: number) => (a2: number) =>
    Math.sin(a2 - a1) >= 0 ? 1 : -1;

export const numOrd = (x: number, y: number) => x - y;

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
    switch (cp.type) {
        case Path.Line:
            const { p1, p2 } = cp;
            return `M ${p1[0]},${p1[1]} L ${p2[0]},${p2[1]}`;
        case Path.Bezier:
            const { from, startA, startCtrlRel, endCtrlRel, endA, to } = cp;
            const start = vec.add(from)(vec.polar(stateConfig.radius, startA));
            const end = vec.add(to)(vec.polar(stateConfig.radius, endA));
            const startCtrl = vec.add(start)(startCtrlRel);
            const endCtrl = vec.add(end)(endCtrlRel);
            return `M ${start[0]},${start[1]}
                    C ${startCtrl[0]},${startCtrl[1]}
                    ${endCtrl[0]},${endCtrl[1]}
                    ${end[0]},${end[1]}`;
    }
}

export const setPathCmd = (path: SVGPathElement, cp: CtrlPoints) =>
    path.setAttribute("d", pathCmd(cp));

export const lineIntersectsRect = ([x1, y1]: Vec, [x2, y2]: Vec,
    [l, t]: Vec, [r, b]: Vec) => {
    // Idea: check whether there exists s in [0, 1] such that
    // [x1, y1] + s[x2 - x1, y2 - y1] is in the rect

    const dx = x2 - x1;
    const dy = y2 - y1;

    // The lower/upper bounds of s in the horizontal range
    const [lbx, ubx] = [l, r].map(x => (x - x1) / dx).sort(numOrd);

    // The lower/upper bounds of s in the vertical range
    const [lby, uby] = [t, b].map(y => (y - y1) / dy).sort(numOrd);

    // The lower/upper bounds of s
    const lb = Math.max(lbx, lby);
    const ub = Math.min(ubx, uby);

    return lb <= ub && lb <= 1 && 0 <= ub;
};

export const bezierIntersectsRect = ([x1, y1]: Vec, [x2, y2]: Vec,
    [x3, y3]: Vec, [x4, y4]: Vec,
    [l, t]: Vec, [r, b]: Vec) => {

    // a is the cubic coefficient array
    {
        const [a, b, c, d] = [x4 - 3 * x3 + 3 * x2 - x1,
        3 * (x3 - 2 * x2 + x1),
        3 * (x2 - x1),
            x1];
        // const delta = 18 * a * b * c * d
        //     - 4 * Math.pow(b, 3) * d
        //     + Math.pow(b * c, 2)
        //     - 4 * a * Math.pow(c, 3)
        //     - 27 * Math.pow(a * d, 2);
    }
    0
};

export const solveCubic = (a: number, b: number, c: number, d: number) => {
    const delta0 = Math.pow(b, 2) - 3 * a * c;
    const delta1 = 2 * Math.pow(b, 3) - 9 * a * b * c + 27 * Math.pow(a, 2) * d;

    if (delta0 === 0 && delta1 === 0)
        return [-b / (3 * a)];

    const C = (() => {
        if (delta0 === 0) {
            return cmpx.cbrt(cmpx.from(delta1));
        } else {
            const sqrtPart = cmpx.sqrtPrimary(Math.pow(delta1, 2) - 4 * Math.pow(delta0, 3));
            return cmpx.cbrt(cmpx.scale(0.5)(cmpx.add(cmpx.from(delta1), sqrtPart)));
        }
    })();

    return C.map(z => cmpx.scale(-1 / (3 * a))
        (cmpx.add(cmpx.from(b), z, cmpx.scale(delta0)(cmpx.inv(z)))))
        .filter(z => Math.abs(Math.sin(z.a)) < 1e-9)
        .map(z => Math.sign(Math.cos(z.a)) * z.r);
}

// Debug helpers

let strCnt = 0;

export const newStr = () => (++strCnt).toString();
