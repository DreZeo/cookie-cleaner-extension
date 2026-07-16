// ========== 通用工具函数 ==========
// 纯域名/匹配类函数统一放在 domain-utils.js，由 popup 与 service worker 共享。
// 此处 re-export 以保留现有 import 路径不被破坏。

export {
    normalizeDomain,
    getDomainCandidates,
    matchesDomain,
    matchesCandidates,
    escapeRegExp,
    urlMatchesCandidates,
    toSafeTimeRangeMs,
    filterHistoryItems
} from './domain-utils.js';

export async function getCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
}

export function getDomain(url) {
    try {
        return new URL(url).hostname;
    } catch {
        return '';
    }
}

export function getOrigin(url) {
    try {
        return new URL(url).origin;
    } catch {
        return '';
    }
}

export function isUnsupportedPageUrl(url) {
    return /^(chrome|chrome-extension|edge|about|moz-extension):/i.test(url || '');
}

export function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

let _toastTimer = 0;

export function showMessage(text, type = 'success') {
    const msg = document.getElementById('message');
    if (!msg) return;
    const icon = msg.querySelector('i');
    const span = msg.querySelector('span');
    const style = getComputedStyle(document.documentElement);
    const successColor = style.getPropertyValue('--success').trim() || '#00ff88';
    const dangerColor = style.getPropertyValue('--danger').trim() || '#ff6b6b';

    if (type === 'success') {
        icon.className = 'fa-solid fa-circle-check';
        msg.style.borderLeft = `4px solid ${successColor}`;
    } else {
        icon.className = 'fa-solid fa-circle-exclamation';
        msg.style.borderLeft = `4px solid ${dangerColor}`;
    }

    span.textContent = text;
    msg.className = `toast show ${type}`;

    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => {
        msg.className = 'toast';
    }, 3000);
}

export function setNodeText(id, text) {
    const node = document.getElementById(id);
    if (node) node.textContent = text;
}
