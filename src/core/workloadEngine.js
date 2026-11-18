import { state, adjustState } from '../state/store.js';

export function calculateWorkload() {
    let c = { sub: {}, tea: {} };
    if (!state.rules) return c;
    state.rules.forEach(r => {
        if (!r) return;
        const n = (r.days || []).filter(d => d).length;
        if (r.sub) c.sub[r.sub] = (c.sub[r.sub] || 0) + n;
        if (r.tea) c.tea[r.tea] = (c.tea[r.tea] || 0) + n;
    });
    return c;
}

export function getLiveTeacherLoad(teaCode) {
    let masterLoad = 0;
    state.rules.forEach(r => {
        if (r.tea === teaCode && r.days[adjustState.dayIndex]) masterLoad++;
    });
    let coverLoad = Object.values(adjustState.covers).filter(v => v === teaCode).length;
    return masterLoad + coverLoad;
}
