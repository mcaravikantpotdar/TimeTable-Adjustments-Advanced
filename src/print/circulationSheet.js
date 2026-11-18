import { DAY_NAMES } from '../config/constants.js';
import { state, adjustState, getFullSub, getFullTea } from '../state/store.js';
import { sanitize, formatTime, setPrintOrientation } from '../utils/helpers.js';
import { getRuleDetails } from '../core/clashEngine.js';

export function printCirculation() {
    setPrintOrientation('portrait');
    const layout = document.getElementById('printLayout');

    const [pY, pM, pD] = adjustState.dateStr.split('-');
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const dateStrClean = `${parseInt(pD)} ${months[parseInt(pM) - 1]} ${pY} (${DAY_NAMES[adjustState.dayIndex].toUpperCase()})`;

    let affected = [];
    state.rules.forEach(r => {
        if (r.days[adjustState.dayIndex] && adjustState.absent.includes(r.tea)) {
            const det = getRuleDetails(r);
            if (det) affected.push({ ...r, ...det });
        }
    });
    affected.sort((a, b) => a.s - b.s);
    let rowsHtml = '';
    affected.forEach(aff => {
        const subObj = adjustState.covers[aff.id] ? state.registry.teachers.find(t => t.s === adjustState.covers[aff.id]) : null;
        const absObj = state.registry.teachers.find(t => t.s === aff.tea);
        rowsHtml += `<tr>
            <td>${subObj ? `<b>${sanitize(subObj.f)}</b><span class="print-sub-text">${sanitize(subObj.d) || ''}</span>` : `<span style="color:#ef4444;">UNASSIGNED</span>`}</td>
            <td><b>${sanitize(aff.pName)}</b><span class="print-sub-text">${formatTime(aff.s)} - ${formatTime(aff.e)}</span></td>
            <td>${sanitize(aff.class)}</td><td>${getFullSub(aff.sub)}</td>
            <td>${absObj ? `<b>${sanitize(absObj.f)}</b><span class="print-sub-text">${sanitize(absObj.d) || ''}</span>` : getFullTea(aff.tea)}</td>
            <td><div class="print-sig"></div></td></tr>`;
    });
    layout.innerHTML = `<div class="print-header">Daily Substitution Sheet</div><div class="print-meta"><div>DATE: <span style="font-weight:400;">${dateStrClean}</span></div><div>ABSENT TEACHERS: <span style="color:#ef4444;font-weight:400;">${adjustState.absent.map(s => getFullTea(s)).join(', ')}</span></div></div><table class="print-table"><thead><tr><th>Substitute</th><th>Period & Time</th><th>Class</th><th>Subject</th><th>Absent</th><th>Signature</th></tr></thead><tbody>${rowsHtml}</tbody></table>`;

    const origTitle = document.title;
    document.title = "Daily Substitution Sheet - " + dateStrClean;

    layout.classList.add('is-printing');
    window.print();
    layout.classList.remove('is-printing');

    document.title = origTitle;
}
