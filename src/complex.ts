import * as vec from "./vector.js";

export type Complex = { r: number, a: number };

export const znew = (r: number, a: number): Complex => ({ r: r, a: a });

export const from = (x: number) => x < 0 ? znew(-x, Math.PI) : znew(x, 0);

export const add = (...zs: Complex[]) => {
    const sumVec = zs.map(z => vec.scale(z.r)([Math.cos(z.a), Math.sin(z.a)]))
        .reduce((acc, v) => vec.add(acc)(v), [0, 0]);
    return znew(Math.hypot(...sumVec), Math.atan2(sumVec[1], sumVec[0]));
}

export const scale = (x: number) => (z: Complex) =>
    x < 0 ? znew(z.r * -x, z.a + Math.PI) : znew(z.r * x, z.a);

export const mult = (z1: Complex) => (z2: Complex) =>
    znew(z1.r * z2.r, z1.a + z2.a);

export const sqrt = (z: Complex) => {
    const r = Math.sqrt(z.r);
    const a = z.a / 2;
    return [znew(r, a), znew(r, a + Math.PI)];
}

export const sqrtPrimary = (x: number) =>
    x < 0 ? znew(Math.sqrt(-x), Math.PI / 2) : znew(Math.sqrt(x), 0);

const pi23 = 2 * Math.PI / 3;

export const cbrt = (z: Complex) => {
    const r = Math.cbrt(z.r);
    const a = z.a / 3;
    return [znew(r, a), znew(r, a + pi23), znew(r, a + 2 * pi23)];
}

export const inv = (z: Complex) => znew(1 / z.r, -z.a);

export const fmt = (z: Complex) =>
    `${z.r * Math.cos(z.a)} + ${z.r * Math.sin(z.a)}i`;
