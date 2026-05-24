// ========== chrome.storage.local 封装 ==========

const STORAGE_RETRY_COUNT = 2;
const STORAGE_RETRY_DELAY = 100;

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryOperation(operation, retries = STORAGE_RETRY_COUNT) {
    let lastError;
    for (let i = 0; i <= retries; i++) {
        try {
            return await operation();
        } catch (e) {
            lastError = e;
            if (i < retries) {
                await delay(STORAGE_RETRY_DELAY * (i + 1));
            }
        }
    }
    throw lastError;
}

export function getStorageLocalValue(key) {
    return new Promise((resolve, reject) => {
        try {
            chrome.storage.local.get([key], data => {
                const err = chrome.runtime?.lastError;
                if (err) {
                    reject(err);
                    return;
                }
                resolve(data?.[key]);
            });
        } catch (e) {
            reject(e);
        }
    });
}

export async function getStorageLocalValueLenient(key) {
    try {
        return await retryOperation(() => getStorageLocalValue(key));
    } catch (e) {
        console.warn('读取存储失败:', e);
        return undefined;
    }
}

export function setStorageLocalValue(value) {
    return new Promise((resolve, reject) => {
        try {
            chrome.storage.local.set(value, () => {
                const err = chrome.runtime?.lastError;
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        } catch (e) {
            reject(e);
        }
    });
}

export async function setStorageLocalValueLenient(value) {
    try {
        await retryOperation(() => setStorageLocalValue(value));
    } catch (e) {
        console.warn('保存存储失败:', e);
    }
}

export function setStorageLocalValueStrict(value) {
    return retryOperation(() => setStorageLocalValue(value));
}
