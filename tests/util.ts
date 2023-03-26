import * as assert from "assert/strict";

export const assertApprox = (actual: number, expected: number) => {
    assert.ok(Math.abs(actual - expected) < 1e-9);
}
