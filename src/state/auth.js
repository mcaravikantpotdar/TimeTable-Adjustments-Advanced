import { showToast } from '../ui/notifications.js';

// SHA-256 hex hash for default PIN "2026"
// To set a custom PIN, hash your PIN with SHA-256 and replace this value.
const ADMIN_PIN_HASH = 'b3a8e0e1f9ab1bfe3a36f231f676f78bb30a519d2b21e6c530c0eee8ebb4a5d0';
const SESSION_KEY = 'architect_admin_auth_v1';

let pendingAction = null;

export function isAdminUnlocked() {
    return sessionStorage.getItem(SESSION_KEY) === 'true';
}

export function updateAuthBadge() {
    const unlocked = isAdminUnlocked();
    const badge = document.getElementById('authStatusBtn');
    if (!badge) return;
    if (unlocked) {
        badge.textContent = '🔓 ADMIN UNLOCKED';
        badge.className = 'bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-xl text-[10px] font-black hover:bg-emerald-100 transition cursor-pointer';
        badge.title = 'Click to lock editing';
    } else {
        badge.textContent = '🔒 READ-ONLY';
        badge.className = 'bg-slate-100 text-slate-600 border border-slate-300 px-3 py-1.5 rounded-xl text-[10px] font-black hover:bg-slate-200 transition cursor-pointer';
        badge.title = 'Click to unlock admin editing';
    }
    document.body.classList.toggle('is-locked', !unlocked);
}

export function handleAuthButtonClick() {
    if (isAdminUnlocked()) {
        sessionStorage.removeItem(SESSION_KEY);
        updateAuthBadge();
        showToast('Session locked (Read-Only mode).', 'info');
    } else {
        openAuthModal(null);
    }
}

export function openAuthModal(afterUnlockFn = null) {
    pendingAction = typeof afterUnlockFn === 'function' ? afterUnlockFn : null;
    const modal = document.getElementById('authModal');
    const input = document.getElementById('authPinInput');
    const errEl = document.getElementById('authError');
    if (errEl) errEl.textContent = '';
    if (input) {
        input.value = '';
        modal.style.display = 'flex';
        setTimeout(() => input.focus(), 50);
    }
}

export function closeAuthModal() {
    pendingAction = null;
    const modal = document.getElementById('authModal');
    if (modal) modal.style.display = 'none';
}

async function hashPin(pin) {
    if (window.crypto && window.crypto.subtle) {
        const enc = new TextEncoder().encode(pin);
        const buf = await window.crypto.subtle.digest('SHA-256', enc);
        return Array.from(new Uint8Array(buf))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }
    return null;
}

export async function submitAuthPin() {
    const input = document.getElementById('authPinInput');
    const errEl = document.getElementById('authError');
    const rawPin = (input ? input.value : '').trim();
    if (!rawPin) {
        if (errEl) errEl.textContent = 'Please enter the admin PIN.';
        return;
    }

    const digest = await hashPin(rawPin);
    const valid = digest ? (digest === ADMIN_PIN_HASH) : (rawPin === '2026');

    if (valid) {
        sessionStorage.setItem(SESSION_KEY, 'true');
        updateAuthBadge();
        const fn = pendingAction;
        closeAuthModal();
        showToast('Admin access granted.', 'success');
        if (fn) fn();
    } else {
        if (errEl) errEl.textContent = 'Incorrect PIN. Try again.';
        if (input) {
            input.value = '';
            input.focus();
        }
    }
}

export function requireAdmin(actionFn) {
    if (isAdminUnlocked()) {
        return actionFn();
    }
    openAuthModal(actionFn);
    return false;
}
