import { loadPartials } from './partials.js';
import { initLanguage, t, toggleLanguage } from './i18n.js';
import { initTheme, toggleTheme } from './theme.js';
import { initTabs } from './tabs.js';
import {
    getCurrentTab,
    getDomain,
    isUnsupportedPageUrl,
    normalizeDomain,
    showMessage,
    toSafeTimeRangeMs
} from './utils.js';
import {
    requestSitePermission,
    revokeSitePermission,
    updateSitePermissionStatus
} from './permissions.js';
import {
    addWhitelistRule,
    removeWhitelistRule,
    clearCleanupLogs
} from './bridge.js';
import {
    assertWhitelistAllowed,
    updateWhitelistStatus
} from './whitelist.js';
import {
    renderCleanupLogs,
    setCleanupLogCache,
    setCleanupLogFilter,
    updateCleanupLogFilterUI,
    updateCleanupLogList,
    recordCleanupLog
} from './cleanup-log.js';
import { updateAllStats } from './cleanup.js';
import { clearAll, clearByType } from './cleanup-actions.js';
import { clearHistory, getHistoryClearMessageKey, getHistoryLogDetail, updateHistoryStats } from './history.js';
import {
    getContentSettings,
    isAskSupported,
    isContentSettingsAvailable,
    setContentSettingForSite
} from './content-settings.js';
import {
    clearFormData,
    clearPasswords,
    isBrowsingDataAvailable,
    openBrowserSettings
} from './privacy-data.js';
import { runGuestMode } from './guest-mode.js';

const CLEAN_ACTION_CONFIRMATION = new Set(['clearAll', 'clearHistory', 'formData', 'passwords', 'guestMode']);

function escapeHtmlAttr(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getContentSettingStatusText(setting) {
    switch (setting) {
        case 'allow': return t('contentSettings.status.allow');
        case 'block': return t('contentSettings.status.block');
        case 'ask': return t('contentSettings.status.ask');
        case 'session_only': return t('contentSettings.status.session_only');
        default: return t('contentSettings.status.default');
    }
}

function getContentSettingStatusClass(setting) {
    if (setting === 'allow') return 'allow';
    if (setting === 'block') return 'block';
    if (setting === 'ask' || setting === 'session_only') return 'ask';
    return '';
}

function confirmHighRiskAction(title, detail) {
    const headline = String(title || '').trim();
    const body = String(detail || '').trim();
    return window.confirm(body ? `${headline}\n\n${body}` : headline);
}

function renderContentSettingsRows(settings) {
    const listNode = document.getElementById('contentSettingsList');
    const detailNode = document.getElementById('contentSettingsDetail');
    if (!listNode || !detailNode) return;

    const items = Array.isArray(settings) ? settings : [];
    if (items.length === 0) {
        listNode.innerHTML = '';
        detailNode.textContent = t('contentSettings.empty');
        return;
    }

    const customCount = items.filter(item => item.setting === 'allow' || item.setting === 'block').length;
    detailNode.textContent = t('contentSettings.summary', { count: customCount });

    listNode.innerHTML = items.map(item => {
        const label = t(`contentSettings.type.${item.id}`);
        const statusClass = getContentSettingStatusClass(item.setting);
        const statusText = getContentSettingStatusText(item.setting);
        const isAllow = item.setting === 'allow';
        const isBlock = item.setting === 'block';
        const askHint = item.askSupported ? t('contentSettings.toggleOffHint') : '';
        const allowTitle = isAllow && askHint ? askHint : t('contentSettings.status.allow');
        const blockTitle = isBlock && askHint ? askHint : t('contentSettings.status.block');
        return `
        <div class="content-setting-row">
          <div class="content-setting-icon"><i class="fa-solid ${escapeHtmlAttr(item.icon)}"></i></div>
          <div class="content-setting-main">
            <span class="content-setting-label">${escapeHtmlAttr(label)}</span>
          </div>
          <span class="content-setting-status ${statusClass}">${escapeHtmlAttr(statusText)}</span>
          <div class="content-setting-actions">
            <button class="content-setting-btn allow ${isAllow ? 'active' : ''}" type="button"
              data-set-type="${escapeHtmlAttr(item.id)}" data-set-value="allow"
              title="${escapeHtmlAttr(allowTitle)}">
              <i class="fa-solid fa-check"></i>
            </button>
            <button class="content-setting-btn block ${isBlock ? 'active' : ''}" type="button"
              data-set-type="${escapeHtmlAttr(item.id)}" data-set-value="block"
              title="${escapeHtmlAttr(blockTitle)}">
              <i class="fa-solid fa-ban"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
}

async function updateContentSettingsPanel() {
    const panel = document.getElementById('contentSettingsPanel');
    const listNode = document.getElementById('contentSettingsList');
    const detailNode = document.getElementById('contentSettingsDetail');
    if (!panel || !listNode || !detailNode) return;

    listNode.innerHTML = '';
    detailNode.textContent = t('contentSettings.loading');

    if (!isContentSettingsAvailable()) {
        detailNode.textContent = t('contentSettings.unavailable');
        return;
    }

    const tab = await getCurrentTab();
    if (!tab?.url || isUnsupportedPageUrl(tab.url)) {
        detailNode.textContent = t('contentSettings.unsupportedPage');
        return;
    }

    try {
        const settings = await getContentSettings(tab.url);
        renderContentSettingsRows(settings);
    } catch (e) {
        console.error('读取内容设置失败:', e);
        detailNode.textContent = t('contentSettings.unavailable');
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadPartials();
    await initLanguage();
    await initTheme();
    await initTabs();

    const languageToggleBtn = document.getElementById('languageToggleBtn');
    if (languageToggleBtn) {
        languageToggleBtn.addEventListener('click', async () => {
            await toggleLanguage();
            await updateAllStats();
            await updateHistoryStats();
            await updateSitePermissionStatus();
            await updateWhitelistStatus();
            await updateCleanupLogList();
            await updateContentSettingsPanel();
            // guestModeTarget 文案是动态的（domain 或 unavailable 提示），不在 applyStaticTexts 覆盖范围内，
            // 语言切换后必须显式重新渲染，否则会保留上一种语言的文案。
            await updateGuestModeTarget();
        });
    }

    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', async () => {
            await toggleTheme();
        });
    }

    await updateAllStats();
    await updateHistoryStats();
    await updateSitePermissionStatus();
    await updateWhitelistStatus();
    await updateCleanupLogList();
    await updateContentSettingsPanel();

    // 子域名选项变化时更新统计
    document.getElementById('includeSubdomains').addEventListener('change', async () => {
        await updateAllStats();
        await updateHistoryStats();
        await updateWhitelistStatus();
    });

    // 刷新按钮
    document.getElementById('refreshBtn').addEventListener('click', async () => {
        await updateAllStats();
        await updateHistoryStats();
        await updateSitePermissionStatus();
        await updateWhitelistStatus();
        await updateCleanupLogList();
        await updateContentSettingsPanel();
        // 当前浏览器 Tab 可能已切到别的站点（或切到 chrome://），刷新时同步更新访客模式目标文案。
        await updateGuestModeTarget();
    });

    // 清除全部按钮
    document.getElementById('clearAllBtn').addEventListener('click', async () => {
        if (!confirmHighRiskAction(
            t('message.highRiskConfirmTitle'),
            t('message.highRiskConfirmAll')
        )) {
            return;
        }
        await clearAll();
    });

    // 缓存卡片上的清除图标点击事件
    document.querySelectorAll('.cache-card .clear-icon').forEach(icon => {
        icon.addEventListener('click', async (e) => {
            e.stopPropagation();
            const type = e.target.closest('.cache-card').dataset.type;
            await clearByType(type);
        });
    });

    // 缓存卡片点击事件
    document.querySelectorAll('.cache-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('clear-icon')) return;
            if (e.target.closest('.cookie-third-party')) return;
            card.classList.toggle('active');
        });
    });

    // 浏览记录时间范围变化时更新统计
    document.getElementById('historyTimeRange').addEventListener('change', updateHistoryStats);

    // 站点授权按钮
    document.getElementById('grantSitePermissionBtn').addEventListener('click', async () => {
        const tab = await getCurrentTab();
        if (!tab?.url || isUnsupportedPageUrl(tab.url)) {
            showMessage(t('message.pageNoPermissionSupport'), 'error');
            return;
        }
        const granted = await requestSitePermission(tab.url);
        showMessage(granted ? t('message.siteGranted') : t('message.siteDenied'), granted ? 'success' : 'error');
        await updateSitePermissionStatus();
        await updateAllStats();
        await updateWhitelistStatus();
    });

    document.getElementById('revokeSitePermissionBtn').addEventListener('click', async () => {
        const tab = await getCurrentTab();
        if (!tab?.url || isUnsupportedPageUrl(tab.url)) {
            showMessage(t('message.pageNoPermissionSupport'), 'error');
            return;
        }
        const removed = await revokeSitePermission(tab.url);
        showMessage(removed ? t('message.siteRevoked') : t('message.siteRevokeFailed'), removed ? 'success' : 'error');
        await updateSitePermissionStatus();
        await updateAllStats();
        await updateWhitelistStatus();
    });

    // 白名单管理按钮
    document.getElementById('addWhitelistBtn').addEventListener('click', async () => {
        try {
            const tab = await getCurrentTab();
            if (!tab?.url || isUnsupportedPageUrl(tab.url)) {
                showMessage(t('message.whitelistUnsupportedPage'), 'error');
                return;
            }
            const domain = normalizeDomain(getDomain(tab.url));
            if (!domain) {
                showMessage(t('message.whitelistUnsupportedPage'), 'error');
                return;
            }
            const includeSubdomains = document.getElementById('includeSubdomains').checked;
            await addWhitelistRule(domain, includeSubdomains);
            showMessage(t('message.whitelistAdded'), 'success');
            await updateWhitelistStatus();
        } catch (e) {
            console.error('加入白名单失败:', e);
            showMessage(t('message.whitelistAddFailed'), 'error');
        }
    });

    document.getElementById('removeWhitelistBtn').addEventListener('click', async () => {
        try {
            const tab = await getCurrentTab();
            if (!tab?.url || isUnsupportedPageUrl(tab.url)) {
                showMessage(t('message.whitelistUnsupportedPage'), 'error');
                return;
            }
            const domain = normalizeDomain(getDomain(tab.url));
            if (!domain) {
                showMessage(t('message.whitelistUnsupportedPage'), 'error');
                return;
            }
            await removeWhitelistRule(domain);
            showMessage(t('message.whitelistRemoved'), 'success');
            await updateWhitelistStatus();
        } catch (e) {
            console.error('移除白名单失败:', e);
            showMessage(t('message.whitelistRemoveFailed'), 'error');
        }
    });

    document.getElementById('whitelistList').addEventListener('click', async e => {
        const removeButton = e.target.closest('[data-remove-domain]');
        if (!removeButton) return;
        try {
            const domain = normalizeDomain(removeButton.dataset.removeDomain || '');
            if (!domain) return;
            await removeWhitelistRule(domain);
            showMessage(t('message.whitelistRemoved'), 'success');
            await updateWhitelistStatus();
        } catch (err) {
            console.error('移除白名单条目失败:', err);
            showMessage(t('message.whitelistRemoveFailed'), 'error');
        }
    });

    // 内容设置：点击 allow/block 设置；再次点击 active 按钮则恢复为询问态
    const contentSettingsList = document.getElementById('contentSettingsList');
    if (contentSettingsList) {
        contentSettingsList.addEventListener('click', async e => {
            const button = e.target.closest('[data-set-type]');
            if (!button) return;
            const settingType = button.dataset.setType;
            const value = button.dataset.setValue;
            if (!settingType || !value) return;

            const alreadyActive = button.classList.contains('active');
            try {
                const tab = await getCurrentTab();
                if (!tab?.url || isUnsupportedPageUrl(tab.url)) {
                    showMessage(t('contentSettings.unsupportedPage'), 'error');
                    return;
                }

                if (alreadyActive) {
                    // 再次点击已选中按钮 → 恢复为询问态
                    if (!isAskSupported(settingType)) {
                        showMessage(t('message.contentSettingsAskUnsupported', {
                            type: t(`contentSettings.type.${settingType}`)
                        }), 'error');
                        return;
                    }
                    await setContentSettingForSite(settingType, tab.url, 'ask');
                    showMessage(t('message.contentSettingsUpdated', {
                        type: t(`contentSettings.type.${settingType}`),
                        status: t('contentSettings.status.ask')
                    }), 'success');
                } else {
                    await setContentSettingForSite(settingType, tab.url, value);
                    const statusKey = value === 'allow' ? 'contentSettings.status.allow' : 'contentSettings.status.block';
                    showMessage(t('message.contentSettingsUpdated', {
                        type: t(`contentSettings.type.${settingType}`),
                        status: t(statusKey)
                    }), 'success');
                }

                await updateContentSettingsPanel();
            } catch (err) {
                console.error('设置内容权限失败:', err);
                showMessage(t('message.contentSettingsUpdateFailed'), 'error');
            }
        });
    }

    // 清理日志筛选与清空
    document.getElementById('cleanupLogFilterGroup').addEventListener('click', e => {
        const button = e.target.closest('[data-filter]');
        if (!button) return;
        setCleanupLogFilter(button.dataset.filter || 'all');
    });

    document.getElementById('clearCleanupLogBtn').addEventListener('click', async () => {
        try {
            await clearCleanupLogs();
            setCleanupLogCache([]);
            renderCleanupLogs([]);
            updateCleanupLogFilterUI();
            showMessage(t('message.cleanupLogCleared'), 'success');
        } catch (e) {
            console.error('清空清理日志失败:', e);
            showMessage(t('message.cleanupLogClearFailed'), 'error');
        }
    });

    // 清除浏览记录按钮
    document.getElementById('clearHistoryBtn').addEventListener('click', async () => {
        try {
            const tab = await getCurrentTab();
            if (!tab?.url || isUnsupportedPageUrl(tab.url)) {
                showMessage(t('message.historyUnsupportedPage'), 'error');
                return;
            }
            const domain = getDomain(tab.url);
            const allowed = await assertWhitelistAllowed(domain, 'history');
            if (!allowed) return;
            if (!confirmHighRiskAction(
                t('message.highRiskConfirmTitle'),
                t('message.highRiskConfirmHistory', { domain })
            )) {
                return;
            }
            const timeRangeMs = toSafeTimeRangeMs(document.getElementById('historyTimeRange').value);
            const includeSubdomains = document.getElementById('includeSubdomains').checked;

            const summary = await clearHistory(domain, timeRangeMs, includeSubdomains);
            showMessage(
                t(getHistoryClearMessageKey(summary), { count: summary.deletedCount ?? 0 }),
                summary.result === 'success' ? 'success' : 'error'
            );
            await recordCleanupLog({
                domain,
                action: 'history',
                result: summary.result,
                count: summary.deletedCount,
                detail: getHistoryLogDetail(summary)
            });
            await updateHistoryStats();
        } catch (e) {
            console.error('清除浏览记录失败:', e);
            showMessage(t('message.historyClearFailed'), 'error');
            let failedDomain = '';
            try {
                const tab = await getCurrentTab();
                failedDomain = getDomain(tab?.url || '');
            } catch { }
            await recordCleanupLog({
                domain: failedDomain,
                action: 'history',
                result: 'failed',
                detail: String(e?.message || e || '')
            });
        }
    });

    // ========== 资料 Tab（表单/密码全局清理） ==========
    bindPrivacyTab();
});

function bindPrivacyTab() {
    const viewFormData = document.getElementById('viewFormDataBtn');
    const viewPasswords = document.getElementById('viewPasswordsBtn');
    const clearFormDataBtn = document.getElementById('clearFormDataBtn');
    const clearPasswordsBtn = document.getElementById('clearPasswordsBtn');
    const timeRangeSelect = document.getElementById('privacyTimeRange');
    if (!clearFormDataBtn || !clearPasswordsBtn || !timeRangeSelect) return;

    if (viewFormData) {
        viewFormData.addEventListener('click', async () => {
            try {
                await openBrowserSettings('addresses');
            } catch (e) {
                console.error('打开 chrome://settings/addresses 失败:', e);
                showMessage(t('message.privacyOpenSettingsFailed'), 'error');
            }
        });
    }
    if (viewPasswords) {
        viewPasswords.addEventListener('click', async () => {
            try {
                await openBrowserSettings('passwords');
            } catch (e) {
                console.error('打开 chrome://settings/passwords 失败:', e);
                showMessage(t('message.privacyOpenSettingsFailed'), 'error');
            }
        });
    }

    setupPrivacyClearButton(clearFormDataBtn, 'formData', () =>
        clearFormData(timeRangeSelect.value));
    setupPrivacyClearButton(clearPasswordsBtn, 'passwords', () =>
        clearPasswords(timeRangeSelect.value));

    bindGuestMode();
}

async function updateGuestModeTarget() {
    const targetNode = document.getElementById('guestModeTarget');
    if (!targetNode) return;
    // guest.target 是带参数插值的模板（Target: {domain}），不能靠 data-i18n-placeholder 机制覆盖；
    // 只有 guest.targetUnavailable 是纯静态文案，走占位标记便于语言切换时自动重译。
    const setUnavailable = () => {
        targetNode.setAttribute('data-i18n-placeholder', 'guest.targetUnavailable');
        targetNode.textContent = t('guest.targetUnavailable');
    };
    try {
        const tab = await getCurrentTab();
        const domain = normalizeDomain(getDomain(tab?.url || ''));
        if (!tab?.url || isUnsupportedPageUrl(tab.url) || !domain) {
            setUnavailable();
        } else {
            targetNode.removeAttribute('data-i18n-placeholder');
            targetNode.textContent = t('guest.target', { domain });
        }
    } catch (e) {
        setUnavailable();
    }
}

function bindGuestMode() {
    const button = document.getElementById('runGuestModeBtn');
    const timeRange = document.getElementById('guestModeTimeRange');
    const override = document.getElementById('guestModeOverrideWhitelist');
    if (!button || !timeRange || !override) return;

    updateGuestModeTarget();

    const baseTextNode = document.getElementById('runGuestModeBtnText');
    const iconNode = button.querySelector('i');
    let armed = false;
    let countdown = 0;
    let tickTimer = 0;

    function resetState() {
        armed = false;
        countdown = 0;
        if (tickTimer) { clearInterval(tickTimer); tickTimer = 0; }
        button.classList.remove('confirming');
        if (iconNode) iconNode.className = 'fa-solid fa-user-ninja';
        if (baseTextNode) baseTextNode.textContent = t('guest.btn');
    }

    function renderCountdown() {
        if (iconNode) iconNode.className = 'fa-solid fa-triangle-exclamation';
        if (baseTextNode) baseTextNode.textContent = t('privacy.btn.confirm', { seconds: countdown });
    }

    button.addEventListener('click', async () => {
        if (!armed) {
            armed = true;
            countdown = 3;
            button.classList.add('confirming');
            renderCountdown();
            tickTimer = setInterval(() => {
                countdown -= 1;
                if (countdown <= 0) {
                    resetState();
                    return;
                }
                renderCountdown();
            }, 1000);
            return;
        }

        resetState();
        button.disabled = true;
        const tab = await getCurrentTab();
        const options = {
            timeRangeMs: toSafeTimeRangeMs(timeRange.value),
            overrideWhitelist: !!override.checked
        };

        let result;
        try {
            result = await runGuestMode(tab, options);
        } catch (e) {
            console.error('guest-mode 执行异常:', e);
            showMessage(t('message.guestModeFailed'), 'error');
            await recordCleanupLog({
                domain: normalizeDomain(getDomain(tab?.url || '')),
                action: 'guestMode',
                result: 'failed',
                detail: String(e?.message || e || '')
            });
            button.disabled = false;
            return;
        }

        const domain = normalizeDomain(getDomain(tab?.url || ''));

        if (result.status === 'blocked') {
            showMessage(t('message.guestModeBlockedByWhitelist'), 'error');
            await recordCleanupLog({
                domain,
                action: 'guestMode',
                result: 'blocked',
                detail: 'whitelist'
            });
            button.disabled = false;
            return;
        }

        if (result.status === 'failed') {
            if (result.failures.includes('unsupportedPage')) {
                showMessage(t('message.guestModeUnsupportedPage'), 'error');
            } else {
                showMessage(t('message.guestModeFailed'), 'error');
            }
            await recordCleanupLog({
                domain,
                action: 'guestMode',
                result: 'failed',
                detail: (result.failures || []).join(',')
            });
            button.disabled = false;
            return;
        }

        const stepCount = Number.isFinite(result.successSteps) ? result.successSteps : 0;

        if (result.status === 'partial') {
            showMessage(t('message.guestModePartial', {
                failures: (result.failures || []).join(', ')
            }), 'error');
        } else {
            showMessage(t('message.guestModeDone', { count: stepCount }), 'success');
        }

        await recordCleanupLog({
            domain,
            action: 'guestMode',
            result: result.status,
            count: stepCount,
            detail: (result.failures || []).join(',')
        });

        await updateAllStats();
        await updateSitePermissionStatus();
        await updateWhitelistStatus();
        await updateContentSettingsPanel();
        await updateHistoryStats();
        await updateCleanupLogList();

        // 刷新页面并关闭 popup
        if (tab?.id) {
            setTimeout(() => {
                try { chrome.tabs.reload(tab.id); } catch { }
                window.close();
            }, 600);
        }
    });

    button.addEventListener('blur', () => {
        if (armed) resetState();
    });
}

/**
 * 为清除按钮设置 inline 二次确认：首次点击切换到 3s 倒计时文案，
 * 再次点击则真正执行；超时或失焦则自动回到初始态。
 */
function setupPrivacyClearButton(button, action, runner) {
    const baseTextId = button.dataset.baseTextId || '';
    const baseTextNode = baseTextId ? document.getElementById(baseTextId) : null;
    const iconNode = button.querySelector('i');
    let armed = false;
    let countdown = 0;
    let tickTimer = 0;

    function resetState() {
        armed = false;
        countdown = 0;
        if (tickTimer) { clearInterval(tickTimer); tickTimer = 0; }
        button.classList.remove('confirming');
        if (iconNode) iconNode.className = 'fa-solid fa-trash-can';
        if (baseTextNode) baseTextNode.textContent = t('privacy.btn.clear');
    }

    function renderCountdown() {
        if (iconNode) iconNode.className = 'fa-solid fa-triangle-exclamation';
        if (baseTextNode) baseTextNode.textContent = t('privacy.btn.confirm', { seconds: countdown });
    }

    button.addEventListener('click', async () => {
        if (!isBrowsingDataAvailable()) {
            showMessage(t('message.privacyUnavailable'), 'error');
            return;
        }

        if (!armed) {
            armed = true;
            countdown = 3;
            button.classList.add('confirming');
            renderCountdown();
            tickTimer = setInterval(() => {
                countdown -= 1;
                if (countdown <= 0) {
                    resetState();
                    return;
                }
                renderCountdown();
            }, 1000);
            return;
        }

        // 第二次点击 → 执行清除
        resetState();
        if (!CLEAN_ACTION_CONFIRMATION.has(action)) {
            showMessage(t('message.privacyClearFailed'), 'error');
            return;
        }
        if (!confirmHighRiskAction(
            t('message.highRiskConfirmTitle'),
            action === 'guestMode'
                ? t('message.highRiskConfirmGuestMode')
                : action === 'formData'
                    ? t('message.highRiskConfirmFormData')
                    : t('message.highRiskConfirmPasswords')
        )) {
            button.disabled = false;
            return;
        }
        let success = true;
        let errorMsg = '';
        try {
            await runner();
        } catch (e) {
            success = false;
            errorMsg = String(e?.message || e || '');
            console.error(`${action} 清除失败:`, e);
        }

        if (success) {
            const msgKey = action === 'formData' ? 'message.formDataCleared' : 'message.passwordsCleared';
            showMessage(t(msgKey), 'success');
        } else {
            showMessage(t('message.privacyClearFailed'), 'error');
        }

        await recordCleanupLog({
            domain: 'browser',
            action,
            result: success ? 'success' : 'failed',
            detail: success ? '' : errorMsg
        });
    });

    // 失焦时取消确认态
    button.addEventListener('blur', () => {
        if (armed) resetState();
    });
}
