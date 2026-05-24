import { ACTIVE_TAB_STORAGE_KEY, DEFAULT_TAB_ID, TAB_IDS } from './constants.js';
import { getStorageLocalValueLenient, setStorageLocalValueLenient } from './storage.js';

function normalizeTabId(tabId) {
    return TAB_IDS.includes(tabId) ? tabId : DEFAULT_TAB_ID;
}

function getTabButtons() {
    return Array.from(document.querySelectorAll('.tab-btn'));
}

function getActiveTabIndex(buttons = getTabButtons()) {
    const index = buttons.findIndex(btn => btn.classList.contains('active'));
    return index >= 0 ? index : 0;
}

export function setActiveTab(tabId) {
    const safeTabId = normalizeTabId(tabId);
    const buttons = getTabButtons();

    buttons.forEach(btn => {
        const active = btn.dataset.tab === safeTabId;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-selected', active ? 'true' : 'false');
        btn.setAttribute('tabindex', active ? '0' : '-1');
    });

    document.querySelectorAll('.tab-panel').forEach(panel => {
        const active = panel.id === safeTabId;
        panel.classList.toggle('active', active);
        panel.setAttribute('aria-hidden', active ? 'false' : 'true');
    });

    return safeTabId;
}

function switchTabByOffset(offset, shouldFocus = false) {
    const buttons = getTabButtons();
    if (buttons.length === 0) return DEFAULT_TAB_ID;

    const currentIndex = getActiveTabIndex(buttons);
    const nextIndex = (currentIndex + offset + buttons.length) % buttons.length;
    const nextButton = buttons[nextIndex];
    const tabId = setActiveTab(nextButton.dataset.tab);
    if (shouldFocus) {
        nextButton.focus();
    }
    return tabId;
}

function isEditableTarget(target) {
    if (!target) return false;
    const tagName = target.tagName?.toLowerCase();
    if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') return true;
    return !!target.isContentEditable;
}

export async function initTabs() {
    const buttons = getTabButtons();
    if (buttons.length === 0) return;

    buttons.forEach(btn => {
        btn.addEventListener('click', async () => {
            const tabId = setActiveTab(btn.dataset.tab);
            await setStorageLocalValueLenient({ [ACTIVE_TAB_STORAGE_KEY]: tabId });
        });
    });

    document.addEventListener('keydown', async (e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        if (e.altKey || e.ctrlKey || e.metaKey) return;
        if (isEditableTarget(e.target)) return;

        e.preventDefault();
        const offset = e.key === 'ArrowRight' ? 1 : -1;
        const tabId = switchTabByOffset(offset, true);
        await setStorageLocalValueLenient({ [ACTIVE_TAB_STORAGE_KEY]: tabId });
    });

    const savedTab = await getStorageLocalValueLenient(ACTIVE_TAB_STORAGE_KEY);
    setActiveTab(savedTab);
}
