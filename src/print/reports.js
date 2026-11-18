import { DAY_NAMES, DEFAULT_SCHOOL_NAME } from '../config/constants.js';
import { state, getFullSub, getFullTea } from '../state/store.js';
import { sanitize, formatTime } from '../utils/helpers.js';
import { showToast } from '../ui/notifications.js';

export function generateClassReports(target, container) {
    let classesToPrint = target === 'ALL' ? state.classes : state.classes.filter(c => c.name === target);
    classesToPrint.forEach((cls) => {
        const bp = (state.blueprints[cls.tier] || []).slice().sort((a, b) => a.s - b.s);
        let usedSubs = new Set(), usedTeas = new Set();

        let html = `<div class="page-break">`;
        html += `<div style="text-align:center; margin-bottom:15px;"><h1 style="font-size:24px; font-weight:900; margin:0; text-transform:uppercase;">${sanitize(state.schoolName || DEFAULT_SCHOOL_NAME)}</h1><h2 style="font-size:14px; font-weight:700; margin:5px 0 0 0; color:#475569; text-transform:uppercase;">CLASS-WISE TIMETABLE: ${sanitize(cls.name)}</h2></div>`;
        html += `<table class="report-table"><thead><tr><th>DAY</th>`;
        bp.forEach(p => {
            html += `<th>${sanitize(p.n)}<br><span style="font-size:8px;font-weight:normal;">${formatTime(p.s)} - ${formatTime(p.e)}</span></th>`;
        });
        html += `</tr></thead><tbody>`;

        for (let d = 0; d < 6; d++) {
            html += `<tr><td><b>${DAY_NAMES[d].substring(0, 3).toUpperCase()}</b></td>`;
            bp.forEach(p => {
                if (p.r) {
                    if (d === 0) html += `<td rowspan="6" class="recess-col">RECESS</td>`;
                } else {
                    let matchingRules = state.rules.filter(r => r.class === cls.name && r.periodId === p.id && r.days[d]);
                    if (matchingRules.length > 0) {
                        html += `<td><div style="display:flex; gap:6px; justify-content:center; align-items:center; min-height:36px;">`;
                        matchingRules.forEach((rule, idx) => {
                            if (rule.sub) usedSubs.add(rule.sub);
                            if (rule.tea) usedTeas.add(rule.tea);
                            let borderStyle = idx < matchingRules.length - 1 ? 'border-right:1px dashed #cbd5e1; padding-right:6px;' : '';
                            html += `<div style="${borderStyle} flex:1; min-width:0; text-align:center;">
                                <b style="font-size:12px; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${sanitize(rule.sub) || '-'}</b>
                                <span style="font-size:9px; color:#475569; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${sanitize(rule.tea) || '-'}</span>
                            </div>`;
                        });
                        html += `</div></td>`;
                    } else {
                        html += `<td style="color:#94a3b8;font-size:10px;">- FREE -</td>`;
                    }
                }
            });
            html += `</tr>`;
        }
        html += `</tbody></table>`;

        let subLeg = Array.from(usedSubs).map(s => `<b>${sanitize(s)}</b>: ${getFullSub(s)}`).join(' | ');
        let teaLeg = Array.from(usedTeas).map(t => `<b>${sanitize(t)}</b>: ${getFullTea(t)}`).join(' | ');
        html += `<div style="margin-top:10px; font-size:9px; border-top:1px solid #000; padding-top:4px; text-align:center;">`;
        if (subLeg) html += `[SUBJECTS] ${subLeg} &nbsp;&nbsp;||&nbsp;&nbsp; `;
        if (teaLeg) html += `[TEACHERS] ${teaLeg}`;
        html += `</div></div>`;

        container.insertAdjacentHTML('beforeend', html);
    });
}

export function generateTeacherReports(target, container) {
    let teachersToPrint = target === 'ALL' ? state.registry.teachers : state.registry.teachers.filter(t => t.s === target);

    teachersToPrint.forEach((tea) => {
        let teaRules = state.rules.filter(r => r.tea === tea.s);
        if (target !== 'ALL' && teaRules.length === 0) {
            showToast(`${tea.f} has no assigned classes.`, "info");
            return;
        }
        if (target === 'ALL' && teaRules.length === 0) return;

        let activeTiers = new Set();
        teaRules.forEach(r => {
            let cls = state.classes.find(c => c.name === r.class);
            if (cls && cls.tier) activeTiers.add(cls.tier);
        });
        if (activeTiers.size === 0) {
            activeTiers.add('junior');
        }

        let totalPeriods = 0, classCounts = {}, subCounts = {};
        let usedSubs = new Set();
        teaRules.forEach(r => {
            r.days.forEach(isActive => {
                if (isActive) {
                    totalPeriods++;
                    classCounts[r.class] = (classCounts[r.class] || 0) + 1;
                    subCounts[r.sub] = (subCounts[r.sub] || 0) + 1;
                    if (r.sub) usedSubs.add(r.sub);
                }
            });
        });

        let clsMeta = Object.entries(classCounts).map(([k, v]) => `${sanitize(k)}(${v})`).join(', ');
        let subMeta = Object.entries(subCounts).map(([k, v]) => `${sanitize(k)}(${v})`).join(', ');

        activeTiers.forEach(tier => {
            let bp = (state.blueprints[tier] || []).slice().sort((a, b) => a.s - b.s);

            let html = `<div class="page-break">`;
            html += `<div style="text-align:center; margin-bottom:15px;">
                        <h1 style="font-size:24px; font-weight:900; margin:0; text-transform:uppercase;">${sanitize(state.schoolName || DEFAULT_SCHOOL_NAME)}</h1>
                        <h2 style="font-size:14px; font-weight:700; margin:5px 0 0 0; color:#475569; text-transform:uppercase;">TEACHER TIMETABLE (${tier.toUpperCase()} TIER): ${sanitize(tea.f)} (${sanitize(tea.d) || 'Teacher'})</h2>
                        <div style="font-size:10px; font-weight:700; color:#64748b; margin-top:4px;">TOTAL WEEKLY PERIODS: ${totalPeriods} &nbsp;|&nbsp; CLASSES: ${clsMeta || 'None'} &nbsp;|&nbsp; SUBJECTS: ${subMeta || 'None'}</div>
                     </div>`;

            html += `<table class="report-table"><thead><tr><th style="width:80px;">DAY</th>`;
            bp.forEach(p => {
                html += `<th>${sanitize(p.n)}<br><span style="font-size:8px;font-weight:normal;">${formatTime(p.s)} - ${formatTime(p.e)}</span></th>`;
            });
            html += `</tr></thead><tbody>`;

            for (let d = 0; d < 6; d++) {
                html += `<tr><td style="font-weight:900; background:#f8fafc;">${DAY_NAMES[d].substring(0, 3).toUpperCase()}</td>`;
                bp.forEach(p => {
                    if (p.r) {
                        if (d === 0) html += `<td rowspan="6" class="recess-col">RECESS</td>`;
                    } else {
                        let matchingRules = state.rules.filter(r => r.tea === tea.s && r.periodId === p.id && r.days[d]);
                        if (matchingRules.length > 0) {
                            html += `<td><div style="display:flex; flex-direction:column; justify-content:center; align-items:center; min-height:36px;">`;
                            matchingRules.forEach((rule, idx) => {
                                let borderStyle = idx < matchingRules.length - 1 ? 'border-b border-dashed border-slate-200 pb-1 mb-1 w-full' : 'w-full';
                                html += `<div class="${borderStyle}">
                                            <b style="font-size:12px; display:block;">${sanitize(rule.class)}</b>
                                            <span style="font-size:10px; color:#2563eb; font-weight:bold; display:block;">${sanitize(rule.sub)}</span>
                                         </div>`;
                            });
                            html += `</div></td>`;
                        } else {
                            html += `<td style="color:#cbd5e1; font-size:11px; font-weight:normal;">-</td>`;
                        }
                    }
                });
                html += `</tr>`;
            }
            html += `</tbody></table>`;

            let subLeg = Array.from(usedSubs).map(s => `<b>${sanitize(s)}</b>: ${getFullSub(s)}`).join(' | ');
            html += `<div style="margin-top:10px; font-size:9px; border-top:1px solid #000; padding-top:4px; text-align:center;">`;
            if (subLeg) html += `[SUBJECTS] ${subLeg}`;
            html += `</div></div>`;

            container.insertAdjacentHTML('beforeend', html);
        });
    });
}
