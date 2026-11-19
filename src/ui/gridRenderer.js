import { DAY_NAMES, DEFAULT_SCHOOL_NAME } from '../config/constants.js';
import { state, adjustState, uiState } from '../state/store.js';
import { sanitize, minToPx, formatTime, generateId } from '../utils/helpers.js';
import { saveStateToHistory } from '../state/history.js';
import { saveMainState } from '../state/storage.js';
import { requireAdmin } from '../state/auth.js';
import { auditClashes, checkClash } from '../core/clashEngine.js';
import { calculateWorkload } from '../core/workloadEngine.js';
import { hideTooltip, showNameTooltip, showToast } from './notifications.js';

export function toggleSidebar(e, id) {
    e.stopPropagation();
    document.getElementById(id).classList.toggle('collapsed');
}

export function expandSidebar(e, id) {
    const el = document.getElementById(id);
    if (el.classList.contains('collapsed')) el.classList.remove('collapsed');
}

export function updateSchoolName(val) {
    requireAdmin(() => {
        state.schoolName = val || DEFAULT_SCHOOL_NAME;
        saveStateToHistory();
        saveMainState();
    });
}

export function wipeClear() {
    requireAdmin(() => {
        if (confirm("DANGER: Wipe all schedule assignments? (Classes, Teachers, and Subjects will remain intact)")) {
            saveStateToHistory();
            state.rules = [];
            saveMainState();
            render();
            showToast("Schedule wiped.", "error");
        }
    });
}

export function render() {
    hideTooltip();
    if (!state.rules) state.rules = [];
    if (!state.classes) state.classes = [];
    if (!state.blueprints) state.blueprints = { junior: [], senior: [] };
    if (!state.registry) state.registry = { subjects: [], teachers: [] };

    const snInput = document.getElementById('schoolNameInput');
    if (snInput && state.schoolName) snInput.value = state.schoolName;

    state.rules = state.rules.filter(r => r && r.class && r.periodId);

    state.classes.sort((a, b) => {
        const pA = parseInt(a.name) || 999;
        const pB = parseInt(b.name) || 999;
        return (a.tier || '') === (b.tier || '') ? pA - pB : ((a.tier || '') === 'junior' ? -1 : 1);
    });
    Object.keys(state.blueprints).forEach(tier => {
        if (Array.isArray(state.blueprints[tier])) {
            state.blueprints[tier].sort((a, b) => (a.s || 0) - (b.s || 0));
        }
    });

    const audit = auditClashes();
    uiState.currentClashMap = audit.map;
    const banner = document.getElementById('clashBanner');
    if (audit.count > 0) {
        banner.style.display = 'block';
        banner.innerHTML = `⚠️ ${audit.count} Schedule Conflicts Detected. Hover over orange Day Pills for details.`;
    } else {
        banner.style.display = 'none';
    }

    renderSidebar();
    const grid = document.getElementById('mainGrid');
    grid.innerHTML = '';
    let currentTier = null;
    state.classes.forEach(cls => {
        if (!cls || !cls.tier) return;
        if (cls.tier !== currentTier) {
            currentTier = cls.tier;
            grid.appendChild(createHeader(currentTier));
        }
        grid.appendChild(createRow(cls, audit.map));
    });
    if (!state.classes.some(c => c.tier === 'junior')) grid.appendChild(createHeader('junior'));
    if (!state.classes.some(c => c.tier === 'senior')) grid.appendChild(createHeader('senior'));
    saveMainState();
}

export function renderSidebar() {
    const workload = calculateWorkload();
    const sPool = document.getElementById('subPool');
    const tPool = document.getElementById('teaPool');
    sPool.innerHTML = '';
    tPool.innerHTML = '';

    const sortedSubs = [...state.registry.subjects].sort((a, b) => a.s.localeCompare(b.s));
    const sortedTeas = [...state.registry.teachers].sort((a, b) => a.s.localeCompare(b.s));

    sortedSubs.forEach((v) => {
        const originalIdx = state.registry.subjects.indexOf(v);
        sPool.appendChild(createSidePill('sub', v, originalIdx, workload.sub[v.s] || 0));
    });
    sortedTeas.forEach((v) => {
        const originalIdx = state.registry.teachers.indexOf(v);
        tPool.appendChild(createSidePill('tea', v, originalIdx, workload.tea[v.s] || 0));
    });
}

function createSidePill(type, item, idx, count) {
    const d = document.createElement('div');
    d.className = 'pill';
    d.draggable = true;
    if (type === 'tea') d.setAttribute('data-tea-code', item.s);
    const cleanShort = sanitize(item.s);
    const cleanDesig = item.d ? sanitize(item.d) : '';
    const desigHtml = cleanDesig ? `<span class="text-[8px] font-normal opacity-50 block leading-tight truncate w-20">${cleanDesig}</span>` : '';
    d.innerHTML = `<div><span>${cleanShort}</span>${desigHtml}</div><div class="flex gap-2 items-center"><span class="pill-count">${count}</span><i class="icon-btn text-indigo-600 hover:text-indigo-900" onclick="openRegModal('${type}', ${idx})">✎</i><i class="icon-btn text-rose-600 hover:text-rose-900" onclick="deleteRegistry(event, '${type}', ${idx})">🗑</i></div>`;
    d.ondragstart = () => uiState.dragged = { type, val: item.s };
    d.onmouseover = (e) => showNameTooltip(e, item.s, type);
    d.onmouseleave = hideTooltip;
    return d;
}

function createHeader(tier) {
    const row = document.createElement('div');
    row.className = 'period-header architect-row';
    row.innerHTML = `<div class="label-box bg-slate-900 border-r-4 border-black text-[10px] text-white flex justify-between px-3 box-border" style="width: var(--label-width)"><span>${(tier || '').toUpperCase()} TIER</span><button onclick="openClsModal(null, '${tier}')" class="text-white hover:text-indigo-300 font-black text-lg leading-none" title="Add Class to Tier">+</button></div>`;
    if (state.blueprints && Array.isArray(state.blueprints[tier])) {
        state.blueprints[tier].forEach(p => {
            const div = document.createElement('div');
            div.className = 'p-block';
            div.style.width = minToPx((p.e || 0) - (p.s || 0)) + 'px';
            div.innerHTML = `${sanitize(p.n)} <span>${formatTime(p.s || 0)}-${formatTime(p.e || 0)}</span><div class="hover-actions bg-black/60 p-1 rounded backdrop-blur"><i class="icon-btn text-white" onclick="openPerModal('${p.id}', '${tier}')">✎</i><i class="icon-btn text-red-400" onclick="deletePeriod('${p.id}', '${tier}')">🗑</i></div>`;
            row.appendChild(div);
        });
    }
    const tierAdd = document.createElement('div');
    tierAdd.className = 'flex items-center px-4 cursor-pointer hover:bg-white/10 flex-shrink-0';
    tierAdd.innerHTML = `<span onclick="openPerModal(null, '${tier}')" class="text-xl font-black">+</span>`;
    row.appendChild(tierAdd);
    return row;
}

function createRow(cls, clashMap) {
    const row = document.createElement('div');
    row.className = 'architect-row';
    const safeClassName = sanitize(cls.name);
    row.innerHTML = `<div class="label-box relative" data-class-name="${safeClassName}">${safeClassName}<div class="hover-actions"><i class="icon-btn text-indigo-600" onclick="openClsModal('${safeClassName}', '${cls.tier}')">✎</i><i class="icon-btn text-rose-600" onclick="deleteClass('${safeClassName}')">🗑</i></div></div>`;
    if (state.blueprints && Array.isArray(state.blueprints[cls.tier])) {
        state.blueprints[cls.tier].forEach(p => {
            const cell = document.createElement('div');
            const width = minToPx((p.e || 0) - (p.s || 0)) + 'px';
            if (p.r) {
                cell.className = 'recess-block';
                cell.innerText = 'RECESS';
                cell.style.width = width;
            } else {
                cell.className = 'time-slot';
                cell.style.width = width;
                cell.ondragover = e => e.preventDefault();
                cell.ondrop = e => handleGenericDrop(e, cls.name, p.id);

                const slotsForThisPeriod = state.rules ? state.rules.filter(r => r && r.class === cls.name && r.periodId === p.id) : [];
                if (slotsForThisPeriod.length === 0) {
                    const placeholder = document.createElement('div');
                    placeholder.className = 'w-full h-full flex items-center justify-center text-slate-300 font-bold text-xs pointer-events-none opacity-40';
                    placeholder.innerText = 'Empty Slot';
                    cell.appendChild(placeholder);
                } else {
                    slotsForThisPeriod.forEach(rule => {
                        const isClash = clashMap[rule.id];
                        const clashClass = isClash ? 'has-clash' : '';
                        const subEvents = rule.sub ? `onmouseover="showNameTooltip(event, '${rule.sub}', 'sub')" onmouseleave="hideTooltip()"` : '';
                        const teaEvents = `onmouseover="handleTeaMouseOver(event, '${rule.id}', '${rule.tea}')" onmouseleave="handleTeaMouseLeave()"`;
                        const dayEvents = isClash ? `onmouseover="showClashTooltip(event, '${rule.id}')" onmouseleave="hideTooltip()"` : '';
                        const col = document.createElement('div');
                        col.className = `vertical-col ${uiState.activeRuleId === rule.id ? 'active' : ''} ${clashClass}`;
                        col.innerHTML = `<button onclick="deleteSplit(event, '${rule.id}')" class="absolute -top-1.5 -right-1 text-slate-300 hover:text-rose-600 font-black text-xs leading-none z-20 bg-white rounded-full px-0.5 shadow-sm border border-slate-200" title="Remove Split">&times;</button><div class="drop-zone dz-sub ${rule.sub ? 'has-val' : ''}" onclick="clearValue(event, '${rule.id}', 'sub')" ondrop="handleTargetedDrop(event, '${rule.id}', 'sub')" ${subEvents}>${rule.sub ? rule.sub : '<span class="placeholder-text">+ SUB</span>'}</div><div class="drop-zone dz-tea ${rule.tea ? 'has-val' : ''}" onclick="clearValue(event, '${rule.id}', 'tea')" ondrop="handleTargetedDrop(event, '${rule.id}', 'tea')" ${teaEvents}>${rule.tea ? rule.tea : '<span class="placeholder-text">+ TEA</span>'}</div><div class="drop-zone dz-day ${(rule.days || []).some(d => d) ? 'has-val' : ''}" onclick="toggleStrip(event, '${rule.id}')" ${dayEvents}>(${getDayLabel(rule.days || [])})</div>`;
                        if (uiState.activeRuleId === rule.id) col.appendChild(createDayStrip(rule));
                        cell.appendChild(col);
                    });
                }
                const plus = document.createElement('div');
                plus.className = 'add-split';
                plus.innerText = '+';
                plus.ondrop = e => {
                    e.stopPropagation();
                    handleGenericDrop(e, cls.name, p.id);
                };
                cell.appendChild(plus);
            }
            row.appendChild(cell);
        });
    }
    return row;
}

export function handleGenericDrop(e, cls, pId) {
    e.preventDefault();
    const item = uiState.dragged;
    if (!item) return;
    requireAdmin(() => {
        saveStateToHistory();
        const cleanVal = item.val ? item.val.trim() : '';

        let existingRule = state.rules.find(r => r.class === cls && r.periodId === pId &&
            ((!r.sub && !r.tea) || (item.type === 'tea' && !r.tea) || (item.type === 'sub' && !r.sub))
        );

        if (existingRule) {
            if (item.type === 'sub') existingRule.sub = cleanVal;
            else existingRule.tea = cleanVal;
            uiState.activeRuleId = existingRule.id;
        } else {
            const rid = generateId('r');
            const nr = {
                id: rid,
                class: cls,
                periodId: pId,
                sub: item.type === 'sub' ? cleanVal : '',
                tea: item.type === 'tea' ? cleanVal : '',
                days: [false, false, false, false, false, false]
            };
            state.rules.push(nr);
            uiState.activeRuleId = rid;
        }
        saveMainState();
        render();
    });
}

export function handleTargetedDrop(e, rid, type) {
    e.preventDefault();
    e.stopPropagation();
    const item = uiState.dragged;
    if (!item || item.type !== type) return;
    requireAdmin(() => {
        const r = state.rules.find(x => x.id === rid);
        if (!r) return;
        const cleanVal = item.val ? item.val.trim() : '';

        if (type === 'tea') {
            for (let i = 0; i < 6; i++) {
                if (r.days && r.days[i] && checkClash(cleanVal, i, r.class, r.periodId, r.id)) {
                    showToast(`⚠️ Rejection: Clash detected on ${DAY_NAMES[i]} for this slot.`, 'error');
                    return;
                }
            }
        }
        saveStateToHistory();

        const activeDaysCount = r.days.filter(d => d).length;
        if (activeDaysCount > 1 && adjustState.dayIndex !== -1) {
            const dIdx = adjustState.dayIndex;
            if (r.days[dIdx]) {
                r.days[dIdx] = false;
                const splitId = generateId('r');
                const splitRule = JSON.parse(JSON.stringify(r));
                splitRule.id = splitId;
                splitRule.days = [false, false, false, false, false, false];
                splitRule.days[dIdx] = true;
                splitRule[type] = cleanVal;
                state.rules.push(splitRule);
                saveMainState();
                render();
                return;
            }
        }

        r[type] = cleanVal;
        saveMainState();
        render();
    });
}

export function clearValue(e, rid, type) {
    e.stopPropagation();
    requireAdmin(() => {
        saveStateToHistory();
        const r = state.rules.find(x => x.id === rid);
        if (r) {
            r[type] = '';
            if (!r.sub.trim() && !r.tea.trim()) {
                state.rules = state.rules.filter(x => x.id !== rid);
                if (uiState.activeRuleId === rid) uiState.activeRuleId = null;
            }
        }
        saveMainState();
        render();
    });
}

export function deleteSplit(e, rid) {
    e.stopPropagation();
    requireAdmin(() => {
        saveStateToHistory();
        state.rules = state.rules.filter(r => r.id !== rid);
        if (uiState.activeRuleId === rid) uiState.activeRuleId = null;
        saveMainState();
        render();
    });
}

export function getDayLabel(days) {
    const active = [];
    days.forEach((d, i) => {
        if (d) active.push(i + 1);
    });
    if (active.length === 0) return "0";
    const isContinuous = active.every((val, i) => i === 0 || val === active[i - 1] + 1);
    if (isContinuous && active.length > 1) return `${active[0]}-${active[active.length - 1]}`;
    return active.join(',');
}

function createDayStrip(rule) {
    const strip = document.createElement('div');
    strip.className = 'day-strip';
    strip.onclick = (e) => e.stopPropagation();
    const allSelected = (rule.days || []).every(d => d);
    strip.innerHTML += `<div class="day-toggle master ${allSelected ? 'selected' : ''}" onclick="toggleAllDays(event, '${rule.id}', ${allSelected})">1-6</div>`;
    ["M", "T", "W", "T", "F", "S"].forEach((d, i) => {
        const isClash = checkClash(rule.tea, i, rule.class, rule.periodId, rule.id);
        strip.innerHTML += `<div class="day-toggle ${(rule.days || [])[i] ? 'selected' : ''} ${isClash ? 'clash' : ''}" onclick="toggleDay(event, '${rule.id}', ${i}, ${isClash})">${d}</div>`;
    });
    return strip;
}

export function toggleAllDays(e, rid, currentlyAll) {
    e.stopPropagation();
    requireAdmin(() => {
        saveStateToHistory();
        const r = state.rules.find(x => x.id === rid);
        if (!r) return;
        if (currentlyAll) {
            r.days = [false, false, false, false, false, false];
        } else {
            for (let i = 0; i < 6; i++) {
                if (!checkClash(r.tea, i, r.class, r.periodId, r.id)) r.days[i] = true;
            }
        }
        saveMainState();
        render();
    });
}

export function toggleStrip(e, id) {
    e.stopPropagation();
    uiState.activeRuleId = (uiState.activeRuleId === id) ? null : id;
    render();
}

export function toggleDay(e, rid, idx, clash) {
    e.stopPropagation();
    requireAdmin(() => {
        const r = state.rules.find(x => x.id === rid);
        if (!r || !r.days) return;
        if (clash && !r.days[idx]) {
            showToast("Cannot assign: Clash detected.", "error");
            return;
        }
        saveStateToHistory();
        r.days[idx] = !r.days[idx];
        saveMainState();
        render();
    });
}

export function closeAllStrips(e) {
    if (!e.target.closest('.day-strip') && !e.target.closest('.dz-day')) {
        if (uiState.activeRuleId !== null) {
            uiState.activeRuleId = null;
            render();
        }
    }
}
