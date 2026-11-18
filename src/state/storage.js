import { DEFAULT_SCHOOL_NAME } from '../config/constants.js';
import { state, adjustState, uiState, replaceState, validateState } from './store.js';
import { saveStateToHistory } from './history.js';
import { showToast } from '../ui/notifications.js';
import { render } from '../ui/gridRenderer.js';
import { renderAdjBoard } from '../ui/adjustmentModal.js';

export function saveMainState() {
    localStorage.setItem('architect_matrix_state', JSON.stringify(state));
}

export function loadInitialState() {
    try {
        const saved = localStorage.getItem('architect_matrix_state');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (validateState(parsed)) replaceState(parsed);
            else throw new Error("Schema Validation Failed.");
        }
    } catch (e) {
        console.error("Corrupted cache safely wiped.", e);
        localStorage.removeItem('architect_matrix_state');
    }

    if (!state.schoolName) state.schoolName = DEFAULT_SCHOOL_NAME;
    if (!state.blueprints.junior) state.blueprints.junior = [];
    if (!state.blueprints.senior) state.blueprints.senior = [];
}

export function initStorageSync() {
    window.addEventListener('beforeunload', (e) => {
        if (uiState.isDirty) {
            e.preventDefault();
            e.returnValue = '';
        }
    });

    window.addEventListener('storage', (e) => {
        if (e.key === 'architect_matrix_state' && e.newValue) {
            try {
                const freshState = JSON.parse(e.newValue);
                if (validateState(freshState)) {
                    replaceState(freshState);
                    if (document.getElementById('adjModal').style.display === 'flex') {
                        renderAdjBoard();
                    } else {
                        render();
                    }
                    showToast("🔄 Timetable state synchronized across tabs.", "info");
                }
            } catch (err) {
                console.error("Tab synchronization frame collision prevented.", err);
            }
        }
    });
}

export function exportData() {
    uiState.isDirty = false;
    const exportPayload = {
        ...state,
        _savedCovers: adjustState.covers,
        _savedAbsent: adjustState.absent,
        _coversDate: adjustState.dateStr
    };
    const b = new Blob([JSON.stringify(exportPayload)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = 'timetable.json';
    a.click();
    showToast("Data exported successfully.", "success");
}

export function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
        try {
            const parsed = JSON.parse(r.result);
            if (!validateState(parsed)) throw new Error("Invalid schema structure.");
            saveStateToHistory();
            replaceState(parsed);
            if (!state.schoolName) state.schoolName = DEFAULT_SCHOOL_NAME;
            if (!state.blueprints.junior) state.blueprints.junior = [];
            if (!state.blueprints.senior) state.blueprints.senior = [];

            if (parsed._savedCovers && parsed._coversDate) {
                adjustState.covers = parsed._savedCovers;
                if (parsed._savedAbsent) adjustState.absent = parsed._savedAbsent;
                adjustState.dateStr = parsed._coversDate;
                const dateInput = document.getElementById('adjDate');
                if (dateInput) dateInput.value = parsed._coversDate;

                localStorage.setItem(`architect_covers_${parsed._coversDate}`, JSON.stringify(adjustState.covers));
                localStorage.setItem(`architect_absent_${parsed._coversDate}`, JSON.stringify(adjustState.absent));
            }

            saveMainState();
            render();
            showToast("Data loaded successfully.", "success");
        } catch (err) {
            showToast("Load Failed: " + err.message, "error");
        }
        e.target.value = '';
    };
    r.readAsText(file);
}
