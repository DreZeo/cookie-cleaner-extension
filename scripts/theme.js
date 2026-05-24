import { THEME_STORAGE_KEY } from './constants.js';
import { getStorageLocalValueLenient, setStorageLocalValueLenient } from './storage.js';
import { t } from './i18n.js';

function normalizeTheme(theme) {
    return theme === 'light' ? 'light' : 'dark';
}

export function getCurrentTheme() {
    return normalizeTheme(document.documentElement.getAttribute('data-theme'));
}

export function applyTheme(theme) {
    const safeTheme = normalizeTheme(theme);
    document.documentElement.setAttribute('data-theme', safeTheme);

    const icon = document.getElementById('themeToggleIcon');
    const text = document.getElementById('themeToggleText');
    if (icon) {
        icon.className = safeTheme === 'light' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    }
    if (text) {
        text.textContent = safeTheme === 'light' ? t('theme.light') : t('theme.dark');
    }
}

export async function initTheme() {
    const savedTheme = await getStorageLocalValueLenient(THEME_STORAGE_KEY);
    applyTheme(savedTheme);
}

export async function toggleTheme() {
    const nextTheme = getCurrentTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    await setStorageLocalValueLenient({ [THEME_STORAGE_KEY]: nextTheme });
}
