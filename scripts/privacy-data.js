// ========== 全局隐私数据清理（表单自动填充 / 已保存密码） ==========
// 注意：chrome.browsingData.removeFormData / removePasswords 不支持 origins，
// 只能按时间范围进行全浏览器范围清理。扩展 API 也无法预览密码或表单内容。

import { toSafeTimeRangeMs } from './utils.js';
import {
    PRIVACY_ACTIONS,
    createPrivacyCapability,
    createPrivacyClearResult
} from './privacy-model.js';

export function isBrowsingDataAvailable() {
    return !!(chrome.browsingData
        && typeof chrome.browsingData.removeFormData === 'function'
        && typeof chrome.browsingData.removePasswords === 'function');
}

export function getPrivacyCapability(action, timeRangeMs) {
    return createPrivacyCapability(action, timeRangeMs, isBrowsingDataAvailable());
}

function removalOptions(timeRangeMs) {
    const safe = toSafeTimeRangeMs(timeRangeMs);
    if (safe > 0) {
        return { since: Date.now() - safe };
    }
    return { since: 0 };
}

function runRemoval(method, options) {
    return new Promise((resolve, reject) => {
        try {
            chrome.browsingData[method](options, () => {
                const err = chrome.runtime?.lastError;
                if (err) {
                    reject(new Error(err.message || String(err)));
                    return;
                }
                resolve();
            });
        } catch (e) {
            reject(e);
        }
    });
}

export async function clearFormData(timeRangeMs) {
    const safeTimeRangeMs = toSafeTimeRangeMs(timeRangeMs);
    if (!isBrowsingDataAvailable()) {
        return createPrivacyClearResult(PRIVACY_ACTIONS.FORM_DATA, safeTimeRangeMs, 'failed', 'browsingData API unavailable');
    }
    try {
        await runRemoval('removeFormData', removalOptions(safeTimeRangeMs));
        return createPrivacyClearResult(PRIVACY_ACTIONS.FORM_DATA, safeTimeRangeMs, 'success');
    } catch (e) {
        return createPrivacyClearResult(PRIVACY_ACTIONS.FORM_DATA, safeTimeRangeMs, 'failed', e?.message || e);
    }
}

export async function clearPasswords(timeRangeMs) {
    const safeTimeRangeMs = toSafeTimeRangeMs(timeRangeMs);
    if (!isBrowsingDataAvailable()) {
        return createPrivacyClearResult(PRIVACY_ACTIONS.PASSWORDS, safeTimeRangeMs, 'failed', 'browsingData API unavailable');
    }
    try {
        await runRemoval('removePasswords', removalOptions(safeTimeRangeMs));
        return createPrivacyClearResult(PRIVACY_ACTIONS.PASSWORDS, safeTimeRangeMs, 'success');
    } catch (e) {
        return createPrivacyClearResult(PRIVACY_ACTIONS.PASSWORDS, safeTimeRangeMs, 'failed', e?.message || e);
    }
}

/**
 * 打开浏览器内置设置页面进行预览。
 * page 应为相对路径，例如 'passwords' 或 'addresses'。
 */
export function openBrowserSettings(page) {
    const safePage = String(page || '').replace(/^\/+/, '');
    const url = `chrome://settings/${safePage}`;
    return new Promise((resolve, reject) => {
        try {
            chrome.tabs.create({ url }, () => {
                const err = chrome.runtime?.lastError;
                if (err) {
                    reject(new Error(err.message || String(err)));
                    return;
                }
                resolve();
            });
        } catch (e) {
            reject(e);
        }
    });
}
