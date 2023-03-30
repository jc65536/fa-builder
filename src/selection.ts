import * as transConfig from "./trans-config.js";
import * as stateConfig from "./state-config.js";
import {
    configMenuContainer, Edge, State, getStartingEdge, deleteEdge, deleteState
} from "./main.js";

export const selectedEdges = new Set<Edge>();
export const selectedStates = new Set<State>();

export const selectEdge = (edge: Edge) => {
    selectedEdges.add(edge);
    edge.pathElem.classList.add("selected");
};

export const deselectEdge = (edge: Edge) => {
    selectedEdges.delete(edge);
    edge.pathElem.classList.remove("selected");
};

export const selectState = (state: State) => {
    selectedStates.add(state);
    state.groupElem.classList.add("selected");
};

export const deselectState = (state: State) => {
    selectedStates.delete(state);
    state.groupElem.classList.remove("selected");
};

export const cancelSelection = () => {
    selectedEdges.forEach(e => {
        e.controls.hide();
        e.pathElem.classList.remove("selected")
    });
    selectedEdges.clear();
    selectedStates.forEach(s => s.groupElem.classList.remove("selected"));
    selectedStates.clear();
    configMenuContainer.classList.value = "none";
}

export const finishSelection = () => {
    const numSelected = selectedEdges.size + selectedStates.size;

    configMenuContainer.classList.value = (() => {
        if (numSelected === 0) {
            return "none";
        } else if (numSelected > 1) {
            return "mult";
        } else if (selectedEdges.size === 1) {
            const [edge] = selectedEdges;

            if (edge === getStartingEdge())
                return "other";

            transConfig.initForm(edge);
            return "trans";
        } else {
            const [state] = selectedStates;
            stateConfig.initForm(state);
            return "state";
        }
    })();

    selectedEdges.forEach(e => e.controls.show());
};

const deleteSelection = (evt: Event) => {
    const numSelected = selectedEdges.size + selectedStates.size;
    if (numSelected <= 10 || confirm("Delete 10+ elements?")) {
        selectedEdges.forEach(deleteEdge);
        selectedStates.forEach(deleteState);
    }
    cancelSelection();
}

document.getElementById("delete").addEventListener("click", deleteSelection);
