export const THEME_STORAGE_KEY = 'popupTheme';
export const ACTIVE_TAB_STORAGE_KEY = 'popupActiveTab';
export const LANGUAGE_STORAGE_KEY = 'popupLanguage';
export const CLEANUP_LOG_STORAGE_KEY = 'cleanupLogs';
export const DEFAULT_TAB_ID = 'cleanupTab';
export const TAB_IDS = ['cleanupTab', 'historyTab', 'permissionTab', 'privacyTab'];
export const DEFAULT_LANGUAGE = 'zh';
export const HISTORY_MAX_RESULTS = 5000;

export const CLEANUP_ACTION_TEXT_KEYS = {
    cookies: 'cleanup.action.cookies',
    localStorage: 'cleanup.action.localStorage',
    sessionStorage: 'cleanup.action.sessionStorage',
    indexedDB: 'cleanup.action.indexedDB',
    cacheStorage: 'cleanup.action.cacheStorage',
    serviceWorker: 'cleanup.action.serviceWorker',
    all: 'cleanup.action.all',
    history: 'cleanup.action.history',
    formData: 'cleanup.action.formData',
    passwords: 'cleanup.action.passwords',
    guestMode: 'cleanup.action.guestMode',
    unknown: 'cleanup.action.unknown'
};
