export type Vec = [number, number];

export const dist = (p1: Vec, p2: Vec) => Math.hypot(...sub(p1)(p2));

export const polar = (r: number, a: number): Vec =>
    [r * Math.cos(a), -r * Math.sin(a)];

export const add = (v1: Vec) => (v2: Vec): Vec =>
    [v1[0] + v2[0], v1[1] + v2[1]];

export const sub = (v1: Vec) => (v2: Vec): Vec =>
    [v1[0] - v2[0], v1[1] - v2[1]];

export const scale = (c: number) => (v: Vec): Vec =>
    [c * v[0], c * v[1]];

export const angleBetweenScreen = (p1: Vec) => (p2: Vec) =>
    Math.atan2(p1[1] - p2[1], p2[0] - p1[0]);

