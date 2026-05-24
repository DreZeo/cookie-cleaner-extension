import { CLEANUP_LOG_STORAGE_KEY } from './constants.js';
import { setStorageLocalValueStrict } from './storage.js';

const ALLOWED_MESSAGE_TYPES = new Set([
    'history_get',
    'history_clear',
    'whitelist_list',
    'whitelist_add',
    'whitelist_remove',
    'whitelist_check',
    'cleanup_log_add',
    'cleanup_log_list',
    'cleanup_log_clear'
]);

export function extensionRequest(type, payload = {}) {
    return new Promise((resolve, reject) => {
        try {
            if (!ALLOWED_MESSAGE_TYPES.has(type)) {
                reject(new Error(`unsupported message type: ${type}`));
                return;
            }
            chrome.runtime.sendMessage({ type, ...payload }, response => {
                const err = chrome.runtime?.lastError;
                if (err) {
                    reject(err);
                    return;
                }
                if (!response || !response.ok) {
                    reject(new Error(response?.error || `${type} failed`));
                    return;
                }
                resolve(response);
            });
        } catch (e) {
            reject(e);
        }
    });
}

export async function listWhitelistRules() {
    const response = await extensionRequest('whitelist_list');
    return Array.isArray(response.rules) ? response.rules : [];
}

export async function addWhitelistRule(domain, includeSubdomains) {
    const response = await extensionRequest('whitelist_add', { domain, includeSubdomains });
    return { rule: response.rule || null, rules: Array.isArray(response.rules) ? response.rules : [] };
}

export async function removeWhitelistRule(domain) {
    const response = await extensionRequest('whitelist_remove', { domain });
    return { removed: !!response.removed, rules: Array.isArray(response.rules) ? response.rules : [] };
}

export async function checkWhitelistDomain(domain) {
    const response = await extensionRequest('whitelist_check', { domain });
    return { protected: !!response.protected, rule: response.rule || null };
}

export async function appendCleanupLogEntry(entry) {
    await extensionRequest('cleanup_log_add', { entry });
}

export async function listCleanupLogs() {
    const response = await extensionRequest('cleanup_log_list');
    return Array.isArray(response.logs) ? response.logs : [];
}

export async function clearCleanupLogs() {
    try {
        await extensionRequest('cleanup_log_clear');
    } catch (err) {
        console.warn('cleanup_log_clear failed, fallback to local storage clear:', err);
        await setStorageLocalValueStrict({ [CLEANUP_LOG_STORAGE_KEY]: [] });
    }
}
