import { getCurrentTab, getDomain, isUnsupportedPageUrl } from './utils.js';
import { t } from './i18n.js';

function isPermissionApiAvailable() {
    return !!chrome.permissions && typeof chrome.permissions.contains === 'function';
}

export function getSiteOriginPattern(url) {
    try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol)) return '';
        return `${parsed.origin}/*`;
    } catch {
        return '';
    }
}

function permissionsContains(details) {
    return new Promise(resolve => {
        if (!isPermissionApiAvailable()) {
            resolve(false);
            return;
        }
        try {
            chrome.permissions.contains(details, result => {
                const err = chrome.runtime?.lastError;
                if (err) {
                    console.warn('permissions.contains failed:', err);
                    resolve(false);
                    return;
                }
                resolve(!!result);
            });
        } catch (e) {
            console.warn('permissions.contains exception:', e);
            resolve(false);
        }
    });
}

function permissionsRequest(details) {
    return new Promise(resolve => {
        if (!isPermissionApiAvailable() || typeof chrome.permissions.request !== 'function') {
            resolve(false);
            return;
        }
        try {
            chrome.permissions.request(details, granted => {
                const err = chrome.runtime?.lastError;
                if (err) {
                    console.warn('permissions.request failed:', err);
                    resolve(false);
                    return;
                }
                resolve(!!granted);
            });
        } catch (e) {
            console.warn('permissions.request exception:', e);
            resolve(false);
        }
    });
}

function permissionsRemove(details) {
    return new Promise(resolve => {
        if (!isPermissionApiAvailable() || typeof chrome.permissions.remove !== 'function') {
            resolve(false);
            return;
        }
        try {
            chrome.permissions.remove(details, removed => {
                const err = chrome.runtime?.lastError;
                if (err) {
                    console.warn('permissions.remove failed:', err);
                    resolve(false);
                    return;
                }
                resolve(!!removed);
            });
        } catch (e) {
            console.warn('permissions.remove exception:', e);
            resolve(false);
        }
    });
}

export async function hasSitePermission(url) {
    const originPattern = getSiteOriginPattern(url);
    if (!originPattern) return false;
    return permissionsContains({ origins: [originPattern] });
}

export async function requestSitePermission(url) {
    const originPattern = getSiteOriginPattern(url);
    if (!originPattern) return false;
    return permissionsRequest({ origins: [originPattern] });
}

export async function revokeSitePermission(url) {
    const originPattern = getSiteOriginPattern(url);
    if (!originPattern) return false;
    return permissionsRemove({ origins: [originPattern] });
}

function setPermissionStatusBadge(granted, text) {
    const statusNode = document.getElementById('sitePermissionStatus');
    if (!statusNode) return;
    statusNode.classList.remove('granted', 'denied', 'unknown');
    statusNode.classList.add(granted === null ? 'unknown' : granted ? 'granted' : 'denied');
    statusNode.textContent = text;
}

export async function updateSitePermissionStatus() {
    const siteNode = document.getElementById('permissionSite');
    const detailNode = document.getElementById('sitePermissionDetail');
    const grantBtn = document.getElementById('grantSitePermissionBtn');
    const revokeBtn = document.getElementById('revokeSitePermissionBtn');

    if (!siteNode || !detailNode || !grantBtn || !revokeBtn) return;

    try {
        const tab = await getCurrentTab();
        const url = tab?.url || '';
        const domain = getDomain(url) || '-';
        siteNode.textContent = domain;

        if (!url || isUnsupportedPageUrl(url)) {
            setPermissionStatusBadge(null, t('permission.status.unavailable'));
            detailNode.textContent = t('permission.detail.unsupportedPage');
            grantBtn.disabled = true;
            revokeBtn.disabled = true;
            return;
        }

        const originPattern = getSiteOriginPattern(url);
        if (!originPattern) {
            setPermissionStatusBadge(null, t('permission.status.unavailable'));
            detailNode.textContent = t('permission.detail.invalidOrigin');
            grantBtn.disabled = true;
            revokeBtn.disabled = true;
            return;
        }

        const granted = await hasSitePermission(url);
        setPermissionStatusBadge(granted, granted ? t('permission.status.granted') : t('permission.status.denied'));
        detailNode.textContent = granted
            ? t('permission.detail.granted', { origin: originPattern })
            : t('permission.detail.denied', { origin: originPattern });
        grantBtn.disabled = granted;
        revokeBtn.disabled = !granted;
    } catch (e) {
        console.error('更新站点授权状态失败:', e);
        setPermissionStatusBadge(null, t('permission.status.error'));
        detailNode.textContent = t('permission.detail.readFailed');
    }
}
