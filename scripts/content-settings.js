// ========== 网站内容设置（通知/弹窗/JS/图片/定位/摄像头/麦克风） ==========
// 使用 chrome.contentSettings API 读取和重置当前站点的内容设置。

export const CONTENT_SETTING_TYPES = [
    { id: 'notifications', icon: 'fa-bell', askSupported: true },
    { id: 'popups', icon: 'fa-window-restore', askSupported: false },
    { id: 'javascript', icon: 'fa-code', askSupported: false },
    { id: 'images', icon: 'fa-image', askSupported: false },
    { id: 'location', icon: 'fa-location-dot', askSupported: true },
    { id: 'camera', icon: 'fa-camera', askSupported: true },
    { id: 'microphone', icon: 'fa-microphone', askSupported: true }
];

export function isAskSupported(settingType) {
    return !!CONTENT_SETTING_TYPES.find(t => t.id === settingType)?.askSupported;
}

export function isContentSettingsAvailable() {
    return !!(chrome.contentSettings && CONTENT_SETTING_TYPES.every(
        t => chrome.contentSettings[t.id] && typeof chrome.contentSettings[t.id].get === 'function'
    ));
}

function getOriginPattern(url) {
    try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol)) return '';
        return `${parsed.origin}/*`;
    } catch {
        return '';
    }
}

function contentSettingGet(settingType, url) {
    return new Promise(resolve => {
        try {
            chrome.contentSettings[settingType].get({ primaryUrl: url }, result => {
                const err = chrome.runtime?.lastError;
                if (err) {
                    resolve({ setting: null, error: err.message || String(err) });
                    return;
                }
                resolve({ setting: result?.setting || null });
            });
        } catch (e) {
            resolve({ setting: null, error: String(e?.message || e) });
        }
    });
}

function contentSettingSet(settingType, primaryPattern, setting) {
    return new Promise((resolve, reject) => {
        try {
            chrome.contentSettings[settingType].set({
                primaryPattern,
                setting
            }, () => {
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

/**
 * 读取当前站点所有受支持内容设置的状态。
 * @returns {Promise<Array<{id: string, icon: string, setting: string|null, error?: string}>>}
 */
export async function getContentSettings(url) {
    if (!isContentSettingsAvailable() || !url) return [];
    const results = await Promise.all(CONTENT_SETTING_TYPES.map(async type => {
        const { setting, error } = await contentSettingGet(type.id, url);
        return { ...type, setting, error };
    }));
    return results;
}

/**
 * 将当前站点的某项内容设置显式设为 allow/block 等合法值。
 * 注意：Chrome contentSettings.set 不接受 'default'；要移除用户规则
 * 需用 clear({ scope }) 清除整类，或用此函数覆盖为新值。
 */
const ALLOWED_CONTENT_SETTINGS = new Set(['allow', 'block', 'ask']);

export async function setContentSettingForSite(settingType, url, value) {
    const pattern = getOriginPattern(url);
    if (!pattern) throw new Error('invalid url');
    if (!chrome.contentSettings?.[settingType]) throw new Error('content settings api unavailable');
    if (!ALLOWED_CONTENT_SETTINGS.has(String(value))) throw new Error(`invalid setting value: ${value}`);
    await contentSettingSet(settingType, pattern, value);
}
