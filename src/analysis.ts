import { getStartingState } from "./main.js";

const analysisWarning =
    document.querySelector<HTMLParagraphElement>("#analysis-warning");

export const analyze = () => {
    if (getStartingState() === null) {
        analysisWarning.textContent = "Error: starting state does not exist";
    }
};
