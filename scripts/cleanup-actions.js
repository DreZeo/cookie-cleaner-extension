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
    scanCleanupState,
    summarizeCleanupRescan,
    updateAllStats
} from './cleanup.js';

function getCleanupTypesForAction(type) {
    if (type === 'all') {
        return ['cookies', 'localStorage', 'sessionStorage', 'indexedDB', 'cacheStorage', 'serviceWorker'];
    }
    return [type];
}

function getCleanupResultMessage(type, result, cleanedCount = null) {
    if (result === 'failed') return t('message.clearFailedAfterRescan');
    if (result === 'partial') return t('message.clearPartialAfterRescan');

    switch (type) {
        case 'cookies':
            return t('message.cookiesCleared', { count: cleanedCount ?? 0 });
        case 'localStorage':
            return t('message.localStorageCleared');
        case 'sessionStorage':
            return t('message.sessionStorageCleared');
        case 'indexedDB':
            return t('message.indexedDBCleared');
        case 'cacheStorage':
            return t('message.cacheStorageCleared');
        case 'serviceWorker':
            return t('message.serviceWorkerCleared');
        case 'all':
            return t('message.allCleared');
        default:
            return t('message.clearFailed');
    }
}

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

    let executed = false;
    let cleanedCount = null;

    switch (type) {
        case 'cookies': {
            let sitePermissionGranted = await hasSitePermission(tab.url);
            if (!sitePermissionGranted) {
                sitePermissionGranted = await requestSitePermission(tab.url);
                await updateSitePermissionStatus();
            }

            if (!sitePermissionGranted) {
                showMessage(t('message.permissionRequiredCookieClear'), 'error');
                await recordCleanupLog({
                    domain,
                    action: type,
                    result: 'failed',
                    detail: 'cookie_permission_missing'
                });
                return;
            }

            const count = await clearCookies(domain, includeSubdomains);
            executed = true;
            cleanedCount = count;
            break;
        }
        case 'localStorage':
            executed = await clearLocalStorage(tab.id);
            break;
        case 'sessionStorage':
            executed = await clearSessionStorage(tab.id);
            break;
        case 'indexedDB':
            executed = await clearIndexedDB(tab.id);
            break;
        case 'cacheStorage':
            executed = await clearCacheStorage(tab.id);
            break;
        case 'serviceWorker':
            executed = await clearServiceWorkers(tab.id);
            break;
        default:
            // 未知 type：出现此分支说明调用方与 UI 对不上号（比如新增了 cache-card 类型但忘了接入）。
            // 直接告警并提前返回，避免走到下面 showMessage 弹空文案 + 写入无意义 failed 日志。
            console.warn('clearByType: 收到未知的清理类型', type);
            return;
    }

    let summary = { result: 'failed', failures: [type], remaining: [] };
    if (executed) {
        const postScan = await scanCleanupState(tab, includeSubdomains);
        summary = summarizeCleanupRescan(postScan, getCleanupTypesForAction(type));
    }
    const message = getCleanupResultMessage(type, summary.result, cleanedCount);
    showMessage(message, summary.result === 'success' ? 'success' : 'error');
    await recordCleanupLog({
        domain,
        action: type,
        result: summary.result,
        count: cleanedCount,
        detail: summary.result === 'success'
            ? ''
            : [...summary.failures, ...summary.remaining].join(',') || message
    });

    await updateAllStats();
    await updateSitePermissionStatus();
    await updateWhitelistStatus();
    if (summary.result !== 'failed' && autoRefresh) {
        setTimeout(() => {
            chrome.tabs.reload(tab.id);
            window.close();
        }, 500);
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

    const executionResults = await Promise.all([
        cookieTask.then(() => cookiePermissionGranted),
        clearLocalStorage(tab.id),
        clearSessionStorage(tab.id),
        clearIndexedDB(tab.id),
        clearCacheStorage(tab.id),
        clearServiceWorkers(tab.id),
        clearBrowsingCache(origin)
    ]);

    const postScan = await scanCleanupState(tab, includeSubdomains);
    const summary = summarizeCleanupRescan(postScan, getCleanupTypesForAction('all'));
    const hasExecutionFailure = executionResults.some(result => !result);
    const result = hasExecutionFailure && summary.result === 'success' ? 'partial' : summary.result;
    showMessage(
        result === 'success'
            ? t('message.allCleared')
            : cookiePermissionGranted
                ? t('message.clearPartialAfterRescan')
                : t('message.allClearedWithoutCookie'),
        result === 'success' ? 'success' : 'error'
    );
    await recordCleanupLog({
        domain,
        action: 'all',
        result,
        detail: result === 'success'
            ? ''
            : [...summary.failures, ...summary.remaining, cookiePermissionGranted ? '' : 'cookie_permission_missing']
                .filter(Boolean)
                .join(',')
    });

    await updateAllStats();
    await updateSitePermissionStatus();
    await updateWhitelistStatus();

    if (result !== 'failed' && autoRefresh) {
        setTimeout(() => {
            chrome.tabs.reload(tab.id);
            window.close();
        }, 500);
    }
}
