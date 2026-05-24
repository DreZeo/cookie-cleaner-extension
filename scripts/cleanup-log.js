import { CLEANUP_ACTION_TEXT_KEYS } from './constants.js';
import { escapeHtml, normalizeDomain } from './utils.js';
import { t, getCurrentLanguage } from './i18n.js';
import { appendCleanupLogEntry, listCleanupLogs } from './bridge.js';

let cleanupLogCache = [];
let cleanupLogFilter = 'all';

export function getCleanupActionText(actionType) {
    const key = CLEANUP_ACTION_TEXT_KEYS[actionType] || CLEANUP_ACTION_TEXT_KEYS.unknown;
    return t(key);
}

function formatLogTime(timestamp) {
    const safeTs = Number(timestamp);
    if (!Number.isFinite(safeTs) || safeTs <= 0) return '-';
    try {
        const formatter = new Intl.DateTimeFormat(getCurrentLanguage() === 'zh' ? 'zh-CN' : 'en-US', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        return formatter.format(new Date(safeTs));
    } catch {
        return new Date(safeTs).toLocaleString();
    }
}

function getCleanupResultText(result) {
    const safe = String(result || '').toLowerCase();
    if (safe === 'success') return t('cleanup.log.result.success');
    if (safe === 'partial') return t('cleanup.log.result.partial');
    if (safe === 'blocked') return t('cleanup.log.result.blocked');
    return t('cleanup.log.result.failed');
}

function getCleanupResultClass(result) {
    const safe = String(result || '').toLowerCase();
    if (safe === 'success') return 'success';
    if (safe === 'partial') return 'partial';
    if (safe === 'blocked') return 'blocked';
    return 'failed';
}

function normalizeCleanupLogFilter(filter) {
    const safe = String(filter || '').toLowerCase();
    if (['all', 'success', 'failed', 'blocked'].includes(safe)) return safe;
    return 'all';
}

function matchesCleanupLogFilter(log, filter) {
    const safeFilter = normalizeCleanupLogFilter(filter);
    if (safeFilter === 'all') return true;
    const result = String(log?.result || '').toLowerCase();
    if (safeFilter === 'failed') return result === 'failed' || result === 'partial';
    return result === safeFilter;
}

export function updateCleanupLogFilterUI() {
    document.querySelectorAll('#cleanupLogFilterGroup .cleanup-log-filter-btn').forEach(btn => {
        const active = btn.dataset.filter === cleanupLogFilter;
        btn.classList.toggle('active', active);
    });
}

export function setCleanupLogFilter(filter) {
    cleanupLogFilter = normalizeCleanupLogFilter(filter);
    updateCleanupLogFilterUI();
    renderCleanupLogs(cleanupLogCache);
}

export function renderCleanupLogs(logs) {
    const listNode = document.getElementById('cleanupLogList');
    const summaryNode = document.getElementById('cleanupLogSummaryText');
    if (!listNode || !summaryNode) return;

    const safeLogs = (Array.isArray(logs) ? logs : [])
        .filter(log => matchesCleanupLogFilter(log, cleanupLogFilter))
        .slice(0, 30);
    summaryNode.textContent = t('cleanup.log.summary', { count: safeLogs.length });

    if (safeLogs.length === 0) {
        listNode.innerHTML = `<div class="cleanup-log-empty">${escapeHtml(t('cleanup.log.empty'))}</div>`;
        return;
    }

    listNode.innerHTML = safeLogs.map(log => {
        const domain = escapeHtml(log?.domain || '-');
        const actionText = escapeHtml(getCleanupActionText(log?.action || 'unknown'));
        const timeText = escapeHtml(t('cleanup.log.time', { time: formatLogTime(log?.timestamp) }));
        const resultClass = getCleanupResultClass(log?.result);
        const resultText = escapeHtml(getCleanupResultText(log?.result));
        const hasCount = typeof log?.count === 'number' && Number.isFinite(log.count);
        const countText = hasCount
            ? `<span>${escapeHtml(t('cleanup.log.count', { count: log.count }))}</span>`
            : '';

        return `
        <div class="cleanup-log-item">
          <div class="cleanup-log-top">
            <div class="cleanup-log-domain">${domain}</div>
            <span class="cleanup-log-status ${resultClass}">${resultText}</span>
          </div>
          <div class="cleanup-log-meta">
            <span>${actionText}</span>
            ${countText}
            <span>${timeText}</span>
          </div>
        </div>
      `;
    }).join('');
}

export function setCleanupLogCache(logs) {
    cleanupLogCache = Array.isArray(logs) ? logs : [];
}

export async function updateCleanupLogList() {
    try {
        cleanupLogCache = await listCleanupLogs();
        updateCleanupLogFilterUI();
        renderCleanupLogs(cleanupLogCache);
    } catch (e) {
        console.error('读取清理日志失败:', e);
        cleanupLogCache = [];
        updateCleanupLogFilterUI();
        renderCleanupLogs([]);
    }
}

// 用于 domain 为空（如 chrome://、extension:// 等无法识别域名的页面）时的占位 sentinel。
// 仍然要写入日志，便于调试和失败溯源；渲染时会按普通字符串显示。
export const UNKNOWN_DOMAIN_SENTINEL = '(unknown)';

export async function recordCleanupLog({ domain, action, result, count = null, detail = '' }) {
    // action 仍是必填；domain 为空时用占位符，避免失败日志被静默丢弃。
    if (!action) return;
    const safeDomain = normalizeDomain(domain) || UNKNOWN_DOMAIN_SENTINEL;
    try {
        await appendCleanupLogEntry({
            timestamp: Date.now(),
            domain: safeDomain,
            action,
            result,
            count: Number.isFinite(Number(count)) ? Number(count) : null,
            detail: String(detail || '').slice(0, 300)
        });
        await updateCleanupLogList();
    } catch (e) {
        console.warn('记录清理日志失败:', e);
    }
}
