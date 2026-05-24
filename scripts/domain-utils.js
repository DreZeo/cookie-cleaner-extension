// ========== 纯函数域名/匹配工具（popup 与 service worker 共用） ==========
// 本模块只包含与 DOM / chrome.* API 无关的纯函数，保证 service worker 环境可用。

export function normalizeDomain(domain) {
    return (domain || '').toLowerCase().replace(/^www\./, '');
}

export function getDomainCandidates(domain) {
    const normalized = normalizeDomain(domain);
    if (!normalized) return [];
    const candidates = new Set();
    candidates.add(normalized);
    return Array.from(candidates).filter(Boolean);
}

export function matchesDomain(itemDomain, baseDomain, includeSubdomains) {
    if (!itemDomain || !baseDomain) return false;
    if (includeSubdomains) {
        return itemDomain === baseDomain || itemDomain.endsWith('.' + baseDomain);
    }
    return itemDomain === baseDomain;
}

export function matchesCandidates(itemDomain, candidates, includeSubdomains) {
    return candidates.some(candidate => matchesDomain(itemDomain, candidate, includeSubdomains));
}

export function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function urlMatchesCandidates(url, candidates, includeSubdomains) {
    const safeUrl = (url || '').toLowerCase();
    return candidates.some(candidate => {
        if (!candidate) return false;
        if (!includeSubdomains) {
            const exactHost = new RegExp('://' + escapeRegExp(candidate) + '([/:]|$)', 'i');
            return exactHost.test(safeUrl);
        }
        const hostRegex = new RegExp('://([a-z0-9-]+\\.)*' + escapeRegExp(candidate) + '([/:]|$)', 'i');
        return hostRegex.test(safeUrl);
    });
}

export function toSafeTimeRangeMs(timeRangeMs) {
    const parsed = Number(timeRangeMs);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return parsed;
}

export function filterHistoryItems(items, candidates, includeSubdomains) {
    return (items || []).filter(item => {
        try {
            const itemDomain = normalizeDomain(new URL(item.url).hostname);
            return matchesCandidates(itemDomain, candidates, includeSubdomains);
        } catch {
            return urlMatchesCandidates(item.url, candidates, includeSubdomains);
        }
    });
}
