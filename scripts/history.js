import { HISTORY_MAX_RESULTS } from './constants.js';
import {
    getCurrentTab,
    getDomain,
    getDomainCandidates,
    isUnsupportedPageUrl,
    toSafeTimeRangeMs
} from './utils.js';
import { t } from './i18n.js';
import { extensionRequest } from './bridge.js';
import {
    getHistoryClearDetail,
    mergeHistorySearchResults,
    summarizeHistoryClear
} from './history-model.js';

function historySearch(query) {
    return new Promise(resolve => {
        try {
            chrome.history.search(query, results => {
                const err = chrome.runtime?.lastError;
                if (err) {
                    console.error('history.search failed:', err);
                    resolve([]);
                    return;
                }
                resolve(results || []);
            });
        } catch (e) {
            console.error('history.search exception:', e);
            resolve([]);
        }
    });
}

function isHistoryApiAvailable() {
    return !!chrome.history && typeof chrome.history.search === 'function';
}

async function getHistoryItemsFromPopup(domain, timeRangeMs, includeSubdomains) {
    const safeTimeRangeMs = toSafeTimeRangeMs(timeRangeMs);
    const startTime = safeTimeRangeMs > 0 ? Date.now() - safeTimeRangeMs : 0;
    const candidates = getDomainCandidates(domain);
    if (candidates.length === 0) {
        return {
            status: 'ok',
            count: 0,
            truncated: false,
            items: []
        };
    }

    const queryTexts = Array.from(new Set([candidates[0], ...candidates, ''])).filter(text => text !== undefined);
    const queryResults = await Promise.all(
        queryTexts.map(async text => {
            try {
                return await historySearch({
                    text,
                    startTime,
                    maxResults: HISTORY_MAX_RESULTS
                });
            } catch (err) {
                console.error('history.search failed:', err);
                return [];
            }
        })
    );

    return mergeHistorySearchResults(queryResults, candidates, includeSubdomains, HISTORY_MAX_RESULTS);
}

function normalizeHistoryScanResponse(response) {
    return {
        status: response?.status || (response?.truncated ? 'truncated' : 'ok'),
        count: Number.isFinite(Number(response?.count)) ? Number(response.count) : 0,
        truncated: !!response?.truncated
    };
}

async function getHistoryStats(domain, timeRangeMs, includeSubdomains) {
    const safeTimeRangeMs = toSafeTimeRangeMs(timeRangeMs);

    try {
        const response = await extensionRequest('history_get', { domain, timeRangeMs: safeTimeRangeMs, includeSubdomains });
        return normalizeHistoryScanResponse(response);
    } catch (e) {
        console.warn('history_get via background failed, fallback to popup context:', e);
    }

    try {
        if (!isHistoryApiAvailable()) {
            return { status: 'failed', count: 0, truncated: false };
        }
        const scan = await getHistoryItemsFromPopup(domain, safeTimeRangeMs, includeSubdomains);
        return normalizeHistoryScanResponse(scan);
    } catch (e) {
        console.error('搜索历史记录失败:', e);
        return { status: 'failed', count: 0, truncated: false };
    }
}

function historyDeleteUrl(url) {
    return new Promise(resolve => {
        try {
            chrome.history.deleteUrl({ url }, () => {
                const err = chrome.runtime?.lastError;
                resolve(!err);
            });
        } catch {
            resolve(false);
        }
    });
}

export async function clearHistory(domain, timeRangeMs, includeSubdomains) {
    const safeTimeRangeMs = toSafeTimeRangeMs(timeRangeMs);

    try {
        const response = await extensionRequest('history_clear', { domain, timeRangeMs: safeTimeRangeMs, includeSubdomains });
        return response;
    } catch (e) {
        console.warn('history_clear via background failed, fallback to popup context:', e);
    }

    if (!isHistoryApiAvailable()) {
        return {
            beforeCount: 0,
            attemptedCount: 0,
            deletedCount: 0,
            failedCount: 0,
            afterCount: 0,
            remainingCount: 0,
            truncated: false,
            result: 'failed'
        };
    }

    const beforeScan = await getHistoryItemsFromPopup(domain, safeTimeRangeMs, includeSubdomains);
    let deletedCount = 0;
    let failedCount = 0;
    for (const item of beforeScan.items) {
        const deleted = await historyDeleteUrl(item.url);
        if (deleted) {
            deletedCount += 1;
        } else {
            failedCount += 1;
        }
    }

    const afterScan = await getHistoryItemsFromPopup(domain, safeTimeRangeMs, includeSubdomains);
    return summarizeHistoryClear(beforeScan, afterScan, {
        attemptedCount: beforeScan.items.length,
        deletedCount,
        failedCount
    });
}

export function getHistoryClearMessageKey(summary) {
    if (summary?.result === 'success') return 'message.historyCleared';
    if (summary?.result === 'partial') return 'message.historyClearPartial';
    return 'message.historyClearFailedAfterRescan';
}

export function getHistoryLogDetail(summary) {
    return getHistoryClearDetail(summary);
}

export async function updateHistoryStats() {
    try {
        const tab = await getCurrentTab();
        if (!tab || !tab.url) {
            document.getElementById('historyCount').textContent = '-';
            return;
        }

        const domain = getDomain(tab.url);
        const timeRangeMs = toSafeTimeRangeMs(document.getElementById('historyTimeRange').value);
        const includeSubdomains = document.getElementById('includeSubdomains').checked;

        if (!domain || isUnsupportedPageUrl(tab.url)) {
            document.getElementById('historyCount').textContent = '-';
            return;
        }

        const scan = await getHistoryStats(domain, timeRangeMs, includeSubdomains);
        document.getElementById('historyCount').textContent = scan.truncated
            ? t('history.countTruncated', { count: scan.count })
            : t('history.count', { count: scan.count });
    } catch (e) {
        console.error('获取浏览记录统计失败:', e);
        document.getElementById('historyCount').textContent = t('history.error');
    }
}
