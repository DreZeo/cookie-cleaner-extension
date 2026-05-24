// ========== 无痕退出：当前站点六维深度清理 ==========
// 并行执行：Cookie + 所有本地存储 + 浏览记录 + 内容设置重置 + 撤销主机权限。
// 失败项聚合为 failures 数组，不阻断其他步骤。

import {
    clearBrowsingCache,
    clearCacheStorage,
    clearCookies,
    clearIndexedDB,
    clearLocalStorage,
    clearServiceWorkers,
    clearSessionStorage
} from './cleanup.js';
import { clearHistory } from './history.js';
import {
    CONTENT_SETTING_TYPES,
    isAskSupported,
    isContentSettingsAvailable,
    setContentSettingForSite
} from './content-settings.js';
import {
    hasSitePermission,
    requestSitePermission,
    revokeSitePermission
} from './permissions.js';
import { checkWhitelistDomain } from './bridge.js';
import {
    getDomain,
    getOrigin,
    isUnsupportedPageUrl,
    normalizeDomain,
    toSafeTimeRangeMs
} from './utils.js';

async function tryStep(label, failures, runner) {
    try {
        return await runner();
    } catch (e) {
        console.warn(`guest-mode step failed [${label}]:`, e);
        failures.push(label);
        return null;
    }
}

async function resetContentSettingsForSite(url) {
    if (!isContentSettingsAvailable()) return 0;
    let resetCount = 0;
    await Promise.all(CONTENT_SETTING_TYPES.map(async type => {
        // 仅支持 ask 的类型能恢复到"询问"态；其他 (popups/javascript/images) 跳过
        if (!isAskSupported(type.id)) return;
        try {
            await setContentSettingForSite(type.id, url, 'ask');
            resetCount += 1;
        } catch (e) {
            console.warn(`重置内容设置 ${type.id} 失败:`, e);
        }
    }));
    return resetCount;
}

// 无痕退出步骤列表（执行顺序无关，仅用于计数与状态判定）
const GUEST_MODE_STEPS = [
    'cookies',
    'localStorage',
    'sessionStorage',
    'indexedDB',
    'cacheStorage',
    'serviceWorker',
    'browsingCache',
    'history',
    'contentSettings',
    'revokePermission'
];
const GUEST_MODE_TOTAL_STEPS = GUEST_MODE_STEPS.length;

function buildGuestModeResult(extra = {}) {
    return {
        status: 'failed',
        failures: [],
        totalSteps: GUEST_MODE_TOTAL_STEPS,
        successSteps: 0,
        cookieCount: null,
        historyCount: null,
        contentSettingsReset: 0,
        ...extra
    };
}

/**
 * 执行无痕退出清理。
 * @param {chrome.tabs.Tab} tab 当前活动标签页
 * @param {{ timeRangeMs?: number, overrideWhitelist?: boolean }} options
 * @returns {Promise<{ status: 'blocked'|'success'|'partial'|'failed', failures: string[],
 *                    totalSteps: number, successSteps: number,
 *                    cookieCount: number|null, historyCount: number|null, contentSettingsReset: number }>}
 */
export async function runGuestMode(tab, options = {}) {
    const url = tab?.url || '';
    const domain = normalizeDomain(getDomain(url));
    const origin = getOrigin(url);
    const timeRangeMs = toSafeTimeRangeMs(options.timeRangeMs);
    const overrideWhitelist = !!options.overrideWhitelist;

    if (!url || isUnsupportedPageUrl(url) || !domain) {
        return buildGuestModeResult({ status: 'failed', failures: ['unsupportedPage'] });
    }

    if (!options.overrideWhitelist) {
        // 无痕退出是浏览器级深度清理，保留白名单默认保护。
        // 只有用户主动勾选忽略白名单时才允许继续。
    }

    if (!overrideWhitelist) {
        try {
            const whitelist = await checkWhitelistDomain(domain);
            if (whitelist.protected) {
                return buildGuestModeResult({
                    status: 'blocked',
                    failures: ['whitelist'],
                    whitelistRule: whitelist.rule || null
                });
            }
        } catch (e) {
            console.warn('guest-mode 白名单检查失败，按不受保护处理:', e);
        }
    }

    // 预先在用户手势上下文中确保 host 权限；若放到 Promise.all 内部可能因多层 await 丢失手势，
    // 导致 chrome.permissions.request 不弹窗直接返回 false。
    let hasHostPermission = await hasSitePermission(url);
    if (!hasHostPermission) {
        try {
            hasHostPermission = await requestSitePermission(url);
        } catch (e) {
            console.warn('guest-mode 请求 host 权限失败:', e);
            hasHostPermission = false;
        }
    }

    const failures = [];
    let cookieCount = null;
    let historyCount = null;
    let contentSettingsReset = 0;

    const tabId = tab.id;
    const includeSubdomains = true;

    await Promise.all([
        tryStep('cookies', failures, async () => {
            if (!hasHostPermission) {
                // 标记为失败步骤但不再让 tryStep 重复 push（通过 throw 让 tryStep 记录唯一一条）
                throw new Error('cookiesNoPermission');
            }
            cookieCount = await clearCookies(domain, includeSubdomains);
        }),
        tryStep('localStorage', failures, () => clearLocalStorage(tabId)),
        tryStep('sessionStorage', failures, () => clearSessionStorage(tabId)),
        tryStep('indexedDB', failures, () => clearIndexedDB(tabId)),
        tryStep('cacheStorage', failures, () => clearCacheStorage(tabId)),
        tryStep('serviceWorker', failures, () => clearServiceWorkers(tabId)),
        tryStep('browsingCache', failures, () => origin ? clearBrowsingCache(origin) : Promise.resolve()),
        tryStep('history', failures, async () => {
            const summary = await clearHistory(domain, timeRangeMs, includeSubdomains);
            historyCount = Number.isFinite(Number(summary?.deletedCount)) ? Number(summary.deletedCount) : 0;
            if (!summary || summary.result === 'failed') {
                throw new Error('historyClearFailed');
            }
            if (summary.result === 'partial') {
                failures.push('historyPartial');
            }
        }),
        tryStep('contentSettings', failures, async () => {
            contentSettingsReset = await resetContentSettingsForSite(url);
        })
    ]);

    // 撤销主机权限放在最后（否则其他步骤无法访问 cookies/storage）
    await tryStep('revokePermission', failures, async () => {
        await revokeSitePermission(url);
    });

    const successSteps = Math.max(0, GUEST_MODE_TOTAL_STEPS - failures.length);
    let status;
    if (failures.length === 0) {
        status = 'success';
    } else if (successSteps === 0) {
        status = 'failed';
    } else {
        status = 'partial';
    }

    return {
        status,
        failures,
        totalSteps: GUEST_MODE_TOTAL_STEPS,
        successSteps,
        cookieCount,
        historyCount,
        contentSettingsReset
    };
}
