import { getStartingState, setStartingState, State } from "./main.js";

export const form = document.querySelector<HTMLFormElement>("#state-config");

export const inputs = {
    stateName: form.querySelector<HTMLInputElement>("#state-name"),
    starting: form.querySelector<HTMLInputElement>("#starting"),
    accepting: form.querySelector<HTMLInputElement>("#accepting")
}

let selectedState: State = null;

export const initForm = (state: State) => {
    selectedState = state;
    
    const { stateName, starting, accepting } = inputs;

    stateName.value = state.name;
    starting.checked = state === getStartingState();
    accepting.checked = state.accepting;
};

const checkNull = <T>(f: (_: T) => void) => (arg: T) => {
    if (selectedState !== null)
        f(arg);
};

export const inputStateName = checkNull((evt: Event) => {
    selectedState.name = inputs.stateName.value;
});

export const changeStarting = checkNull((evt: Event) =>
    setStartingState(selectedState));

inputs.stateName.addEventListener("input", inputStateName);
inputs.starting.addEventListener("change", changeStarting);

