import * as assert from "assert/strict";
import * as cmpx from "../src/complex.js";
import { assertApprox } from "./util.js";

const test_from = () => {
    const r1 = cmpx.from(2);
    assert.deepEqual(r1, cmpx.znew(2, 0));

    const r2 = cmpx.from(-2);
    assert.deepEqual(r2, cmpx.znew(2, Math.PI));

    const r3 = cmpx.from(0);
    assert.deepEqual(r3, cmpx.znew(0, 0));
}

const test_add = () => {
    {
        const z1 = cmpx.znew(1, Math.PI / 6);
        const z2 = cmpx.znew(1, Math.PI / 2);
        const z3 = cmpx.znew(Math.sqrt(3), -2 * Math.PI / 3);
        const sum = cmpx.add(z1, z2, z3);
        assertApprox(sum.r, 0);
    }

    {
        const z = cmpx.znew(1, 1);
        const sum = cmpx.add(z, z);
        assert.equal(sum.r, 2);
        assert.equal(sum.a, 1);
    }
}

export const test_all = () => {
    test_from();
    test_add();
}
