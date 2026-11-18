import { state, adjustState, getFullSub, getFullTea } from '../state/store.js';
import { sanitize, formatTime } from '../utils/helpers.js';
import { getRuleDetails, checkAbsoluteTimeClash, isOverlapping } from '../core/clashEngine.js';
import { getLiveTeacherLoad } from '../core/workloadEngine.js';
import { showToast } from './notifications.js';

export function openAdjustments() {
    document.getElementById('adjModal').style.display = 'flex';
    goToSetupView();
    renderAdjTeachers();
}

export function closeAdjustments() {
    document.getElementById('adjModal').style.display = 'none';
}

export function goToSetupView() {
    document.getElementById('adjView1').style.display = 'block';
    document.getElementById('adjView2').style.display = 'none';
}

export function goToAssignView() {
    if (adjustState.dayIndex === -1) {
        showToast("Selected date is a Sunday/Invalid.", "error");
        return;
    }
    if (adjustState.absent.length === 0) {
        showToast("Please select at least one absent teacher.", "error");
        return;
    }
    document.getElementById('adjView1').style.display = 'none';
    document.getElementById('adjView2').style.display = 'flex';
    renderAdjBoard();
}

export function renderAdjTeachers() {
    const dateVal = document.getElementById('adjDate').value;
    if (!dateVal) return;

    if (adjustState.dateStr !== dateVal) {
        adjustState.dateStr = dateVal;
        const savedAbsent = localStorage.getItem(`architect_absent_${dateVal}`);
        adjustState.absent = savedAbsent ? JSON.parse(savedAbsent) : [];

        const savedCovers = localStorage.getItem(`architect_covers_${dateVal}`);
        adjustState.covers = savedCovers ? JSON.parse(savedCovers) : {};
    }

    const [y, m, d] = dateVal.split('-').map(Number);
    const jsDay = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    adjustState.dayIndex = jsDay === 0 ? -1 : jsDay - 1;

    const grid = document.getElementById('adjTeaGrid');
    grid.innerHTML = '';
    state.registry.teachers.forEach(t => {
        const isAbs = adjustState.absent.includes(t.s);
        const card = document.createElement('div');
        card.className = `absent-card ${isAbs ? 'is-absent' : ''}`;
        card.innerHTML = `<div class="font-black text-base mb-1">${sanitize(t.f)}</div><div class="text-[10px] font-bold opacity-60 uppercase tracking-wide">[${sanitize(t.d) || 'No Desig'}]</div>`;
        card.onclick = () => {
            if (isAbs) adjustState.absent = adjustState.absent.filter(x => x !== t.s);
            else adjustState.absent.push(t.s);
            localStorage.setItem(`architect_absent_${adjustState.dateStr}`, JSON.stringify(adjustState.absent));
            renderAdjTeachers();
        };
        grid.appendChild(card);
    });
}

export function highlightAdjSubs(startMin, endMin) {
    const dayIdx = adjustState.dayIndex;
    state.registry.teachers.forEach(t => {
        if (adjustState.absent.includes(t.s)) return;
        const pill = document.querySelector(`.sub-pill[data-substitute-code="${CSS.escape(t.s)}"]`);
        if (!pill) return;

        let isBusy = checkAbsoluteTimeClash(t.s, startMin, endMin, dayIdx);
        if (!isBusy) {
            Object.entries(adjustState.covers).forEach(([rId, sCode]) => {
                if (sCode === t.s) {
                    const cr = state.rules.find(x => x.id === rId);
                    if (cr) {
                        const d = getRuleDetails(cr);
                        if (d && isOverlapping(startMin, endMin, d.s, d.e)) isBusy = true;
                    }
                }
            });
        }

        if (isBusy) {
            pill.classList.add('tea-busy');
            pill.classList.remove('tea-available');
        } else {
            pill.classList.add('tea-available');
            pill.classList.remove('tea-busy');
        }
    });
}

export function clearAdjSubsHighlight() {
    document.querySelectorAll('.sub-pill').forEach(pill => {
        pill.classList.remove('tea-available', 'tea-busy');
    });
}

export function renderAdjBoard() {
    const list = document.getElementById('adjPeriodsList');
    list.innerHTML = '';
    const subsPanel = document.getElementById('adjSubsList');
    subsPanel.innerHTML = '';
    let affected = [];
    state.rules.forEach(r => {
        const isMasterAbsent = adjustState.absent.includes(r.tea);
        const assignedCover = adjustState.covers[r.id];
        const isCoverAbsent = assignedCover && adjustState.absent.includes(assignedCover);

        if (r.days[adjustState.dayIndex] && (isMasterAbsent || isCoverAbsent)) {
            if (isCoverAbsent) delete adjustState.covers[r.id];
            const det = getRuleDetails(r);
            if (det) affected.push({ ruleId: r.id, class: r.class, sub: r.sub, tea: r.tea, ...det });
        }
    });
    affected.sort((a, b) => a.s - b.s);
    if (affected.length === 0) {
        list.innerHTML = '<div class="text-slate-400 font-black p-4 text-center">No periods affected.</div>';
        return;
    }

    affected.forEach(aff => {
        const isCovered = adjustState.covers[aff.ruleId];
        const box = document.createElement('div');
        box.className = "flex items-center justify-between p-3 border-2 border-slate-200 rounded-xl bg-white";
        box.innerHTML = `<div class="flex-1"><div class="text-sm font-black text-slate-800 mb-1"><span class="text-indigo-600">${sanitize(aff.class)}</span> - ${sanitize(aff.pName)} <span class="text-[10px] font-bold text-slate-400 font-mono">(${formatTime(aff.s)} - ${formatTime(aff.e)})</span></div><div class="text-xs font-bold text-slate-500 uppercase tracking-tight">${getFullSub(aff.sub)} <span class="opacity-50">(Abs: ${getFullTea(aff.tea)})</span></div></div>`;
        if (isCovered) {
            const btn = document.createElement('div');
            btn.className = "adj-filled rounded-lg h-12 flex items-center justify-between font-black text-sm shadow-sm transition min-w-[220px]";
            btn.innerHTML = `<span>${getFullTea(isCovered)} <span class="text-[10px] opacity-60 ml-1 uppercase">(Sub)</span></span> <button onclick="removeCover('${aff.ruleId}')" class="text-white hover:text-rose-200 ml-3 text-lg leading-none">&times;</button>`;
            box.appendChild(btn);
        } else {
            const drop = document.createElement('div');
            drop.className = "adj-drop-zone uppercase text-[10px] tracking-widest";
            drop.innerText = "DROP SUB HERE";
            drop.ondragover = e => {
                e.preventDefault();
                drop.classList.add('drag-over');
                highlightAdjSubs(aff.s, aff.e);
            };
            drop.ondragleave = e => {
                drop.classList.remove('drag-over');
                clearAdjSubsHighlight();
            };
            drop.ondrop = e => {
                e.preventDefault();
                drop.classList.remove('drag-over');
                clearAdjSubsHighlight();
                assignCover(aff.ruleId, adjustState.draggedSub);
            };
            drop.onmouseenter = () => highlightAdjSubs(aff.s, aff.e);
            drop.onmouseleave = () => clearAdjSubsHighlight();
            box.appendChild(drop);
        }
        list.appendChild(box);
    });

    let present = state.registry.teachers.filter(t => !adjustState.absent.includes(t.s)).sort((a, b) => getLiveTeacherLoad(a.s) - getLiveTeacherLoad(b.s));
    present.forEach(t => {
        const pill = document.createElement('div');
        pill.className = "sub-pill";
        pill.draggable = true;
        pill.setAttribute('data-substitute-code', t.s);
        pill.ondragstart = (e) => {
            adjustState.draggedSub = t.s;
            if (e.dataTransfer) {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', t.s);
            }
        };
        pill.innerHTML = `<div><span class="font-black text-xs text-slate-800">${sanitize(t.f)}</span> <span class="text-[9px] text-slate-400 font-bold uppercase block mt-0.5">[${sanitize(t.d) || 'Teacher'}]</span></div> <div class="bg-slate-100 border border-slate-200 text-slate-500 font-black text-[9px] px-2 py-1 rounded">Load: ${getLiveTeacherLoad(t.s)}</div>`;
        subsPanel.appendChild(pill);
    });
    localStorage.setItem(`architect_covers_${adjustState.dateStr}`, JSON.stringify(adjustState.covers));
}

export function assignCover(ruleId, teaCode) {
    if (!teaCode) return;
    const targetRule = state.rules.find(r => r.id === ruleId);
    if (!targetRule) return;
    const tDet = getRuleDetails(targetRule);
    if (!tDet) return;

    let isBusy = checkAbsoluteTimeClash(teaCode, tDet.s, tDet.e, adjustState.dayIndex);
    Object.entries(adjustState.covers).forEach(([rId, sCode]) => {
        if (sCode === teaCode) {
            const d = getRuleDetails(state.rules.find(x => x.id === rId));
            if (d && isOverlapping(tDet.s, tDet.e, d.s, d.e)) isBusy = true;
        }
    });

    if (isBusy) {
        showToast(`⚠️ ${getFullTea(teaCode)} is engaged!`, "error");
        return;
    }
    adjustState.covers[ruleId] = teaCode;
    renderAdjBoard();
}

export function removeCover(ruleId) {
    delete adjustState.covers[ruleId];
    renderAdjBoard();
}

export function clearAllCovers() {
    adjustState.covers = {};
    renderAdjBoard();
    showToast("Substitutes cleared.", "info");
}
