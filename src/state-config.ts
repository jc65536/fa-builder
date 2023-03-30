import {
    getStartingState, setStartingState, State, toggleAccept
} from "./main.js";

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
    selectedState.textElem.textContent
        = selectedState.name
        = inputs.stateName.value;
});

export const changeStarting = checkNull((evt: Event) =>
    setStartingState(inputs.starting.checked ? selectedState : null));

const changeAccepting = checkNull((evt: Event) => toggleAccept(selectedState));

inputs.stateName.addEventListener("input", inputStateName);
inputs.starting.addEventListener("change", changeStarting);
inputs.accepting.addEventListener("change", changeAccepting);

