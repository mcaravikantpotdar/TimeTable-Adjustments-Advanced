import { state, uiState } from '../state/store.js';
import { sanitize } from '../utils/helpers.js';
import { checkClash } from '../core/clashEngine.js';

export function showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = msg;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

export function showTooltip(e, txt) {
    const t = document.getElementById('tooltip');
    t.innerHTML = txt;
    t.style.display = 'block';
    updateTooltipPos(e);
}

export function updateTooltipPos(e) {
    const t = document.getElementById('tooltip');
    if (t.style.display === 'block') {
        t.style.left = (e.clientX + 15) + 'px';
        t.style.top = (e.clientY + 15) + 'px';
    }
}

export function hideTooltip() {
    document.getElementById('tooltip').style.display = 'none';
}

export function showNameTooltip(e, shortCode, type) {
    if (!shortCode || !state.registry) return;
    const list = type === 'sub' ? (state.registry.subjects || []) : (state.registry.teachers || []);
    const item = list.find(x => x.s === shortCode);
    if (!item) return;
    let txt = `<b>${sanitize(item.f)}</b>`;
    if (item.d) txt += `<br><span style="color:#94a3b8;font-size:9px;">${sanitize(item.d)}</span>`;
    showTooltip(e, txt);
}

export function handleTeaMouseOver(e, ruleId, teaCode) {
    if (teaCode) {
        showNameTooltip(e, teaCode, 'tea');
    }
    highlightAvailableTeachers(ruleId);
}

export function handleTeaMouseLeave() {
    hideTooltip();
    clearTeacherHighlights();
}

export function highlightAvailableTeachers(ruleId) {
    const rule = state.rules.find(r => r.id === ruleId);
    if (!rule) return;

    let activeDays = [];
    if (rule.days) {
        rule.days.forEach((active, idx) => {
            if (active) activeDays.push(idx);
        });
    }

    state.registry.teachers.forEach(tea => {
        const teaCapsule = document.querySelector(`.pill[data-tea-code="${CSS.escape(tea.s)}"]`);
        if (!teaCapsule) return;

        let hasConflict = false;
        if (activeDays.length > 0) {
            activeDays.forEach(dayIdx => {
                if (checkClash(tea.s, dayIdx, rule.class, rule.periodId, rule.id)) {
                    hasConflict = true;
                }
            });
        }

        if (hasConflict) {
            teaCapsule.classList.add('tea-busy');
            teaCapsule.classList.remove('tea-available');
        } else {
            teaCapsule.classList.add('tea-available');
            teaCapsule.classList.remove('tea-busy');
        }
    });
}

export function clearTeacherHighlights() {
    document.querySelectorAll('.pill[data-tea-code]').forEach(capsule => {
        capsule.classList.remove('tea-available', 'tea-busy');
    });
}

export function showClashTooltip(e, ruleId) {
    if (uiState.currentClashMap[ruleId]) {
        showTooltip(e, uiState.currentClashMap[ruleId].join('<br>'));
    }
}
