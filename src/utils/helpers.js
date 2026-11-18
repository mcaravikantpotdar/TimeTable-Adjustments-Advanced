import { PX_PER_MIN } from '../config/constants.js';

export const sanitize = (str) => {
    if (!str) return '';
    let cleanStr = str.replace(/[\u2022\u25AA\u2043\u2219\t]/g, '');
    cleanStr = cleanStr.replace(/^[\s*\-_#]+|[\s*\-_#]+$/g, '');
    const temp = document.createElement('div');
    temp.textContent = cleanStr.trim();
    return temp.innerHTML.replace(/'/g, "&#39;").replace(/"/g, "&quot;");
};

export const minToPx = (m) => m * PX_PER_MIN;

export const formatTime = (m) => {
    const h = Math.floor(m / 60) % 12 || 12;
    const mins = m % 60;
    const p = m >= 720 ? 'PM' : 'AM';
    return `${h}:${String(mins).padStart(2, '0')}${p}`;
};

export const timeToMin = (t) => {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
};

export const minToTime = (m) => {
    const h = Math.floor(m / 60);
    const mins = m % 60;
    return `${String(h).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

export const generateId = (prefix) => prefix + Date.now() + Math.random().toString(36).substring(2, 6);

export function setPrintOrientation(orient) {
    let s = document.getElementById('printPageStyle');
    if (!s) {
        s = document.createElement('style');
        s.id = 'printPageStyle';
        document.head.appendChild(s);
    }
    s.innerHTML = orient === 'landscape'
        ? '@page { size: landscape; margin: 10mm; }'
        : '@page { size: A4 portrait; margin: 15mm; }';
}
