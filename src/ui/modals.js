import { state, adjustState, uiState } from '../state/store.js';
import { sanitize, timeToMin, minToTime, generateId, setPrintOrientation } from '../utils/helpers.js';
import { saveStateToHistory } from '../state/history.js';
import { saveMainState } from '../state/storage.js';
import { requireAdmin } from '../state/auth.js';
import { showToast } from './notifications.js';
import { render } from './gridRenderer.js';
import { generateClassReports, generateTeacherReports } from '../print/reports.js';
import { generateMatrixReport } from '../print/masterMatrixPdf.js';

export function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

/* PERIOD MODAL */
export function openPerModal(id = null, tier) {
    requireAdmin(() => {
        uiState.editingPer = { id, tier };
        const p = id && state.blueprints[tier]
            ? state.blueprints[tier].find(x => x.id === id)
            : { n: '', s: 600, e: 640, r: false };
        document.getElementById('perTitle').innerText = id ? 'Edit Period' : 'Add Period';
        document.getElementById('perName').value = p.n || '';
        document.getElementById('perS').value = minToTime(p.s || 600);
        document.getElementById('perE').value = minToTime(p.e || 640);
        document.getElementById('perRecess').checked = p.r || false;
        document.getElementById('perModal').style.display = 'flex';
    });
}

export function savePeriod() {
    requireAdmin(() => {
        const n = sanitize(document.getElementById('perName').value.toUpperCase().trim());
        const s = timeToMin(document.getElementById('perS').value);
        const e = timeToMin(document.getElementById('perE').value);
        const r = document.getElementById('perRecess').checked;
        if (!n || s >= e) {
            showToast("Invalid inputs or times.", 'error');
            return;
        }
        const tierList = state.blueprints[uiState.editingPer.tier] || [];
        const overlap = tierList.find(p => p.id !== uiState.editingPer.id && ((s < Number(p.e) && e > Number(p.s))));
        if (overlap) {
            showToast(`Overlap Conflict! Intersects with ${overlap.n}.`, 'error');
            return;
        }
        saveStateToHistory();
        if (uiState.editingPer.id) {
            const p = tierList.find(x => x.id === uiState.editingPer.id);
            if (p) Object.assign(p, { n, s, e, r });
        } else {
            tierList.push({ id: generateId('p'), n, s, e, r });
        }
        if (!state.blueprints[uiState.editingPer.tier]) state.blueprints[uiState.editingPer.tier] = tierList;
        saveMainState();
        closeModal('perModal');
        render();
    });
}

export function deletePeriod(id, tier) {
    requireAdmin(() => {
        if (confirm("DANGER: Delete period? All assignments in this time slot for this tier will be permanently purged.")) {
            saveStateToHistory();
            if (state.blueprints[tier]) state.blueprints[tier] = state.blueprints[tier].filter(x => x.id !== id);
            if (state.rules) state.rules = state.rules.filter(r => r.periodId !== id);
            saveMainState();
            render();
            showToast("Period and tied assignments purged.", "info");
        }
    });
}

/* CLASS MODAL */
export function openClsModal(name = null, tier) {
    requireAdmin(() => {
        uiState.editingCls = { name, tier };
        document.getElementById('clsTitle').innerText = name ? 'Edit Class' : 'Add Class to Tier';
        document.getElementById('clsName').value = name || '';
        document.getElementById('clsModal').style.display = 'flex';
    });
}

export function saveClass() {
    requireAdmin(() => {
        const n = sanitize(document.getElementById('clsName').value.toUpperCase().trim());
        if (!n) return;
        if (uiState.editingCls.name) {
            if (n !== uiState.editingCls.name && state.classes.some(c => c.name === n)) {
                showToast("Class already exists.", "error");
                return;
            }
            saveStateToHistory();
            const targetCls = state.classes.find(x => x.name === uiState.editingCls.name);
            if (targetCls) targetCls.name = n;
            state.rules.forEach(r => {
                if (r && r.class === uiState.editingCls.name) r.class = n;
            });
        } else {
            if (state.classes.some(c => c.name === n)) {
                showToast("Class already exists.", "error");
                return;
            }
            saveStateToHistory();
            state.classes.push({ name: n, tier: uiState.editingCls.tier });
        }
        saveMainState();
        closeModal('clsModal');
        render();
    });
}

export function deleteClass(name) {
    requireAdmin(() => {
        if (confirm(`WARNING: Delete Class ${name}? All assignments for this class will be permanently lost.`)) {
            saveStateToHistory();
            state.classes = state.classes.filter(x => x.name !== name);
            state.rules = state.rules.filter(r => r.class !== name);
            saveMainState();
            render();
            showToast(`Class ${name} deleted.`, "info");
        }
    });
}

/* REGISTRY MODAL */
export function openRegModal(type, idx = -1) {
    requireAdmin(() => {
        uiState.editingReg = { type, idx };
        const list = type === 'sub' ? (state.registry.subjects || []) : (state.registry.teachers || []);
        const item = idx === -1 ? { s: '', f: '', d: '' } : list[idx];
        if (!item) return;
        document.getElementById('modalTitle').innerText = idx === -1 ? `Add ${type === 'sub' ? 'Subject' : 'Teacher'}` : `Edit Entry`;
        document.getElementById('modalShort').value = item.s || '';
        document.getElementById('modalFull').value = item.f || '';
        document.getElementById('modalDesig').value = item.d || '';
        document.getElementById('regModal').style.display = 'flex';
        document.getElementById('modalDesig').style.display = type === 'tea' ? 'block' : 'none';
    });
}

export function saveRegistry() {
    requireAdmin(() => {
        const s = sanitize(document.getElementById('modalShort').value.toUpperCase().trim());
        const f = sanitize(document.getElementById('modalFull').value.trim());
        const d = sanitize(document.getElementById('modalDesig').value.trim());
        if (!s) return;
        const list = uiState.editingReg.type === 'sub' ? state.registry.subjects : state.registry.teachers;
        if (uiState.editingReg.idx === -1 && list.some(x => x.s === s)) {
            showToast(`Code '${s}' already exists.`, "error");
            return;
        }
        saveStateToHistory();
        const entry = uiState.editingReg.type === 'sub' ? { f, s } : { s, f, d };
        if (uiState.editingReg.idx === -1) list.push(entry);
        else {
            const old = list[uiState.editingReg.idx].s;
            list[uiState.editingReg.idx] = entry;
            state.rules.forEach(r => {
                if (!r) return;
                if (uiState.editingReg.type === 'sub' && r.sub === old) r.sub = s;
                if (uiState.editingReg.type === 'tea' && r.tea === old) r.tea = s;
            });
        }
        saveMainState();
        closeModal('regModal');
        render();
    });
}

export function deleteRegistry(e, type, idx) {
    e.stopPropagation();
    requireAdmin(() => {
        const list = type === 'sub' ? state.registry.subjects : state.registry.teachers;
        const item = list[idx];
        if (!item) return;
        if (confirm(`WARNING: Delete ${item.s}? It will be permanently removed from all active assignments in the grid.`)) {
            saveStateToHistory();
            state.rules.forEach(r => {
                if (!r) return;
                if (type === 'sub' && r.sub === item.s) r.sub = '';
                if (type === 'tea' && r.tea === item.s) r.tea = '';
            });
            if (type === 'tea') {
                adjustState.absent = adjustState.absent.filter(x => x !== item.s);
                Object.keys(adjustState.covers).forEach(k => {
                    if (adjustState.covers[k] === item.s) delete adjustState.covers[k];
                });
            }
            list.splice(idx, 1);
            saveMainState();
            render();
            showToast(`${item.s} deleted.`, "info");
        }
    });
}

/* REPORT MODAL */
export function openReportModal() {
    document.getElementById('reportModal').style.display = 'flex';
    updateReportTargets();
}

export function closeReportModal() {
    document.getElementById('reportModal').style.display = 'none';
}

export function updateReportTargets() {
    const type = document.getElementById('repType').value;
    const target = document.getElementById('repTarget');
    if (type === 'matrix') {
        target.innerHTML = '<option value="ALL">All Classes (Single Page)</option>';
        target.disabled = true;
    } else {
        target.disabled = false;
        target.innerHTML = '<option value="ALL">All (Batch Print)</option>';
        if (type === 'class') {
            state.classes.forEach(c => target.innerHTML += `<option value="${sanitize(c.name)}">${sanitize(c.name)}</option>`);
        } else {
            state.registry.teachers.forEach(t => target.innerHTML += `<option value="${sanitize(t.s)}">${sanitize(t.f)} (${sanitize(t.s)})</option>`);
        }
    }
}

export function executePrintReport() {
    const type = document.getElementById('repType').value;
    const target = document.getElementById('repTarget').value;
    const layout = document.getElementById('reportLayout');
    layout.innerHTML = '';

    if (type === 'class') generateClassReports(target, layout);
    else if (type === 'teacher') generateTeacherReports(target, layout);
    else if (type === 'matrix') generateMatrixReport(layout);

    setPrintOrientation('landscape');

    const origTitle = document.title;
    if (type === 'class') document.title = target === 'ALL' ? "Class Timetables" : "Class Timetable - " + target;
    else if (type === 'teacher') document.title = target === 'ALL' ? "Teacher Timetables" : "Teacher Timetable - " + target;
    else if (type === 'matrix') document.title = "Master Matrix Report";

    layout.classList.add('is-printing');
    window.print();
    layout.classList.remove('is-printing');

    document.title = origTitle;
    closeReportModal();
}
