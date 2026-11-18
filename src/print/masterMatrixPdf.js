import { state, getFullSub, getFullTea } from '../state/store.js';
import { sanitize, formatTime } from '../utils/helpers.js';
import { getDayLabel } from '../ui/gridRenderer.js';
import { showToast } from '../ui/notifications.js';

export function generateMatrixReport(container) {
    let S = 9999, E = 0;
    let hasPeriods = false;
    Object.values(state.blueprints).forEach(bp => {
        bp.forEach(p => {
            hasPeriods = true;
            if (Number(p.s) < S) S = Number(p.s);
            if (Number(p.e) > E) E = Number(p.e);
        });
    });
    if (!hasPeriods) {
        showToast("No periods defined.", "error");
        return;
    }
    let T = E - S;
    if (T <= 0) return;

    let html = `<div class="matrix-print-container">`;
    let currentTier = null;
    let sortedClasses = state.classes.slice().sort((a, b) => {
        const pA = parseInt(a.name) || 999;
        const pB = parseInt(b.name) || 999;
        return (a.tier || '') === (b.tier || '') ? pA - pB : ((a.tier || '') === 'junior' ? -1 : 1);
    });

    if (sortedClasses.length === 0) {
        if (state.blueprints.junior && state.blueprints.junior.length) html += renderMatrixHeader('junior', S, T);
        if (state.blueprints.senior && state.blueprints.senior.length) html += renderMatrixHeader('senior', S, T);
    } else {
        sortedClasses.forEach(cls => {
            if (cls.tier !== currentTier) {
                currentTier = cls.tier;
                html += renderMatrixHeader(currentTier, S, T);
            }
            html += renderMatrixRow(cls, S, T);
        });
    }
    html += `</div>`;

    let usedSubs = new Set(), usedTeas = new Set();
    state.rules.forEach(r => {
        if (r.sub) usedSubs.add(r.sub);
        if (r.tea) usedTeas.add(r.tea);
    });
    let subLeg = Array.from(usedSubs).map(s => `<b>${sanitize(s)}</b>: ${getFullSub(s)}`).join(' | ');
    let teaLeg = Array.from(usedTeas).map(t => `<b>${sanitize(t)}</b>: ${getFullTea(t)}`).join(' | ');
    html += `<div style="margin-top:5px; font-size:8px; border-top:1px solid #000; padding-top:2px; text-align:center; line-height:1.2;">`;
    if (subLeg) html += `[SUBJECTS] ${subLeg} &nbsp;&nbsp;||&nbsp;&nbsp; `;
    if (teaLeg) html += `[TEACHERS] ${teaLeg}`;
    html += `</div>`;

    container.innerHTML = html;
}

function renderMatrixHeader(tier, S, T) {
    let bp = state.blueprints[tier] || [];
    if (bp.length === 0) return `<div class="matrix-row matrix-header-row"><div class="matrix-label">${(tier || '').toUpperCase()} TIER</div><div class="matrix-timeline"></div></div>`;

    let html = `<div class="matrix-row matrix-header-row"><div class="matrix-label">${(tier || '').toUpperCase()} TIER</div><div class="matrix-timeline">`;
    bp.forEach(p => {
        let leftP = ((Number(p.s) - S) / T) * 100;
        let widthP = ((Number(p.e) - Number(p.s)) / T) * 100;
        html += `<div class="matrix-block matrix-header-block" style="left:${leftP}%; width:${widthP}%;"><b>${sanitize(p.n)}</b><span style="font-size:7px;font-weight:normal;">${formatTime(p.s)} - ${formatTime(p.e)}</span></div>`;
    });
    html += `</div></div>`;
    return html;
}

function renderMatrixRow(cls, S, T) {
    let html = `<div class="matrix-row"><div class="matrix-label" style="background:#fff !important; font-size:12px;">${sanitize(cls.name)}</div><div class="matrix-timeline">`;
    let bp = state.blueprints[cls.tier] || [];
    bp.forEach(p => {
        let leftP = ((Number(p.s) - S) / T) * 100;
        let widthP = ((Number(p.e) - Number(p.s)) / T) * 100;
        if (p.r) {
            html += `<div class="matrix-block recess" style="left:${leftP}%; width:${widthP}%;">RECESS</div>`;
        } else {
            html += `<div class="matrix-block bg-white" style="left:${leftP}%; width:${widthP}%; display: flex; border-left: 1px solid #000;">`;
            let rulesForPeriod = state.rules.filter(r => r.class === cls.name && r.periodId === p.id && r.days.some(d => d));
            let splits = [];
            rulesForPeriod.forEach(r => {
                if (!r.sub && !r.tea) return;
                splits.push({ sub: r.sub, tea: r.tea, days: getDayLabel(r.days) });
            });

            if (splits.length > 0) {
                const splitCount = splits.length;

                let subSize = '11px', teaSize = '9px', daySize = '9px', tracking = '';
                if (splitCount === 2) {
                    subSize = '9.5px'; teaSize = '8px'; daySize = '8px'; tracking = 'letter-spacing: -0.3px;';
                } else if (splitCount === 3) {
                    subSize = '8px'; teaSize = '7px'; daySize = '7px'; tracking = 'letter-spacing: -0.5px;';
                }

                splits.forEach((sp, idx) => {
                    let br = idx < splits.length - 1 ? 'border-right: 1px solid #000;' : '';

                    if (splitCount > 3) {
                        html += `<div style="flex:1; ${br} display:flex; align-items:center; justify-content:center; padding: 2px 0px; box-sizing: border-box; min-width: 0; overflow:hidden;">
                            <div style="font-size: 10px; font-weight: 900; color: #000; writing-mode: vertical-rl; transform: rotate(180deg); white-space: nowrap; text-align: center; font-family: 'Inter Tight', sans-serif;">
                                ${sanitize(sp.sub) || '-'} <span style="background: #e2e8f0; padding: 2px 4px; border-radius: 4px; border: 1px solid #cbd5e1; margin: 2px 0; display: inline-block;">${sanitize(sp.tea) || '-'}</span> (${sp.days})
                            </div>
                        </div>`;
                    } else {
                        html += `<div style="flex:1; ${br} display:flex; flex-direction:column; align-items:center; justify-content:center; overflow:hidden; padding: 1px 0px; box-sizing: border-box; min-width:0;">
                            <b style="font-size:${subSize}; line-height:1; color:#000; text-align:center; width:100%; white-space:nowrap; overflow:hidden; ${tracking}">${sanitize(sp.sub) || '-'}</b>
                            <span style="font-size:${teaSize}; color:#000; line-height:1.1; font-weight:900; text-align:center; white-space:nowrap; overflow:hidden; background: #e2e8f0; padding: 1px 2px; border-radius: 3px; border: 1px solid #cbd5e1; margin: 1px 0; display: inline-block; max-width: 95%; ${tracking}">${sanitize(sp.tea) || '-'}</span>
                            <span style="font-size:${daySize}; color:#000; line-height:1; font-weight:900; text-align:center; width:100%; white-space:nowrap; overflow:hidden; ${tracking}">(${sp.days})</span>
                        </div>`;
                    }
                });
            } else {
                html += `<div class="w-full h-full flex items-center justify-center text-[9px] text-slate-300 font-bold">-</div>`;
            }
            html += `</div>`;
        }
    });
    html += `</div></div>`;
    return html;
}
