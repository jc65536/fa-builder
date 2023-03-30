import * as transConfig from "./trans-config.js";
import * as stateConfig from "./state-config.js";
import { acceptingStates, configMenuContainer, Edge, edges, State, states, getStartingEdge, getStartingState } from "./main.js";

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
    state.gElem.classList.add("selected");
};

export const deselectState = (state: State) => {
    selectedStates.delete(state);
    state.gElem.classList.remove("selected");
};

export const cancelSelection = () => {
    selectedEdges.forEach(e => {
        e.controls.hide();
        e.pathElem.classList.remove("selected")
    });
    selectedEdges.clear();
    selectedStates.forEach(s => s.gElem.classList.remove("selected"));
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
                return "none";

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

const deleteEdge = (edge: Edge) => {
    edge.startState.outEdges =
        edge.startState.outEdges.filter(e => e !== edge);

    edge.endState.inEdges =
        edge.endState.inEdges.filter(e => e !== edge);

    edge.pathElem.remove();
    edge.textElem.remove();
    edges.delete(edge);
}

const deleteSelection = (evt: Event) => {
    if (selectedStates.has(getStartingState()) || selectedEdges.has(getStartingEdge())) {
        alert("Can't delete starting state!");
        return;
    }

    const numSelected = selectedEdges.size + selectedStates.size;
    if (numSelected <= 10 || confirm("Delete 10+ elements?")) {
        selectedEdges.forEach(deleteEdge);

        selectedStates.forEach(state => {
            state.outEdges.forEach(deleteEdge);
            state.inEdges.forEach(deleteEdge);

            if (state.accepting)
                acceptingStates.delete(state);
            
            state.gElem.remove();
            states.delete(state);
        });
    }
    cancelSelection();
}

document.getElementById("delete").addEventListener("click", deleteSelection);
