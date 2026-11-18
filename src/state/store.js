import { DEFAULT_SCHOOL_NAME } from '../config/constants.js';

export let state = {
    schoolName: DEFAULT_SCHOOL_NAME,
    registry: { subjects: [], teachers: [] },
    classes: [],
    blueprints: { junior: [], senior: [] },
    rules: []
};

export let adjustState = {
    dateStr: '',
    dayIndex: -1,
    absent: [],
    covers: {},
    draggedSub: null
};

export const uiState = {
    dragged: null,
    activeRuleId: null,
    editingReg: { type: '', idx: -1 },
    editingCls: { name: '', tier: '' },
    editingPer: { id: '', tier: '' },
    currentClashMap: {},
    isDirty: false
};

export function replaceState(newState) {
    state = newState;
}

export function validateState(st) {
    if (!st || typeof st !== 'object') return false;
    if (!Array.isArray(st.rules)) return false;
    if (!Array.isArray(st.classes)) return false;
    if (!st.blueprints || typeof st.blueprints !== 'object') return false;
    if (!st.registry || typeof st.registry !== 'object') return false;
    if (!Array.isArray(st.registry.subjects)) return false;
    if (!Array.isArray(st.registry.teachers)) return false;
    return true;
}

export function getFullSub(s) {
    const item = state.registry.subjects.find(x => x.s === s);
    return item ? item.f : s;
}

export function getFullTea(s) {
    const item = state.registry.teachers.find(x => x.s === s);
    return item ? item.f : s;
}
