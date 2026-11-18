import { state, uiState, replaceState } from './store.js';
import { showToast } from '../ui/notifications.js';
import { render } from '../ui/gridRenderer.js';

let historyStack = [];

export function saveStateToHistory() {
    uiState.isDirty = true;
    historyStack.push(JSON.stringify(state));
    if (historyStack.length > 20) historyStack.shift();
}

export function undo() {
    if (historyStack.length > 0) {
        const restored = JSON.parse(historyStack.pop());
        replaceState(restored);
        localStorage.setItem('architect_matrix_state', JSON.stringify(state));
        render();
        showToast("Undo successful", "info");
    } else {
        showToast("Nothing to undo", "error");
    }
}
