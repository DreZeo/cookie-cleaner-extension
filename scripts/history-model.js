import { filterHistoryItems } from './domain-utils.js';

export const HISTORY_SCAN_STATUS = {
    OK: 'ok',
    TRUNCATED: 'truncated',
    FAILED: 'failed'
};

export const HISTORY_CLEAR_RESULT = {
    SUCCESS: 'success',
    PARTIAL: 'partial',
    FAILED: 'failed'
};

export function createHistoryScanResult(items = [], queryResults = [], maxResults = 0) {
    const safeItems = Array.isArray(items) ? items : [];
    const safeMaxResults = Number(maxResults);
    const truncated = Number.isFinite(safeMaxResults) && safeMaxResults > 0
        ? (Array.isArray(queryResults) ? queryResults : []).some(results =>
            Array.isArray(results) && results.length >= safeMaxResults)
        : false;

    return {
        status: truncated ? HISTORY_SCAN_STATUS.TRUNCATED : HISTORY_SCAN_STATUS.OK,
        count: safeItems.length,
        truncated,
        items: safeItems
    };
}

export function mergeHistorySearchResults(queryResults, candidates, includeSubdomains, maxResults) {
    const mergedByUrl = new Map();
    for (const results of queryResults || []) {
        const filtered = filterHistoryItems(results, candidates, includeSubdomains);
        for (const item of filtered) {
            if (!item?.url || mergedByUrl.has(item.url)) continue;
            mergedByUrl.set(item.url, item);
        }
    }

    return createHistoryScanResult(
        Array.from(mergedByUrl.values()),
        queryResults,
        maxResults
    );
}

export function summarizeHistoryClear(beforeScan, afterScan, deleteStats = {}) {
    const beforeCount = Number.isFinite(Number(beforeScan?.count)) ? Number(beforeScan.count) : 0;
    const afterCount = Number.isFinite(Number(afterScan?.count)) ? Number(afterScan.count) : 0;
    const attemptedCount = Number.isFinite(Number(deleteStats.attemptedCount)) ? Number(deleteStats.attemptedCount) : beforeCount;
    const deletedCount = Number.isFinite(Number(deleteStats.deletedCount)) ? Number(deleteStats.deletedCount) : 0;
    const failedCount = Number.isFinite(Number(deleteStats.failedCount)) ? Number(deleteStats.failedCount) : 0;
    const truncated = !!beforeScan?.truncated || !!afterScan?.truncated;
    const remainingCount = afterCount;

    let result = HISTORY_CLEAR_RESULT.FAILED;
    if (beforeCount === 0 || (remainingCount === 0 && failedCount === 0 && !truncated)) {
        result = HISTORY_CLEAR_RESULT.SUCCESS;
    } else if (deletedCount > 0 || afterCount < beforeCount) {
        result = HISTORY_CLEAR_RESULT.PARTIAL;
    }

    return {
        beforeCount,
        attemptedCount,
        deletedCount,
        failedCount,
        afterCount,
        remainingCount,
        truncated,
        result
    };
}

export function getHistoryClearDetail(summary) {
    const parts = [];
    if (summary?.truncated) parts.push('truncated');
    if (Number(summary?.failedCount) > 0) parts.push(`failedCount=${summary.failedCount}`);
    if (Number(summary?.remainingCount) > 0) parts.push(`remainingCount=${summary.remainingCount}`);
    return parts.join(',');
}
