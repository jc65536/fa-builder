import { epsilonChar } from "./config.js";
import * as list from "./list.js";
import { List } from "./list.js";
import { acceptingStates, Edge, getStartingState, State } from "./main.js";

const analysisWarning =
    document.querySelector<HTMLParagraphElement>("#analysis-warning");

const setAnalysisWarning = (str: string) => analysisWarning.textContent = str;

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

const fmt_alternate = (s: string[]) => {
    const joined = s.join("|");
    return s.length <= 1 ? joined : `(${joined})`;
};

const generateRegex = (state: State, edgesTaken: List<Edge>):
    [string, LoopFrag[]] => {
    const outEdges = [...state.outEdges];

    if (outEdges.some(e => e.transChar === "")) {
        setAnalysisWarning(`Error: unknown transition from ${state.name || "(unnamed)"}`);
        return [null, []];
    }

    const detectLoop = (ls: List<Edge>): boolean =>
        ls !== null && (ls.val.startState === state || detectLoop(ls.next));

    const lastTransChar = edgesTaken?.val.transChar ?? "";

    if (detectLoop(edgesTaken)) {
        return [null, [{ frag: lastTransChar, state }]];
    } else {
        const [frags, loopFrags] = outEdges
            .reduce<[string[], LoopFrag[]]>(([frags, loopFrags], edge) => {
                const [f, lfs] = generateRegex(edge.endState, list.cons(edge)(edgesTaken));
                return [frags.concat(f ?? []), loopFrags.concat(lfs)];
            }, [[], []]);

        const loops = fmt_repeat(loopFrags.filter(lf => lf.state === state)
            .map(lf => lf.frag)
            .join("|"));

        const thisFrag = lastTransChar + loops;

        const frag = (() => {
            if (frags.length > 0) {
                const epsilonIfAccepting = state.accepting ? [epsilonChar] : [];
                return thisFrag + fmt_alternate(epsilonIfAccepting.concat(frags));
            } else if (state.accepting) {
                return thisFrag;
            } else {
                return null;
            }
        })();

        const newLoopFrags = loopFrags.filter(lf => lf.state !== state)
            .map(lf => ({ frag: thisFrag + lf.frag, state: lf.state }));

        return [frag, newLoopFrags];
    }
}

export const analyze = () => {
    if (getStartingState() === null) {
        setAnalysisWarning("Error: starting state does not exist");
        return;
    }

    setAnalysisWarning("");

    const regex = generateRegex(getStartingState(), null);
    console.log(regex);
};