import { getCurrentTab, getDomain, getOrigin, isUnsupportedPageUrl, showMessage } from './utils.js';
import { t } from './i18n.js';
import { hasSitePermission, requestSitePermission, updateSitePermissionStatus } from './permissions.js';
import { assertWhitelistAllowed, updateWhitelistStatus } from './whitelist.js';
import { recordCleanupLog } from './cleanup-log.js';
import {
    clearCacheStorage,
    clearCookies,
    clearIndexedDB,
    clearLocalStorage,
    clearServiceWorkers,
    clearSessionStorage,
    clearBrowsingCache,
    updateAllStats
} from './cleanup.js';

export async function clearByType(type) {
    const tab = await getCurrentTab();
    if (!tab?.url || isUnsupportedPageUrl(tab.url)) {
        showMessage(t('message.unsupportedPageStats'), 'error');
        return;
    }
    const domain = getDomain(tab.url);
    const includeSubdomains = document.getElementById('includeSubdomains').checked;
    const autoRefresh = document.getElementById('autoRefresh').checked;

    const allowed = await assertWhitelistAllowed(domain, type);
    if (!allowed) return;

    let success = false;
    let message = '';
    let cleanedCount = null;

    switch (type) {
        case 'cookies': {
            let sitePermissionGranted = await hasSitePermission(tab.url);
            if (!sitePermissionGranted) {
                sitePermissionGranted = await requestSitePermission(tab.url);
                await updateSitePermissionStatus();
            }

            if (!sitePermissionGranted) {
                success = false;
                message = t('message.permissionRequiredCookieClear');
                break;
            }

            const count = await clearCookies(domain, includeSubdomains);
            success = true;
            cleanedCount = count;
            message = t('message.cookiesCleared', { count });
            break;
        }
        case 'localStorage':
            success = await clearLocalStorage(tab.id);
            message = success ? t('message.localStorageCleared') : t('message.clearFailed');
            break;
        case 'sessionStorage':
            success = await clearSessionStorage(tab.id);
            message = success ? t('message.sessionStorageCleared') : t('message.clearFailed');
            break;
        case 'indexedDB':
            success = await clearIndexedDB(tab.id);
            message = success ? t('message.indexedDBCleared') : t('message.clearFailed');
            break;
        case 'cacheStorage':
            success = await clearCacheStorage(tab.id);
            message = success ? t('message.cacheStorageCleared') : t('message.clearFailed');
            break;
        case 'serviceWorker':
            success = await clearServiceWorkers(tab.id);
            message = success ? t('message.serviceWorkerCleared') : t('message.clearFailed');
            break;
        default:
            // 未知 type：出现此分支说明调用方与 UI 对不上号（比如新增了 cache-card 类型但忘了接入）。
            // 直接告警并提前返回，避免走到下面 showMessage 弹空文案 + 写入无意义 failed 日志。
            console.warn('clearByType: 收到未知的清理类型', type);
            return;
    }

    showMessage(message, success ? 'success' : 'error');
    await recordCleanupLog({
        domain,
        action: type,
        result: success ? 'success' : 'failed',
        count: cleanedCount,
        detail: success ? '' : message
    });

    if (success) {
        await updateAllStats();
        await updateSitePermissionStatus();
        await updateWhitelistStatus();
        if (autoRefresh) {
            setTimeout(() => {
                chrome.tabs.reload(tab.id);
                window.close();
            }, 500);
        }
    }
}

export async function clearAll() {
    const tab = await getCurrentTab();
    if (!tab?.url || isUnsupportedPageUrl(tab.url)) {
        showMessage(t('message.unsupportedPageStats'), 'error');
        return;
    }
    const domain = getDomain(tab.url);
    const origin = getOrigin(tab.url);
    const includeSubdomains = document.getElementById('includeSubdomains').checked;
    const autoRefresh = document.getElementById('autoRefresh').checked;

    const allowed = await assertWhitelistAllowed(domain, 'all');
    if (!allowed) return;

    let cookiePermissionGranted = await hasSitePermission(tab.url);
    if (!cookiePermissionGranted) {
        cookiePermissionGranted = await requestSitePermission(tab.url);
    }

    const cookieTask = cookiePermissionGranted
        ? clearCookies(domain, includeSubdomains)
        : Promise.resolve(0);

    await Promise.all([
        cookieTask,
        clearLocalStorage(tab.id),
        clearSessionStorage(tab.id),
        clearIndexedDB(tab.id),
        clearCacheStorage(tab.id),
        clearServiceWorkers(tab.id),
        clearBrowsingCache(origin)
    ]);

    if (cookiePermissionGranted) {
        showMessage(t('message.allCleared'), 'success');
    } else {
        showMessage(t('message.allClearedWithoutCookie'), 'error');
    }
    await recordCleanupLog({
        domain,
        action: 'all',
        result: cookiePermissionGranted ? 'success' : 'partial',
        detail: cookiePermissionGranted ? '' : 'cookie_permission_missing'
    });

    await updateAllStats();
    await updateSitePermissionStatus();
    await updateWhitelistStatus();

    if (autoRefresh) {
        setTimeout(() => {
            chrome.tabs.reload(tab.id);
            window.close();
        }, 500);
    }
}
