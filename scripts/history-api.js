// ========== chrome.history API 封装（popup 与 service worker 共用） ==========
// 本模块不依赖 DOM，可安全在 service worker 环境导入。

export function historySearch(query) {
    return new Promise((resolve, reject) => {
        try {
            chrome.history.search(query, results => {
                const err = chrome.runtime?.lastError;
                if (err) {
                    reject(err);
                    return;
                }
                resolve(results || []);
            });
        } catch (e) {
            reject(e);
        }
    });
}

export function historyDeleteUrl(url) {
    return new Promise(resolve => {
        try {
            chrome.history.deleteUrl({ url }, () => {
                resolve(!chrome.runtime?.lastError);
            });
        } catch {
            resolve(false);
        }
    });
}
