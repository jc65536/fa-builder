import { getStartingState, State } from "./main.js";

const analysisWarning =
    document.querySelector<HTMLParagraphElement>("#analysis-warning");

type Link = {

};

const generateRegex = (state: State, acc: Link[]) => {
}

export const analyze = () => {
    if (getStartingState() === null) {
        analysisWarning.textContent = "Error: starting state does not exist";
        return;
    }

    analysisWarning.textContent = "";

    const regex = generateRegex(getStartingState(), []);

    console.log(regex);
};
