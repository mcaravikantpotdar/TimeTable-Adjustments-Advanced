import { state, adjustState } from '../state/store.js';
import { getRuleDetails, checkAbsoluteTimeClash, isOverlapping } from './clashEngine.js';
import { getLiveTeacherLoad } from './workloadEngine.js';
import { renderAdjBoard } from '../ui/adjustmentModal.js';
import { showToast } from '../ui/notifications.js';

export function autoAdjust() {
    let affected = [];
    state.rules.forEach(r => {
        const isMasterAbsent = adjustState.absent.includes(r.tea);
        const assignedCover = adjustState.covers[r.id];
        const isCoverAbsent = assignedCover && adjustState.absent.includes(assignedCover);
        if (r.days[adjustState.dayIndex] && (isMasterAbsent || isCoverAbsent)) {
            const det = getRuleDetails(r);
            if (det) affected.push({ ruleId: r.id, ...det });
        }
    });
    affected.sort((a, b) => a.s - b.s);
    let assignmentsMade = 0;

    affected.forEach(aff => {
        if (adjustState.covers[aff.ruleId]) return;
        let available = state.registry.teachers.filter(t => {
            if (adjustState.absent.includes(t.s)) return false;
            let isBusyMaster = checkAbsoluteTimeClash(t.s, aff.s, aff.e, adjustState.dayIndex);
            if (isBusyMaster) return false;
            let isBusyCover = Object.entries(adjustState.covers).some(([rId, subCode]) => {
                if (subCode !== t.s) return false;
                const cr = state.rules.find(x => x.id === rId);
                if (!cr) return false;
                const d = getRuleDetails(cr);
                return d && isOverlapping(aff.s, aff.e, d.s, d.e);
            });
            return !isBusyCover;
        });

        if (available.length === 0) return;

        const isSeniorClass = aff.clsTier === 'senior';
        available.sort((a, b) => {
            const aDesig = (a.d || '').toLowerCase();
            const bDesig = (b.d || '').toLowerCase();
            const aSen = aDesig.includes('lecturer') || aDesig.includes('pgt');
            const bSen = bDesig.includes('lecturer') || bDesig.includes('pgt');
            const aMatch = (isSeniorClass && aSen) || (!isSeniorClass && !aSen);
            const bMatch = (isSeniorClass && bSen) || (!isSeniorClass && !bSen);
            if (aMatch && !bMatch) return -1;
            if (!aMatch && bMatch) return 1;
            return getLiveTeacherLoad(a.s) - getLiveTeacherLoad(b.s);
        });
        adjustState.covers[aff.ruleId] = available[0].s;
        assignmentsMade++;
    });
    renderAdjBoard();
    showToast(assignmentsMade > 0 ? `Assigned ${assignmentsMade} periods.` : "Done. Check unassigned.", "success");
}
