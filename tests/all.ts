import * as cmpx from "./complex.js";

const test_map = {
    complex: cmpx
};

const tests = process.argv.slice(2);

if (tests.length === 0) {
    Object.values(test_map).forEach(m => m.test_all());
} else {
    tests.forEach(t => test_map[t].test_all());
}
