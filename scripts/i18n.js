import { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY } from './constants.js';
import { getStorageLocalValueLenient, setStorageLocalValueLenient } from './storage.js';
import { setNodeText } from './utils.js';
import { applyTheme, getCurrentTheme } from './theme.js';

const I18N_TEXT = {
    zh: {
        'app.title': '缓存清理专家',
        'language.current': 'EN',
        'language.switchTitle': '切换语言',
        'theme.light': '浅色',
        'theme.dark': '深色',
        'theme.switchTitle': '切换主题',
        'theme.switchAria': '切换深浅主题',
        'domain.scanning': '正在扫描...',
        'domain.unavailable': '无法获取',
        'tabs.ariaLabel': '功能导航',
        'tab.cleanup': '清理',
        'tab.history': '记录',
        'tab.permission': '权限',
        'tab.privacy': '资料',
        'clearItem.title': '清除此项',
        'card.cookies': 'Cookie 缓存',
        'card.localStorage': '本地存储',
        'card.sessionStorage': '会话存储',
        'card.indexedDB': 'IndexedDB',
        'card.cacheStorage': '缓存存储',
        'card.serviceWorker': 'SW 服务',
        'card.serviceWorkerMeta': 'Worker 线程',
        'btn.refresh': '重新扫描',
        'btn.clearAll': '一键清理',
        'history.title': '浏览记录',
        'history.range.1h': '过去一小时',
        'history.range.24h': '过去 24 小时',
        'history.range.7d': '过去 7 天',
        'history.range.4w': '过去 4 周',
        'history.range.all': '所有时间',
        'btn.clear': '清除',
        'resources.title': '页面资源占用',
        'resources.image': '图片',
        'resources.script': '脚本',
        'resources.style': '样式',
        'resources.other': '其他',
        'permission.title': '当前站点访问（Cookie）',
        'permission.status.checking': '检测中',
        'permission.status.unavailable': '不可用',
        'permission.status.granted': '已允许访问',
        'permission.status.denied': '未允许访问',
        'permission.status.error': '错误',
        'permission.detail.loading': '正在读取当前站点访问授权状态...',
        'permission.detail.unsupportedPage': '该页面类型不支持当前站点访问授权管理。此授权仅用于 Cookie 读取/清理，请在 http/https 网页操作。',
        'permission.detail.invalidOrigin': '当前站点无法转换为访问授权规则。此授权仅用于 Cookie 读取/清理。',
        'permission.detail.readFailed': '读取当前站点访问授权状态失败。',
        'permission.detail.granted': '已允许访问：{origin}。该授权用于当前站点 Cookie 的读取与清理。',
        'permission.detail.denied': '尚未允许访问：{origin}。授权后可读取与清理当前站点 Cookie。',
        'whitelist.title': '当前站点清理保护',
        'whitelist.status.checking': '检测中',
        'whitelist.status.protected': '已保护',
        'whitelist.status.unprotected': '未保护',
        'whitelist.status.unavailable': '不可用',
        'whitelist.status.error': '错误',
        'whitelist.detail.loading': '正在读取站点保护状态...',
        'whitelist.detail.unsupportedPage': '该页面类型不支持站点保护判断，请在 http/https 网页操作。',
        'whitelist.detail.protected': '命中保护规则：{domain} {scope}',
        'whitelist.detail.unprotected': '当前站点不在保护列表中，可正常执行清理。',
        'whitelist.detail.readFailed': '读取站点保护状态失败。',
        'whitelist.btn.add': '加入保护',
        'whitelist.btn.remove': '取消保护',
        'whitelist.list.summary': '已保护 {count} 个站点',
        'whitelist.list.empty': '暂无保护站点',
        'contentSettings.title': '浏览器内容设置（当前站点）',
        'contentSettings.loading': '正在读取内容设置...',
        'contentSettings.unsupportedPage': '该页面不支持内容设置，请在 http/https 页面操作。',
        'contentSettings.unavailable': '当前浏览器不支持 contentSettings API。',
        'contentSettings.empty': '当前站点没有自定义内容设置。',
        'contentSettings.summary': '{count} 项自定义设置',
        'contentSettings.type.notifications': '通知',
        'contentSettings.type.popups': '弹窗',
        'contentSettings.type.javascript': 'JavaScript',
        'contentSettings.type.images': '图片',
        'contentSettings.type.location': '地理位置',
        'contentSettings.type.camera': '摄像头',
        'contentSettings.type.microphone': '麦克风',
        'contentSettings.status.allow': '允许',
        'contentSettings.status.block': '拦截',
        'contentSettings.status.ask': '询问',
        'contentSettings.status.session_only': '仅本会话',
        'contentSettings.status.default': '默认',
        'message.contentSettingsUpdated': '《{type}》已设为 {status}',
        'message.contentSettingsUpdateFailed': '设置内容权限失败',
        'message.contentSettingsAskUnsupported': '《{type}》不支持询问态，请切换到其他状态',
        'contentSettings.toggleOffHint': '再次点击可恢复为询问',
        'whitelist.scope.subdomains': '含子域名',
        'whitelist.scope.exact': '仅主域',
        'permission.btn.grant': '授权访问',
        'permission.btn.revoke': '撤销访问',
        'btn.remove': '移除',
        'option.includeSubdomains': '包含所有子域名数据',
        'option.autoRefresh': '清理后自动刷新页面',
        'cleanup.action.cookies': 'Cookie 清理',
        'cleanup.action.localStorage': '本地存储清理',
        'cleanup.action.sessionStorage': '会话存储清理',
        'cleanup.action.indexedDB': 'IndexedDB 清理',
        'cleanup.action.cacheStorage': '缓存存储清理',
        'cleanup.action.serviceWorker': 'Service Worker 清理',
        'cleanup.action.all': '一键清理',
        'cleanup.action.history': '浏览记录清理',
        'cleanup.action.formData': '表单填充数据清理',
        'cleanup.action.passwords': '保存密码清理',
        'cleanup.action.guestMode': '访客模式',
        'cleanup.action.unknown': '未知清理项',
        'cleanup.log.title': '清理历史日志',
        'cleanup.log.summary': '最近 {count} 条',
        'cleanup.log.empty': '暂无清理记录',
        'cleanup.log.filter.all': '全部',
        'cleanup.log.filter.success': '成功',
        'cleanup.log.filter.failed': '失败',
        'cleanup.log.filter.blocked': '拦截',
        'cleanup.log.clear': '清空',
        'cleanup.log.result.success': '成功',
        'cleanup.log.result.partial': '部分成功',
        'cleanup.log.result.failed': '失败',
        'cleanup.log.result.blocked': '已拦截',
        'cleanup.log.count': '数量 {count}',
        'cleanup.log.time': '{time}',
        'message.unsupportedPageStats': '无法在该页面获取缓存信息',
        'cookie.unauthorized': '未允许访问',
        'scan.status.noPermission': '未允许访问',
        'scan.status.failed': '扫描失败',
        'indexedDB.count': '{count} 个数据库',
        'cacheStorage.entries': '{count} 条目',
        'history.count': '{count} 项',
        'history.countTruncated': '{count}+ 项，可能未完整统计',
        'history.error': '错误',
        'message.permissionRequiredCookieClear': '需要当前站点访问授权才能清理 Cookie',
        'message.cookiesCleared': '已清除 {count} 个 Cookie',
        'message.localStorageCleared': '已清除 本地存储',
        'message.sessionStorageCleared': '已清除 会话存储',
        'message.indexedDBCleared': '已清除 IndexedDB 数据库',
        'message.cacheStorageCleared': '已清除 缓存存储',
        'message.serviceWorkerCleared': '已注销 Service Worker',
        'message.clearFailed': '清除失败',
        'message.clearPartialAfterRescan': '清理已执行，但复扫仍发现残留或部分项目无法确认',
        'message.clearFailedAfterRescan': '清理后复扫仍发现残留，清除失败',
        'message.allCleared': '已清除所有缓存数据！',
        'message.allClearedWithoutCookie': '已清除除 Cookie 外的数据（当前站点未授权）',
        'message.pageNoPermissionSupport': '当前页面不支持当前站点访问授权',
        'message.siteGranted': '已允许访问当前站点（Cookie）',
        'message.siteDenied': '当前站点访问授权被拒绝',
        'message.siteRevoked': '已撤销当前站点访问授权',
        'message.siteRevokeFailed': '撤销当前站点访问授权失败，或该站点原本未授权',
        'message.historyUnsupportedPage': '请在普通网页中操作浏览记录清理',
        'message.historyCleared': '已清除 {count} 条浏览记录',
        'message.historyClearPartial': '已清除 {count} 条浏览记录，但复扫仍发现残留',
        'message.historyClearFailedAfterRescan': '清除浏览记录失败，复扫仍发现残留',
        'message.historyClearFailed': '清除浏览记录失败',
        'message.whitelistBlockedAction': '当前站点受保护，已阻止 {action}',
        'message.whitelistUnsupportedPage': '当前页面不支持站点保护操作',
        'message.whitelistAdded': '已加入站点保护列表',
        'message.whitelistAddFailed': '加入保护列表失败',
        'message.whitelistRemoved': '已从保护列表移除',
        'message.whitelistRemoveFailed': '移除保护失败',
        'message.cleanupLogCleared': '已清空清理日志',
        'message.cleanupLogClearFailed': '清空清理日志失败',
        'message.highRiskConfirmTitle': '请确认高风险操作',
        'message.highRiskConfirmAll': '这会清除当前站点相关的本地数据、缓存、历史和权限，请确认继续。',
        'message.highRiskConfirmHistory': '这会清除当前站点 {domain} 的浏览记录，请确认继续。',
        'message.highRiskConfirmFormData': '这会清除整个浏览器的自动填充数据，请确认继续。',
        'message.highRiskConfirmPasswords': '这会清除整个浏览器保存的密码，请确认继续。',
        'message.highRiskConfirmGuestMode': '这会对当前站点执行深度清理并撤销授权，请确认继续。',
        'privacy.scopeNotice': '以下操作作用于整个浏览器，不受当前站点限制',
        'privacy.formData.title': '自动填充数据',
        'privacy.formData.desc': '地址、支付、姓名等浏览器自动填充内容',
        'privacy.passwords.title': '保存的密码',
        'privacy.passwords.desc': '浏览器存储的登录凭据，清除后需重新登录所有站点',
        'privacy.timeRange.title': '清理时间范围',
        'privacy.timeRange.desc': '应用于以上两项清理操作',
        'privacy.btn.view': '在浏览器中查看',
        'privacy.btn.clear': '清除',
        'privacy.btn.confirm': '再次点击确认 ({seconds}s)',
        'message.formDataCleared': '已清除表单填充数据',
        'message.passwordsCleared': '已清除保存的密码',
        'message.privacyClearFailed': '清除失败',
        'message.privacyUnavailable': '当前浏览器不支持此操作',
        'message.privacyOpenSettingsFailed': '无法打开浏览器设置页，请手动访问',
        'guest.title': '访客模式',
        'guest.desc': '一键清除当前站点所有本地数据、浏览记录与授权',
        'guest.target': '目标：{domain}',
        'guest.targetUnavailable': '请在 http/https 网页中启动访客模式',
        'guest.overrideWhitelist': '忽略白名单强制清理',
        'guest.btn': '启动访客模式',
        'guest.timeRange.label': '浏览记录时间范围',
        'message.guestModeDone': '访客模式完成，共执行 {count} 项清理',
        'message.guestModePartial': '访客模式部分完成，失败项：{failures}',
        'message.guestModeFailed': '访客模式执行失败',
        'message.guestModeBlockedByWhitelist': '当前站点受白名单保护，勾选“忽略白名单”可继续',
        'message.guestModeUnsupportedPage': '该页面不支持访客模式'
    },
    en: {
        'app.title': 'Cache Cleaner Pro',
        'language.current': '中',
        'language.switchTitle': 'Switch language',
        'theme.light': 'Light',
        'theme.dark': 'Dark',
        'theme.switchTitle': 'Switch theme',
        'theme.switchAria': 'Switch between light and dark themes',
        'domain.scanning': 'Scanning...',
        'domain.unavailable': 'Unavailable',
        'tabs.ariaLabel': 'Feature navigation',
        'tab.cleanup': 'Cleanup',
        'tab.history': 'History',
        'tab.permission': 'Permissions',
        'tab.privacy': 'Privacy',
        'clearItem.title': 'Clear this item',
        'card.cookies': 'Cookie Cache',
        'card.localStorage': 'Local Storage',
        'card.sessionStorage': 'Session Storage',
        'card.indexedDB': 'IndexedDB',
        'card.cacheStorage': 'Cache Storage',
        'card.serviceWorker': 'Service Worker',
        'card.serviceWorkerMeta': 'Worker Threads',
        'btn.refresh': 'Rescan',
        'btn.clearAll': 'Clear All',
        'history.title': 'Browsing History',
        'history.range.1h': 'Past hour',
        'history.range.24h': 'Past 24 hours',
        'history.range.7d': 'Past 7 days',
        'history.range.4w': 'Past 4 weeks',
        'history.range.all': 'All time',
        'btn.clear': 'Clear',
        'resources.title': 'Page Resource Usage',
        'resources.image': 'Images',
        'resources.script': 'Scripts',
        'resources.style': 'Styles',
        'resources.other': 'Other',
        'permission.title': 'Current Site Access (Cookies)',
        'permission.status.checking': 'Checking',
        'permission.status.unavailable': 'Unavailable',
        'permission.status.granted': 'Access granted',
        'permission.status.denied': 'Access not granted',
        'permission.status.error': 'Error',
        'permission.detail.loading': 'Loading current-site access status...',
        'permission.detail.unsupportedPage': 'This page type does not support current-site access management. This access is only used for cookie read/clear on http/https pages.',
        'permission.detail.invalidOrigin': 'The current site cannot be converted to an access rule. This access is only used for cookie read/clear.',
        'permission.detail.readFailed': 'Failed to read current-site access status.',
        'permission.detail.granted': 'Allowed origin: {origin}. This access is used to read and clear cookies for the current site.',
        'permission.detail.denied': 'Access not granted for {origin}. Grant access to read and clear cookies for the current site.',
        'whitelist.title': 'Current Site Cleanup Protection',
        'whitelist.status.checking': 'Checking',
        'whitelist.status.protected': 'Protected',
        'whitelist.status.unprotected': 'Unprotected',
        'whitelist.status.unavailable': 'Unavailable',
        'whitelist.status.error': 'Error',
        'whitelist.detail.loading': 'Loading site protection status...',
        'whitelist.detail.unsupportedPage': 'This page type does not support site protection checks. Open an http/https webpage.',
        'whitelist.detail.protected': 'Matched protected rule: {domain} {scope}',
        'whitelist.detail.unprotected': 'This site is not protected and can be cleaned.',
        'whitelist.detail.readFailed': 'Failed to read site protection status.',
        'whitelist.btn.add': 'Protect',
        'whitelist.btn.remove': 'Unprotect',
        'whitelist.list.summary': '{count} protected sites',
        'whitelist.list.empty': 'No protected sites yet',
        'contentSettings.title': 'Browser Content Settings (Current Site)',
        'contentSettings.loading': 'Loading content settings...',
        'contentSettings.unsupportedPage': 'This page does not support content settings. Open an http/https page.',
        'contentSettings.unavailable': 'This browser does not support the contentSettings API.',
        'contentSettings.empty': 'No custom content settings for this site.',
        'contentSettings.summary': '{count} custom settings',
        'contentSettings.type.notifications': 'Notifications',
        'contentSettings.type.popups': 'Pop-ups',
        'contentSettings.type.javascript': 'JavaScript',
        'contentSettings.type.images': 'Images',
        'contentSettings.type.location': 'Location',
        'contentSettings.type.camera': 'Camera',
        'contentSettings.type.microphone': 'Microphone',
        'contentSettings.status.allow': 'Allow',
        'contentSettings.status.block': 'Block',
        'contentSettings.status.ask': 'Ask',
        'contentSettings.status.session_only': 'Session only',
        'contentSettings.status.default': 'Default',
        'message.contentSettingsUpdated': '“{type}” set to {status}',
        'message.contentSettingsUpdateFailed': 'Failed to update content setting',
        'message.contentSettingsAskUnsupported': '“{type}” does not support an “ask” state',
        'contentSettings.toggleOffHint': 'Click again to revert to Ask',
        'whitelist.scope.subdomains': 'incl. subdomains',
        'whitelist.scope.exact': 'exact only',
        'permission.btn.grant': 'Grant access',
        'permission.btn.revoke': 'Revoke access',
        'btn.remove': 'Remove',
        'option.includeSubdomains': 'Include all subdomain data',
        'option.autoRefresh': 'Auto refresh page after cleanup',
        'cleanup.action.cookies': 'cookie cleanup',
        'cleanup.action.localStorage': 'local storage cleanup',
        'cleanup.action.sessionStorage': 'session storage cleanup',
        'cleanup.action.indexedDB': 'IndexedDB cleanup',
        'cleanup.action.cacheStorage': 'cache storage cleanup',
        'cleanup.action.serviceWorker': 'service worker cleanup',
        'cleanup.action.all': 'clear all',
        'cleanup.action.history': 'history cleanup',
        'cleanup.action.formData': 'form data cleanup',
        'cleanup.action.passwords': 'saved passwords cleanup',
        'cleanup.action.guestMode': 'guest mode',
        'cleanup.action.unknown': 'unknown cleanup action',
        'cleanup.log.title': 'Cleanup History',
        'cleanup.log.summary': 'Recent {count}',
        'cleanup.log.empty': 'No cleanup logs yet',
        'cleanup.log.filter.all': 'All',
        'cleanup.log.filter.success': 'Success',
        'cleanup.log.filter.failed': 'Failed',
        'cleanup.log.filter.blocked': 'Blocked',
        'cleanup.log.clear': 'Clear',
        'cleanup.log.result.success': 'Success',
        'cleanup.log.result.partial': 'Partial',
        'cleanup.log.result.failed': 'Failed',
        'cleanup.log.result.blocked': 'Blocked',
        'cleanup.log.count': 'Count {count}',
        'cleanup.log.time': '{time}',
        'message.unsupportedPageStats': 'Cannot inspect cache on this page',
        'cookie.unauthorized': 'Access not granted',
        'scan.status.noPermission': 'Access not granted',
        'scan.status.failed': 'Scan failed',
        'indexedDB.count': '{count} databases',
        'cacheStorage.entries': '{count} entries',
        'history.count': '{count} items',
        'history.countTruncated': '{count}+ items, scan may be incomplete',
        'history.error': 'Error',
        'message.permissionRequiredCookieClear': 'Current-site access is required to clear cookies',
        'message.cookiesCleared': 'Cleared {count} cookies',
        'message.localStorageCleared': 'Cleared local storage',
        'message.sessionStorageCleared': 'Cleared session storage',
        'message.indexedDBCleared': 'Cleared IndexedDB databases',
        'message.cacheStorageCleared': 'Cleared cache storage',
        'message.serviceWorkerCleared': 'Service workers unregistered',
        'message.clearFailed': 'Cleanup failed',
        'message.clearPartialAfterRescan': 'Cleanup ran, but rescan found remaining data or unverifiable items',
        'message.clearFailedAfterRescan': 'Rescan still found remaining data after cleanup',
        'message.allCleared': 'All cache data has been cleared!',
        'message.allClearedWithoutCookie': 'Cleared everything except cookies (site not granted)',
        'message.pageNoPermissionSupport': 'This page does not support current-site access control',
        'message.siteGranted': 'Current-site cookie access granted',
        'message.siteDenied': 'Current-site access request denied',
        'message.siteRevoked': 'Current-site access revoked',
        'message.siteRevokeFailed': 'Failed to revoke current-site access or it was not granted',
        'message.historyUnsupportedPage': 'Please clear history on a regular webpage',
        'message.historyCleared': 'Cleared {count} history entries',
        'message.historyClearPartial': 'Cleared {count} history entries, but rescan found remaining items',
        'message.historyClearFailedAfterRescan': 'Failed to clear browsing history; rescan still found remaining items',
        'message.historyClearFailed': 'Failed to clear browsing history',
        'message.whitelistBlockedAction': 'This site is protected. Blocked: {action}',
        'message.whitelistUnsupportedPage': 'This page does not support site protection actions',
        'message.whitelistAdded': 'Added to protection list',
        'message.whitelistAddFailed': 'Failed to add protection',
        'message.whitelistRemoved': 'Removed from protection list',
        'message.whitelistRemoveFailed': 'Failed to remove protection',
        'message.cleanupLogCleared': 'Cleanup logs cleared',
        'message.cleanupLogClearFailed': 'Failed to clear cleanup logs',
        'message.highRiskConfirmTitle': 'Confirm high-risk action',
        'message.highRiskConfirmAll': 'This will clear local data, cache, history and permissions for the current site. Continue?',
        'message.highRiskConfirmHistory': 'This will clear browsing history for {domain}. Continue?',
        'message.highRiskConfirmFormData': 'This will clear autofill data for the entire browser. Continue?',
        'message.highRiskConfirmPasswords': 'This will clear saved passwords for the entire browser. Continue?',
        'message.highRiskConfirmGuestMode': 'This will perform a deep cleanup and revoke access for the current site. Continue?',
        'privacy.scopeNotice': 'These actions affect the entire browser, not just the current site',
        'privacy.formData.title': 'Autofill Data',
        'privacy.formData.desc': 'Addresses, payment info, names and other autofill entries',
        'privacy.passwords.title': 'Saved Passwords',
        'privacy.passwords.desc': 'Credentials stored by the browser; clearing requires re-login on all sites',
        'privacy.timeRange.title': 'Clear Time Range',
        'privacy.timeRange.desc': 'Applied to both cleanup actions above',
        'privacy.btn.view': 'Open in browser',
        'privacy.btn.clear': 'Clear',
        'privacy.btn.confirm': 'Tap again to confirm ({seconds}s)',
        'message.formDataCleared': 'Autofill data cleared',
        'message.passwordsCleared': 'Saved passwords cleared',
        'message.privacyClearFailed': 'Clear failed',
        'message.privacyUnavailable': 'This browser does not support this action',
        'message.privacyOpenSettingsFailed': 'Unable to open browser settings; please visit it manually',
        'guest.title': 'Guest Mode',
        'guest.desc': 'Wipe all local data, history and permissions for this site at once',
        'guest.target': 'Target: {domain}',
        'guest.targetUnavailable': 'Open an http/https page to start Guest Mode',
        'guest.overrideWhitelist': 'Ignore whitelist and force clean',
        'guest.btn': 'Start Guest Mode',
        'guest.timeRange.label': 'History time range',
        'message.guestModeDone': 'Guest mode done: {count} steps completed',
        'message.guestModePartial': 'Guest mode partially done. Failed: {failures}',
        'message.guestModeFailed': 'Guest mode failed',
        'message.guestModeBlockedByWhitelist': 'This site is whitelisted. Tick “Ignore whitelist” to proceed',
        'message.guestModeUnsupportedPage': 'This page type does not support Guest Mode'
    }
};

let currentLanguage = DEFAULT_LANGUAGE;

export function getCurrentLanguage() {
    return currentLanguage;
}

export function normalizeLanguage(language) {
    const safe = String(language || '').toLowerCase();
    if (safe.startsWith('en')) return 'en';
    if (safe.startsWith('zh')) return 'zh';
    return DEFAULT_LANGUAGE;
}

export function detectPreferredLanguage() {
    try {
        const chromeLanguage = typeof chrome?.i18n?.getUILanguage === 'function'
            ? chrome.i18n.getUILanguage()
            : '';
        return normalizeLanguage(chromeLanguage || navigator.language || DEFAULT_LANGUAGE);
    } catch {
        return DEFAULT_LANGUAGE;
    }
}

export function t(key, params = {}) {
    const langMessages = I18N_TEXT[currentLanguage] || I18N_TEXT[DEFAULT_LANGUAGE];
    const fallbackMessages = I18N_TEXT[DEFAULT_LANGUAGE];
    const template = langMessages?.[key] ?? fallbackMessages?.[key] ?? key;
    return template.replace(/\{(\w+)\}/g, (_, token) => String(params[token] ?? `{${token}}`));
}

export function applyStaticTexts() {
    setNodeText('appTitleText', t('app.title'));
    setNodeText('languageToggleText', t('language.current'));
    setNodeText('tabCleanupText', t('tab.cleanup'));
    setNodeText('tabHistoryText', t('tab.history'));
    setNodeText('tabPermissionText', t('tab.permission'));
    setNodeText('tabPrivacyText', t('tab.privacy'));
    setNodeText('cardTitleCookies', t('card.cookies'));
    setNodeText('cardTitleLocalStorage', t('card.localStorage'));
    setNodeText('cardTitleSessionStorage', t('card.sessionStorage'));
    setNodeText('cardTitleIndexedDB', t('card.indexedDB'));
    setNodeText('cardTitleCacheStorage', t('card.cacheStorage'));
    setNodeText('cardTitleServiceWorker', t('card.serviceWorker'));
    setNodeText('serviceWorkerMetaText', t('card.serviceWorkerMeta'));
    setNodeText('refreshBtnText', t('btn.refresh'));
    setNodeText('clearAllBtnText', t('btn.clearAll'));
    setNodeText('historyTitleText', t('history.title'));
    setNodeText('historyRange1h', t('history.range.1h'));
    setNodeText('historyRange24h', t('history.range.24h'));
    setNodeText('historyRange7d', t('history.range.7d'));
    setNodeText('historyRange4w', t('history.range.4w'));
    setNodeText('historyRangeAll', t('history.range.all'));
    setNodeText('clearHistoryBtnText', t('btn.clear'));
    setNodeText('cleanupLogTitleText', t('cleanup.log.title'));
    setNodeText('cleanupLogFilterAllText', t('cleanup.log.filter.all'));
    setNodeText('cleanupLogFilterSuccessText', t('cleanup.log.filter.success'));
    setNodeText('cleanupLogFilterFailedText', t('cleanup.log.filter.failed'));
    setNodeText('cleanupLogFilterBlockedText', t('cleanup.log.filter.blocked'));
    setNodeText('clearCleanupLogBtnText', t('cleanup.log.clear'));
    setNodeText('cleanupLogSummaryText', t('cleanup.log.summary', { count: 0 }));
    setNodeText('resourcesTitleText', t('resources.title'));
    setNodeText('resourceImageText', t('resources.image'));
    setNodeText('resourceScriptText', t('resources.script'));
    setNodeText('resourceStyleText', t('resources.style'));
    setNodeText('resourceOtherText', t('resources.other'));
    setNodeText('permissionTitleText', t('permission.title'));
    setNodeText('sitePermissionStatus', t('permission.status.checking'));
    setNodeText('sitePermissionDetail', t('permission.detail.loading'));
    setNodeText('grantSitePermissionBtnText', t('permission.btn.grant'));
    setNodeText('revokeSitePermissionBtnText', t('permission.btn.revoke'));
    setNodeText('whitelistTitleText', t('whitelist.title'));
    setNodeText('whitelistStatus', t('whitelist.status.checking'));
    setNodeText('whitelistDetail', t('whitelist.detail.loading'));
    setNodeText('addWhitelistBtnText', t('whitelist.btn.add'));
    setNodeText('removeWhitelistBtnText', t('whitelist.btn.remove'));
    setNodeText('whitelistListSummary', t('whitelist.list.summary', { count: 0 }));
    setNodeText('contentSettingsTitleText', t('contentSettings.title'));
    setNodeText('includeSubdomainsText', t('option.includeSubdomains'));
    setNodeText('autoRefreshText', t('option.autoRefresh'));

    setNodeText('privacyScopeNoticeText', t('privacy.scopeNotice'));
    setNodeText('privacyFormDataTitleText', t('privacy.formData.title'));
    setNodeText('privacyFormDataDescText', t('privacy.formData.desc'));
    setNodeText('privacyPasswordsTitleText', t('privacy.passwords.title'));
    setNodeText('privacyPasswordsDescText', t('privacy.passwords.desc'));
    setNodeText('privacyTimeRangeTitleText', t('privacy.timeRange.title'));
    setNodeText('privacyTimeRangeDescText', t('privacy.timeRange.desc'));
    setNodeText('viewFormDataBtnText', t('privacy.btn.view'));
    setNodeText('viewPasswordsBtnText', t('privacy.btn.view'));
    setNodeText('clearFormDataBtnText', t('privacy.btn.clear'));
    setNodeText('clearPasswordsBtnText', t('privacy.btn.clear'));
    setNodeText('privacyRange1h', t('history.range.1h'));
    setNodeText('privacyRange24h', t('history.range.24h'));
    setNodeText('privacyRange7d', t('history.range.7d'));
    setNodeText('privacyRange4w', t('history.range.4w'));
    setNodeText('privacyRangeAll', t('history.range.all'));

    setNodeText('guestModeTitleText', t('guest.title'));
    setNodeText('guestModeDescText', t('guest.desc'));
    setNodeText('guestModeOverrideText', t('guest.overrideWhitelist'));
    setNodeText('runGuestModeBtnText', t('guest.btn'));
    setNodeText('guestModeRangeAll', t('history.range.all'));
    setNodeText('guestModeRange1h', t('history.range.1h'));
    setNodeText('guestModeRange24h', t('history.range.24h'));
    setNodeText('guestModeRange7d', t('history.range.7d'));
    setNodeText('guestModeRange4w', t('history.range.4w'));

    const tabsRoot = document.getElementById('tabsRoot');
    if (tabsRoot) {
        tabsRoot.setAttribute('aria-label', t('tabs.ariaLabel'));
    }

    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
        themeToggleBtn.title = t('theme.switchTitle');
        themeToggleBtn.setAttribute('aria-label', t('theme.switchAria'));
    }

    const languageToggleBtn = document.getElementById('languageToggleBtn');
    if (languageToggleBtn) {
        languageToggleBtn.title = t('language.switchTitle');
        languageToggleBtn.setAttribute('aria-label', t('language.switchTitle'));
    }

    document.querySelectorAll('.clear-icon').forEach(icon => {
        icon.setAttribute('title', t('clearItem.title'));
    });

    // 处于占位状态的节点用 data-i18n-placeholder 显式标注 key，切换语言时统一重译；
    // 真正填充了业务数据（例如具体 domain）的节点不会带此属性，不会被覆盖。
    document.querySelectorAll('[data-i18n-placeholder]').forEach(node => {
        const key = node.getAttribute('data-i18n-placeholder');
        if (key) {
            node.textContent = t(key);
        }
    });
}

export function applyLanguage(language) {
    currentLanguage = normalizeLanguage(language);
    document.documentElement.lang = currentLanguage === 'zh' ? 'zh-CN' : 'en';
    applyStaticTexts();
    applyTheme(getCurrentTheme());
}

export async function initLanguage() {
    const savedLanguage = await getStorageLocalValueLenient(LANGUAGE_STORAGE_KEY);
    applyLanguage(savedLanguage || detectPreferredLanguage());
}

export async function toggleLanguage() {
    const nextLanguage = currentLanguage === 'zh' ? 'en' : 'zh';
    applyLanguage(nextLanguage);
    await setStorageLocalValueLenient({ [LANGUAGE_STORAGE_KEY]: nextLanguage });
}
