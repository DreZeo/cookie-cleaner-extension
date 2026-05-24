import { formatBytes, getCurrentTab, getDomain, isUnsupportedPageUrl } from './utils.js';
import { t } from './i18n.js';
import { hasSitePermission } from './permissions.js';
import {
    clearFirstPartyCookies,
    getCookiesByParty,
    getFirstPartyCookies
} from './cookies.js';

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

    const sitePermissionGranted = await hasSitePermission(tab.url);
    if (sitePermissionGranted) {
        const { firstParty } = await getCookiesByParty(domain, includeSubdomains);
        document.getElementById('cookieCount').textContent = firstParty.length;
        const cookieSize = firstParty.reduce((sum, c) => sum + c.name.length + c.value.length, 0);
        document.getElementById('cookieSize').textContent = cookieSize > 0 ? formatBytes(cookieSize) : '';
    } else {
        document.getElementById('cookieCount').textContent = '-';
        document.getElementById('cookieSize').textContent = t('cookie.unauthorized');
    }

    const storageStats = await getStorageStats(tab.id);
    if (storageStats) {
        document.getElementById('localStorageCount').textContent = storageStats.localStorage.count;
        document.getElementById('localStorageSize').textContent =
            storageStats.localStorage.size > 0 ? formatBytes(storageStats.localStorage.size) : '';

        document.getElementById('sessionStorageCount').textContent = storageStats.sessionStorage.count;
        document.getElementById('sessionStorageSize').textContent =
            storageStats.sessionStorage.size > 0 ? formatBytes(storageStats.sessionStorage.size) : '';

        document.getElementById('imageCount').textContent = storageStats.resources.images;
        document.getElementById('scriptCount').textContent = storageStats.resources.scripts;
        document.getElementById('styleCount').textContent = storageStats.resources.styles;
        document.getElementById('otherCount').textContent = storageStats.resources.others;
    }

    const idbStats = await getIndexedDBStats(tab.id);
    document.getElementById('indexedDBCount').textContent = idbStats.count;
    if (idbStats.count > 0) {
        document.getElementById('indexedDBSize').textContent = t('indexedDB.count', { count: idbStats.count });
    } else {
        document.getElementById('indexedDBSize').textContent = '';
    }

    const cacheStats = await getCacheStorageStats(tab.id);
    document.getElementById('cacheStorageCount').textContent = cacheStats.count;
    if (cacheStats.entries > 0) {
        document.getElementById('cacheStorageSize').textContent = t('cacheStorage.entries', { count: cacheStats.entries });
    } else {
        document.getElementById('cacheStorageSize').textContent = '';
    }

    const swStats = await getServiceWorkerStats(tab.id);
    document.getElementById('serviceWorkerCount').textContent = swStats.count;
}
