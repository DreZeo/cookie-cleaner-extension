import { formatBytes, getCurrentTab, getDomain, isUnsupportedPageUrl } from './utils.js';
import { t } from './i18n.js';
import { hasSitePermission } from './permissions.js';
import {
    clearFirstPartyCookies,
    getCookiesByParty,
    getFirstPartyCookies
} from './cookies.js';

export const SCAN_STATUS = {
    OK: 'ok',
    NO_PERMISSION: 'no_permission',
    UNSUPPORTED: 'unsupported',
    FAILED: 'failed'
};

export const CLEANUP_SCAN_TYPES = [
    'cookies',
    'localStorage',
    'sessionStorage',
    'indexedDB',
    'cacheStorage',
    'serviceWorker'
];

export function createScanItem(status, data = {}) {
    return {
        status,
        count: Number.isFinite(Number(data.count)) ? Number(data.count) : null,
        size: Number.isFinite(Number(data.size)) ? Number(data.size) : null,
        detail: data.detail || '',
        error: data.error || ''
    };
}

export function getScanItemCount(item) {
    return Number.isFinite(Number(item?.count)) ? Number(item.count) : null;
}

export function isScanItemClear(item) {
    const count = getScanItemCount(item);
    return item?.status === SCAN_STATUS.OK && count === 0;
}

export function summarizeCleanupRescan(scan, types = CLEANUP_SCAN_TYPES) {
    const items = scan?.items || {};
    const failures = [];
    const remaining = [];
    let clearCount = 0;
    for (const type of types) {
        const item = items[type];
        if (!item || item.status !== SCAN_STATUS.OK) {
            failures.push(type);
            continue;
        }
        const count = getScanItemCount(item);
        if (count !== null && count > 0) {
            remaining.push(type);
        } else {
            clearCount += 1;
        }
    }

    if (failures.length === 0 && remaining.length === 0) {
        return { result: 'success', failures, remaining };
    }
    if (clearCount === 0) {
        return { result: 'failed', failures, remaining };
    }
    return { result: 'partial', failures, remaining };
}

// ========== Cookie ==========
// 第一方 Cookie 操作保留原 API 名称（getCookies / clearCookies）以保持兼容，
// 第三方 Cookie 相关 API 位于 scripts/cookies.js。

export async function getCookies(domain, includeSubdomains) {
    try {
        const allCookies = await chrome.cookies.getAll({});
        return getFirstPartyCookies(allCookies, domain, includeSubdomains);
    } catch (e) {
        console.warn('读取 Cookie 失败，可能未授予站点权限:', e);
        return [];
    }
}

export async function clearCookies(domain, includeSubdomains) {
    return clearFirstPartyCookies(domain, includeSubdomains);
}

// ========== 页面存储检测 ==========

export async function getStorageStats(tabId) {
    try {
        const results = await chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
                const stats = {
                    localStorage: { count: 0, size: 0 },
                    sessionStorage: { count: 0, size: 0 },
                    indexedDB: { databases: [] },
                    cacheStorage: { caches: [] },
                    serviceWorker: { count: 0 },
                    resources: { images: 0, scripts: 0, styles: 0, others: 0 }
                };

                try {
                    stats.localStorage.count = localStorage.length;
                    let lsSize = 0;
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        lsSize += key.length + (localStorage.getItem(key) || '').length;
                    }
                    stats.localStorage.size = lsSize * 2;
                } catch (e) { }

                try {
                    stats.sessionStorage.count = sessionStorage.length;
                    let ssSize = 0;
                    for (let i = 0; i < sessionStorage.length; i++) {
                        const key = sessionStorage.key(i);
                        ssSize += key.length + (sessionStorage.getItem(key) || '').length;
                    }
                    stats.sessionStorage.size = ssSize * 2;
                } catch (e) { }

                try {
                    const entries = performance.getEntriesByType('resource');
                    entries.forEach(entry => {
                        const type = entry.initiatorType;
                        if (type === 'img' || entry.name.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)(\?|$)/i)) {
                            stats.resources.images++;
                        } else if (type === 'script' || entry.name.match(/\.js(\?|$)/i)) {
                            stats.resources.scripts++;
                        } else if (type === 'link' || type === 'css' || entry.name.match(/\.css(\?|$)/i)) {
                            stats.resources.styles++;
                        } else {
                            stats.resources.others++;
                        }
                    });
                } catch (e) { }

                return stats;
            }
        });
        return results[0]?.result || null;
    } catch (e) {
        console.error('获取存储统计失败:', e);
        return null;
    }
}

export async function getIndexedDBStats(tabId) {
    try {
        const results = await chrome.scripting.executeScript({
            target: { tabId },
            func: async () => {
                try {
                    const databases = await indexedDB.databases();
                    return { count: databases.length, databases: databases.map(db => db.name) };
                } catch {
                    return { count: 0, databases: [] };
                }
            }
        });
        return results[0]?.result || { count: 0, databases: [] };
    } catch {
        return { count: 0, databases: [] };
    }
}

export async function getCacheStorageStats(tabId) {
    try {
        const results = await chrome.scripting.executeScript({
            target: { tabId },
            func: async () => {
                try {
                    const cacheNames = await caches.keys();
                    let totalSize = 0;
                    for (const name of cacheNames) {
                        const cache = await caches.open(name);
                        const requests = await cache.keys();
                        totalSize += requests.length;
                    }
                    return { count: cacheNames.length, entries: totalSize };
                } catch {
                    return { count: 0, entries: 0 };
                }
            }
        });
        return results[0]?.result || { count: 0, entries: 0 };
    } catch {
        return { count: 0, entries: 0 };
    }
}

export async function getServiceWorkerStats(tabId) {
    try {
        const results = await chrome.scripting.executeScript({
            target: { tabId },
            func: async () => {
                try {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    return { count: registrations.length };
                } catch {
                    return { count: 0 };
                }
            }
        });
        return results[0]?.result || { count: 0 };
    } catch {
        return { count: 0 };
    }
}

export async function scanCleanupState(tab, includeSubdomains) {
    const url = tab?.url || '';
    const domain = getDomain(url);
    const items = {};

    if (!tab?.id || !domain || isUnsupportedPageUrl(url)) {
        for (const type of CLEANUP_SCAN_TYPES) {
            items[type] = createScanItem(SCAN_STATUS.UNSUPPORTED);
        }
        return { status: SCAN_STATUS.UNSUPPORTED, domain, items };
    }

    const sitePermissionGranted = await hasSitePermission(url);
    if (sitePermissionGranted) {
        try {
            const { firstParty } = await getCookiesByParty(domain, includeSubdomains);
            const cookieSize = firstParty.reduce((sum, c) => sum + c.name.length + c.value.length, 0);
            items.cookies = createScanItem(SCAN_STATUS.OK, {
                count: firstParty.length,
                size: cookieSize
            });
        } catch (e) {
            items.cookies = createScanItem(SCAN_STATUS.FAILED, { error: String(e?.message || e || '') });
        }
    } else {
        items.cookies = createScanItem(SCAN_STATUS.NO_PERMISSION);
    }

    const storageStats = await getStorageStats(tab.id);
    if (storageStats) {
        items.localStorage = createScanItem(SCAN_STATUS.OK, {
            count: storageStats.localStorage.count,
            size: storageStats.localStorage.size
        });
        items.sessionStorage = createScanItem(SCAN_STATUS.OK, {
            count: storageStats.sessionStorage.count,
            size: storageStats.sessionStorage.size
        });
        items.resources = {
            images: storageStats.resources.images,
            scripts: storageStats.resources.scripts,
            styles: storageStats.resources.styles,
            others: storageStats.resources.others
        };
    } else {
        items.localStorage = createScanItem(SCAN_STATUS.FAILED);
        items.sessionStorage = createScanItem(SCAN_STATUS.FAILED);
        items.resources = { images: null, scripts: null, styles: null, others: null };
    }

    const idbStats = await getIndexedDBStats(tab.id);
    items.indexedDB = createScanItem(SCAN_STATUS.OK, {
        count: idbStats.count,
        detail: idbStats.count > 0 ? t('indexedDB.count', { count: idbStats.count }) : ''
    });

    const cacheStats = await getCacheStorageStats(tab.id);
    items.cacheStorage = createScanItem(SCAN_STATUS.OK, {
        count: cacheStats.count,
        detail: cacheStats.entries > 0 ? t('cacheStorage.entries', { count: cacheStats.entries }) : ''
    });

    const swStats = await getServiceWorkerStats(tab.id);
    items.serviceWorker = createScanItem(SCAN_STATUS.OK, { count: swStats.count });

    const hasFailure = Object.values(items).some(item => item?.status === SCAN_STATUS.FAILED);
    const hasNoPermission = Object.values(items).some(item => item?.status === SCAN_STATUS.NO_PERMISSION);
    return {
        status: hasFailure ? SCAN_STATUS.FAILED : hasNoPermission ? SCAN_STATUS.NO_PERMISSION : SCAN_STATUS.OK,
        domain,
        items
    };
}

// ========== 清除动作 ==========

export async function clearLocalStorage(tabId) {
    try {
        await chrome.scripting.executeScript({
            target: { tabId },
            func: () => localStorage.clear()
        });
        return true;
    } catch {
        return false;
    }
}

export async function clearSessionStorage(tabId) {
    try {
        await chrome.scripting.executeScript({
            target: { tabId },
            func: () => sessionStorage.clear()
        });
        return true;
    } catch {
        return false;
    }
}

export async function clearIndexedDB(tabId) {
    try {
        await chrome.scripting.executeScript({
            target: { tabId },
            func: async () => {
                try {
                    const databases = await indexedDB.databases();
                    await Promise.all(databases.map(db => {
                        if (!db.name) return Promise.resolve();
                        return new Promise(resolve => {
                            const req = indexedDB.deleteDatabase(db.name);
                            req.onsuccess = () => resolve();
                            req.onerror = () => resolve();
                            req.onblocked = () => resolve();
                        });
                    }));
                } catch { }
            }
        });
        return true;
    } catch {
        return false;
    }
}

export async function clearCacheStorage(tabId) {
    try {
        await chrome.scripting.executeScript({
            target: { tabId },
            func: async () => {
                try {
                    const cacheNames = await caches.keys();
                    await Promise.all(cacheNames.map(name => caches.delete(name)));
                } catch { }
            }
        });
        return true;
    } catch {
        return false;
    }
}

export async function clearServiceWorkers(tabId) {
    try {
        await chrome.scripting.executeScript({
            target: { tabId },
            func: async () => {
                try {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    await Promise.all(registrations.map(reg => reg.unregister()));
                } catch { }
            }
        });
        return true;
    } catch {
        return false;
    }
}

export async function clearBrowsingCache(origin) {
    try {
        await chrome.browsingData.removeCache({
            origins: [origin]
        });
        return true;
    } catch {
        return false;
    }
}

// ========== 统计更新 ==========

// 把 currentDomain 节点设为占位状态：同时写入文本与 data-i18n-placeholder 标记，
// 语言切换时 applyStaticTexts 会依据该属性重新翻译。
function setDomainPlaceholder(node, key) {
    if (!node) return;
    node.setAttribute('data-i18n-placeholder', key);
    node.textContent = t(key);
}

function resetStatNodes() {
    const placeholders = [
        'cookieCount', 'cookieSize',
        'localStorageCount', 'localStorageSize',
        'sessionStorageCount', 'sessionStorageSize',
        'indexedDBCount', 'indexedDBSize',
        'cacheStorageCount', 'cacheStorageSize',
        'serviceWorkerCount',
        'imageCount', 'scriptCount', 'styleCount', 'otherCount'
    ];
    placeholders.forEach(id => {
        const node = document.getElementById(id);
        if (!node) return;
        node.textContent = id.endsWith('Size') ? '' : '-';
    });
}

function renderScanItem(countId, detailId, item, detailFormatter = null) {
    const countNode = document.getElementById(countId);
    const detailNode = detailId ? document.getElementById(detailId) : null;
    if (!countNode) return;

    if (!item || item.status === SCAN_STATUS.UNSUPPORTED) {
        countNode.textContent = '-';
        if (detailNode) detailNode.textContent = '';
        return;
    }
    if (item.status === SCAN_STATUS.NO_PERMISSION) {
        countNode.textContent = '-';
        if (detailNode) detailNode.textContent = t('scan.status.noPermission');
        return;
    }
    if (item.status === SCAN_STATUS.FAILED) {
        countNode.textContent = '-';
        if (detailNode) detailNode.textContent = t('scan.status.failed');
        return;
    }

    countNode.textContent = String(item.count ?? 0);
    if (detailNode) {
        detailNode.textContent = typeof detailFormatter === 'function'
            ? detailFormatter(item)
            : item.detail || '';
    }
}

export async function updateAllStats() {
    const domainNode = document.getElementById('currentDomain');
    const tab = await getCurrentTab();
    if (!tab?.url) {
        setDomainPlaceholder(domainNode, 'domain.unavailable');
        resetStatNodes();
        return;
    }
    const domain = getDomain(tab.url);
    const includeSubdomains = document.getElementById('includeSubdomains').checked;

    if (domain) {
        // 真实 domain：清除占位标记，避免切换语言时被 applyStaticTexts 覆盖回占位文案。
        domainNode?.removeAttribute('data-i18n-placeholder');
        if (domainNode) domainNode.textContent = domain;
    } else {
        setDomainPlaceholder(domainNode, 'domain.unavailable');
    }

    // 被动刷新路径：chrome://、edge:// 等非网页直接占位返回，不弹错误 toast。
    // 错误提示收敛到 clearByType / clearAll 等用户主动触发的路径。
    if (!domain || isUnsupportedPageUrl(tab.url)) {
        resetStatNodes();
        return;
    }

    const scan = await scanCleanupState(tab, includeSubdomains);
    renderScanItem('cookieCount', 'cookieSize', scan.items.cookies, item =>
        item.size > 0 ? formatBytes(item.size) : '');
    renderScanItem('localStorageCount', 'localStorageSize', scan.items.localStorage, item =>
        item.size > 0 ? formatBytes(item.size) : '');
    renderScanItem('sessionStorageCount', 'sessionStorageSize', scan.items.sessionStorage, item =>
        item.size > 0 ? formatBytes(item.size) : '');
    renderScanItem('indexedDBCount', 'indexedDBSize', scan.items.indexedDB);
    renderScanItem('cacheStorageCount', 'cacheStorageSize', scan.items.cacheStorage);
    renderScanItem('serviceWorkerCount', null, scan.items.serviceWorker);

    const resources = scan.items.resources || {};
    document.getElementById('imageCount').textContent = resources.images ?? '-';
    document.getElementById('scriptCount').textContent = resources.scripts ?? '-';
    document.getElementById('styleCount').textContent = resources.styles ?? '-';
    document.getElementById('otherCount').textContent = resources.others ?? '-';
}
