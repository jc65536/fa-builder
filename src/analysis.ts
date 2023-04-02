import * as list from "./list.js";
import { List } from "./list.js";
import { Edge, getStartingState, State } from "./main.js";

const analysisError =
    document.querySelector<HTMLParagraphElement>("#analysis-error");

const regexOutput = document.querySelector<HTMLSpanElement>("#regex-output");

const setAnalysisError = (str: string) => analysisError.textContent = str;

/*
 * Idea: traverse the graph depth-first.
 * When we encounter a loop, start growing a LoopFrag
 * On the way back up the traversal, we add to the LoopFrag
 * When we reach the state indicated in the LoopFrag we have completed the loop,
 * which means we can add (loop)* to any existing fragments.
 */

type LoopFrag = {
    frag: string,
    state: State
};

const fmt_repeat = (s: string) => {
    if (s === "")
        return s;
    else if (s.length === 1)
        return `${s}*`;
    else
        return `(${s})*`;
};

const fmt_alternate = (s: string[], optional: boolean) => {
    const joined = s.join("|");
    if (optional)
        return `[${joined}]`;
    else if (s.length <= 1)
        return joined;
    else
        return `(${joined})`;
};

const generateRegex = (state: State, history: List<Edge>):
    [string, LoopFrag[]] => {
    const outEdges = [...state.outEdges];

    if (outEdges.some(e => e.transChar === ""))
        throw `Error: unknown transition from ${state.name || "(unnamed)"}`;

    const lastTransChar = history?.val.transChar ?? "";

    const detectLoop = (ls: List<Edge>): boolean =>
        ls !== null && (ls.val.startState === state || detectLoop(ls.next));

    if (detectLoop(history))
        return [null, [{ frag: lastTransChar, state }]];

    const [frags, loopFrags] = outEdges
        .reduce<[string[], LoopFrag[]]>(([frags, loopFrags], edge) => {
            const [f, lfs] = generateRegex(edge.endState,
                list.cons(edge)(history));
            return [frags.concat(f ?? []), loopFrags.concat(lfs)];
        }, [[], []]);

    const loops = fmt_repeat(loopFrags
        .filter(lf => lf.state === state)
        .map(lf => lf.frag)
        .join("|"));

    // A fragment that takes us to the current state
    const currFrag = lastTransChar + loops;

    const newFrag = (() => {
        if (frags.length === 0)
            return state.accepting ? currFrag : null;
        else
            return currFrag + fmt_alternate(frags, state.accepting);
    })();

    const newLoopFrags = loopFrags.filter(lf => lf.state !== state)
        .map(lf => ({ ...lf, frag: currFrag + lf.frag }));

    return [newFrag, newLoopFrags];
};

export const analyze = async () => {
    if (getStartingState() === null) {
        setAnalysisError("Error: starting state does not exist");
        return;
    }

    setAnalysisError("");

    try {
        const [regex, loopFrags] = generateRegex(getStartingState(), null);

        if (loopFrags.length > 0)
            throw `Error: regex analysis returned with loop frags
                   ${loopFrags.map(lf => lf.frag)} (contact Jason)`;

        regexOutput.textContent = regex;
    } catch (e) {
        setAnalysisError(e);
    }
};
