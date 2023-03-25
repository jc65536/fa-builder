export type Complex = { r: number, a: number };

export const cnew = (r: number, a: number) => ({ r: r, a: a });

export const cfrom = (x: number): Complex =>
    x < 0 ? cnew(-x, Math.PI) : cnew(x, 0);

export const cmult = (c1: Complex) => (c2: Complex): Complex =>
    cnew(c1.r * c2.r, c1.a + c2.a);

export const cbrtUnity: Complex = cnew(1, 2 * Math.PI / 3);

export const csqrt = (c: Complex): [Complex, Complex] => {
    const r = Math.sqrt(c.r);
    const a = c.a / 2;
    return [cnew(r, a), cnew(r, a + Math.PI)];
}

export const ccbrt = (c: Complex): [Complex, Complex, Complex] => {
    const pi23 = 2 * Math.PI / 3;
    const r = Math.cbrt(c.r);
    const a = c.a / 3;
    return [cnew(r, a), cnew(r, a + pi23), cnew(r, a + 2 * pi23)];
}

export const cinv = (c: Complex) => cnew(1 / c.r, -c.a);
