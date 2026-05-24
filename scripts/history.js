import { HISTORY_MAX_RESULTS } from './constants.js';
import {
    filterHistoryItems,
    getCurrentTab,
    getDomain,
    getDomainCandidates,
    isUnsupportedPageUrl,
    toSafeTimeRangeMs
} from './utils.js';
import { t } from './i18n.js';
import { extensionRequest } from './bridge.js';

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
    if (candidates.length === 0) return [];

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

    const mergedByUrl = new Map();
    for (const results of queryResults) {
        const filtered = filterHistoryItems(results, candidates, includeSubdomains);
        for (const item of filtered) {
            if (!item?.url || mergedByUrl.has(item.url)) continue;
            mergedByUrl.set(item.url, item);
        }
    }

    return Array.from(mergedByUrl.values());
}

async function getHistoryStats(domain, timeRangeMs, includeSubdomains) {
    const safeTimeRangeMs = toSafeTimeRangeMs(timeRangeMs);

    try {
        const response = await extensionRequest('history_get', { domain, timeRangeMs: safeTimeRangeMs, includeSubdomains });
        return response.count;
    } catch (e) {
        console.warn('history_get via background failed, fallback to popup context:', e);
    }

    try {
        if (!isHistoryApiAvailable()) return 0;
        const items = await getHistoryItemsFromPopup(domain, safeTimeRangeMs, includeSubdomains);
        return items.length;
    } catch (e) {
        console.error('搜索历史记录失败:', e);
        return 0;
    }
}

export async function clearHistory(domain, timeRangeMs, includeSubdomains) {
    const safeTimeRangeMs = toSafeTimeRangeMs(timeRangeMs);

    try {
        const response = await extensionRequest('history_clear', { domain, timeRangeMs: safeTimeRangeMs, includeSubdomains });
        return response.count;
    } catch (e) {
        console.warn('history_clear via background failed, fallback to popup context:', e);
    }

    if (!isHistoryApiAvailable()) {
        return 0;
    }

    const items = await getHistoryItemsFromPopup(domain, safeTimeRangeMs, includeSubdomains);
    for (const item of items) {
        await chrome.history.deleteUrl({ url: item.url });
    }
    return items.length;
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

        const count = await getHistoryStats(domain, timeRangeMs, includeSubdomains);
        document.getElementById('historyCount').textContent = t('history.count', { count });
    } catch (e) {
        console.error('获取浏览记录统计失败:', e);
        document.getElementById('historyCount').textContent = t('history.error');
    }
}
