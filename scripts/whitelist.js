import { escapeHtml, getCurrentTab, getDomain, isUnsupportedPageUrl, normalizeDomain, showMessage } from './utils.js';
import { t } from './i18n.js';
import { checkWhitelistDomain, listWhitelistRules } from './bridge.js';
import { getCleanupActionText, recordCleanupLog } from './cleanup-log.js';

function setWhitelistStatusBadge(protectedState, text) {
    const statusNode = document.getElementById('whitelistStatus');
    if (!statusNode) return;
    statusNode.classList.remove('granted', 'denied', 'unknown');
    statusNode.classList.add(protectedState === null ? 'unknown' : protectedState ? 'granted' : 'denied');
    statusNode.textContent = text;
}

export function renderWhitelistRules(rules) {
    const listNode = document.getElementById('whitelistList');
    const summaryNode = document.getElementById('whitelistListSummary');
    if (!listNode || !summaryNode) return;

    const safeRules = Array.isArray(rules) ? rules : [];
    summaryNode.textContent = t('whitelist.list.summary', { count: safeRules.length });

    if (safeRules.length === 0) {
        listNode.innerHTML = `<div class="whitelist-empty">${escapeHtml(t('whitelist.list.empty'))}</div>`;
        return;
    }

    listNode.innerHTML = safeRules.map(rule => {
        const scopeText = rule.includeSubdomains ? t('whitelist.scope.subdomains') : t('whitelist.scope.exact');
        const domain = escapeHtml(rule.domain);
        return `
        <div class="whitelist-item">
          <div class="whitelist-item-main">
            <span class="whitelist-domain">${domain}</span>
            <span class="whitelist-scope">${escapeHtml(scopeText)}</span>
          </div>
          <button class="whitelist-remove" type="button" data-remove-domain="${domain}">${escapeHtml(t('btn.remove'))}</button>
        </div>
      `;
    }).join('');
}

export async function updateWhitelistStatus() {
    const siteNode = document.getElementById('whitelistCurrentSite');
    const statusNode = document.getElementById('whitelistStatus');
    const detailNode = document.getElementById('whitelistDetail');
    const addBtn = document.getElementById('addWhitelistBtn');
    const removeBtn = document.getElementById('removeWhitelistBtn');
    if (!siteNode || !statusNode || !detailNode || !addBtn || !removeBtn) return;

    let rules = [];
    try {
        rules = await listWhitelistRules();
    } catch (e) {
        console.error('读取白名单失败:', e);
    }
    renderWhitelistRules(rules);

    try {
        const tab = await getCurrentTab();
        const url = tab?.url || '';
        const domain = getDomain(url) || '-';
        siteNode.textContent = domain;

        if (!url || isUnsupportedPageUrl(url) || !getDomain(url)) {
            setWhitelistStatusBadge(null, t('whitelist.status.unavailable'));
            detailNode.textContent = t('whitelist.detail.unsupportedPage');
            addBtn.disabled = true;
            removeBtn.disabled = true;
            return;
        }

        const status = await checkWhitelistDomain(domain);
        if (status.protected) {
            const scope = status.rule?.includeSubdomains ? t('whitelist.scope.subdomains') : t('whitelist.scope.exact');
            setWhitelistStatusBadge(true, t('whitelist.status.protected'));
            detailNode.textContent = t('whitelist.detail.protected', { domain: status.rule?.domain || domain, scope });
            addBtn.disabled = true;
            removeBtn.disabled = false;
            return;
        }

        setWhitelistStatusBadge(false, t('whitelist.status.unprotected'));
        detailNode.textContent = t('whitelist.detail.unprotected');
        addBtn.disabled = false;
        removeBtn.disabled = true;
    } catch (e) {
        console.error('更新白名单状态失败:', e);
        setWhitelistStatusBadge(null, t('whitelist.status.error'));
        detailNode.textContent = t('whitelist.detail.readFailed');
        addBtn.disabled = true;
        removeBtn.disabled = true;
    }
}

export async function assertWhitelistAllowed(domain, actionType) {
    const safeDomain = normalizeDomain(domain);
    if (!safeDomain) return true;
    try {
        const status = await checkWhitelistDomain(safeDomain);
        if (!status.protected) return true;
        showMessage(t('message.whitelistBlockedAction', { action: getCleanupActionText(actionType) }), 'error');
        await recordCleanupLog({
            domain: safeDomain,
            action: actionType,
            result: 'blocked',
            detail: 'blocked_by_whitelist'
        });
        return false;
    } catch (e) {
        console.warn('白名单拦截检查失败，继续执行清理:', e);
        return true;
    }
}
