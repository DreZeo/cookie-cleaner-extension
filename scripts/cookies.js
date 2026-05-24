// ========== Cookie 分类与清理 ==========
// 第一方 (first-party)：Cookie 域名匹配当前站点（可选含父/子域名）
// 第三方 (third-party)：其他站点的 Cookie
// 白名单保护：匹配用户保护列表的第三方 Cookie 不参与清理

import { listWhitelistRules } from './bridge.js';

export function isFirstPartyCookie(cookie, domain, includeSubdomains) {
    if (!cookie?.domain || !domain) return false;
    const bare = cookie.domain.replace(/^\./, '');
    if (includeSubdomains) {
        return cookie.domain === domain ||
            cookie.domain === '.' + domain ||
            cookie.domain.endsWith('.' + domain) ||
            domain === bare ||
            domain.endsWith('.' + bare);
    }
    return cookie.domain === domain || cookie.domain === '.' + domain;
}

export function isCookieProtectedByWhitelist(cookie, whitelistRules) {
    if (!cookie?.domain) return false;
    const bare = cookie.domain.replace(/^\./, '').toLowerCase();
    return (whitelistRules || []).some(rule => {
        const ruleDomain = String(rule?.domain || '').toLowerCase();
        if (!ruleDomain) return false;
        if (rule.includeSubdomains) {
            return bare === ruleDomain || bare.endsWith('.' + ruleDomain);
        }
        return bare === ruleDomain;
    });
}

// 一次扫描中的分区支持探测；若浏览器不支持 { partitionKey: {} } 参数则缓存结果避免重复报错。
let partitionedCookiesSupported = true;

async function getPartitionedCookies() {
    if (!partitionedCookiesSupported) return [];
    try {
        // partitionKey: {} 返回所有分区 cookie（M118+ 支持 CHIPS）。
        // 旧版 Chrome/Edge 会抛错或忽略参数，下方 catch 会关闭该路径避免后续重复尝试。
        return await chrome.cookies.getAll({ partitionKey: {} });
    } catch (e) {
        partitionedCookiesSupported = false;
        console.warn('读取分区 Cookie 失败（可能浏览器版本不支持 CHIPS），已降级为仅处理非分区 Cookie:', e);
        return [];
    }
}

export async function getAllCookies() {
    try {
        const [unpartitioned, partitioned] = await Promise.all([
            chrome.cookies.getAll({}),
            getPartitionedCookies()
        ]);
        return [...(unpartitioned || []), ...(partitioned || [])];
    } catch (e) {
        console.warn('读取全部 Cookie 失败:', e);
        return [];
    }
}

export function getFirstPartyCookies(allCookies, domain, includeSubdomains) {
    return (allCookies || []).filter(cookie => isFirstPartyCookie(cookie, domain, includeSubdomains));
}

export async function getCookiesByParty(domain, includeSubdomains) {
    const [allCookies, whitelistRules] = await Promise.all([
        getAllCookies(),
        listWhitelistRules().catch(() => [])
    ]);

    const firstParty = [];
    const thirdParty = [];
    const thirdPartyProtected = [];

    for (const cookie of allCookies) {
        if (isFirstPartyCookie(cookie, domain, includeSubdomains)) {
            firstParty.push(cookie);
        } else if (isCookieProtectedByWhitelist(cookie, whitelistRules)) {
            thirdPartyProtected.push(cookie);
        } else {
            thirdParty.push(cookie);
        }
    }

    return { firstParty, thirdParty, thirdPartyProtected, all: allCookies };
}

export async function deleteCookie(cookie) {
    if (!cookie?.domain || !cookie?.name) return false;
    const protocol = cookie.secure ? 'https:' : 'http:';
    const url = `${protocol}//${cookie.domain.replace(/^\./, '')}${cookie.path || '/'}`;
    const removeDetails = {
        url,
        name: cookie.name,
        storeId: cookie.storeId
    };
    // 分区 Cookie (CHIPS) 必须带上 partitionKey，否则 Chrome 只会删非分区版本
    if (cookie.partitionKey) {
        removeDetails.partitionKey = cookie.partitionKey;
    }
    try {
        await chrome.cookies.remove(removeDetails);
        return true;
    } catch (e) {
        console.warn('删除 Cookie 失败:', cookie.domain, cookie.name, e);
        return false;
    }
}

export async function clearFirstPartyCookies(domain, includeSubdomains) {
    const allCookies = await getAllCookies();
    const firstParty = getFirstPartyCookies(allCookies, domain, includeSubdomains);
    await Promise.all(firstParty.map(deleteCookie));
    return firstParty.length;
}
