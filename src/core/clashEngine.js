import { DAY_NAMES } from '../config/constants.js';
import { state } from '../state/store.js';

export function isOverlapping(s1, e1, s2, e2) {
    return (Number(s1) < Number(e2) && Number(e1) > Number(s2));
}

export function getRuleDetails(r) {
    if (!r) return null;
    const cls = state.classes.find(c => c.name === r.class);
    if (!cls || !cls.tier) return null;

    const tierBlueprint = state.blueprints[cls.tier];
    if (!tierBlueprint || !Array.isArray(tierBlueprint)) return null;

    const p = tierBlueprint.find(x => x.id === r.periodId);

    if (!p || p.s === undefined || p.e === undefined) {
        console.warn(`Data Linkage Breakup: Rule ${r.id} points to an invalid period mapping (${r.periodId}).`);
        return { clsTier: cls.tier, pName: "UNKNOWN", s: 0, e: 0 };
    }
    return { clsTier: cls.tier, pName: p.n, s: Number(p.s), e: Number(p.e) };
}

export function auditClashes() {
    let clashMap = {};
    let count = 0;
    if (!state.rules || !state.classes || !state.blueprints) return { map: clashMap, count };
    state.rules.forEach(r => {
        if (!r || !r.days) return;
        const rDet = getRuleDetails(r);
        if (!rDet) return;
        r.days.forEach((isActive, dIdx) => {
            if (!isActive) return;
            state.rules.forEach(other => {
                if (!other || r.id === other.id || !other.days || !other.days[dIdx]) return;
                if (r.sub === 'CCA' && other.sub === 'CCA' && r.class !== other.class) return;

                const oDet = getRuleDetails(other);
                if (!oDet) return;

                if (rDet.s < oDet.e && rDet.e > oDet.s) {
                    let msg = null;
                    if (r.tea && other.tea && r.tea === other.tea) {
                        msg = `&#9888; Double-Booked Teacher: ${r.tea} is also in <b>${other.class}</b> on <b>${DAY_NAMES[dIdx]}</b>.`;
                    }

                    if (msg) {
                        if (!clashMap[r.id]) {
                            clashMap[r.id] = [];
                            count++;
                        }
                        clashMap[r.id].push(msg);
                    }
                }
            });
        });
    });
    for (let id in clashMap) clashMap[id] = [...new Set(clashMap[id])];
    return { map: clashMap, count };
}

export function checkClash(tea, day, clsName, pId, exId) {
    if (!state.classes || !state.blueprints || !state.rules) return false;
    const cls = state.classes.find(c => c.name === clsName);
    if (!cls) return false;
    const p = state.blueprints[cls.tier] && state.blueprints[cls.tier].find(x => x.id === pId);
    if (!p) return false;
    for (let r of state.rules) {
        if (!r || r.id === exId || !r.days || !r.days[day]) continue;
        if (r.sub === 'CCA' && clsName !== r.class) continue;
        const rDet = getRuleDetails(r);
        if (!rDet) continue;
        if (Number(p.s) < Number(rDet.e) && Number(p.e) > Number(rDet.s)) {
            if (tea && r.tea === tea) return true;
        }
    }
    return false;
}

export function checkAbsoluteTimeClash(teaCode, startMin, endMin, dayIdx) {
    return state.rules.some(r => {
        if (r.tea !== teaCode || !r.days[dayIdx]) return false;
        const det = getRuleDetails(r);
        return det && (startMin < det.e && endMin > det.s);
    });
}
