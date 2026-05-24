import { toSafeTimeRangeMs } from './domain-utils.js';

export const PRIVACY_ACTIONS = {
    FORM_DATA: 'formData',
    PASSWORDS: 'passwords'
};

const KNOWN_ACTIONS = new Set(Object.values(PRIVACY_ACTIONS));

export function normalizePrivacyAction(action) {
    const safe = String(action || '');
    return KNOWN_ACTIONS.has(safe) ? safe : '';
}

export function createPrivacyCapability(action, timeRangeMs, available) {
    return {
        action: normalizePrivacyAction(action),
        available: !!available,
        verified: false,
        scope: 'browser',
        timeRangeMs: toSafeTimeRangeMs(timeRangeMs)
    };
}

export function createPrivacyClearResult(action, timeRangeMs, result, error = '') {
    return {
        action: normalizePrivacyAction(action),
        result: result === 'success' ? 'success' : 'failed',
        verified: false,
        scope: 'browser',
        timeRangeMs: toSafeTimeRangeMs(timeRangeMs),
        error: String(error || '').slice(0, 160)
    };
}

export function getPrivacyTimeRangeTextKey(timeRangeMs) {
    const safe = toSafeTimeRangeMs(timeRangeMs);
    if (safe === 3600000) return 'history.range.1h';
    if (safe === 86400000) return 'history.range.24h';
    if (safe === 604800000) return 'history.range.7d';
    if (safe === 2419200000) return 'history.range.4w';
    return 'history.range.all';
}

export function getPrivacyClearMessageKey(result) {
    return result?.result === 'success'
        ? 'message.privacyClearRequestDone'
        : 'message.privacyClearFailed';
}

export function getPrivacyConfirmMessageKey(action) {
    return normalizePrivacyAction(action) === PRIVACY_ACTIONS.FORM_DATA
        ? 'message.highRiskConfirmFormData'
        : 'message.highRiskConfirmPasswords';
}

export function getPrivacyLogDetail(result) {
    const parts = [
        'verified=false',
        'scope=browser',
        `timeRangeMs=${toSafeTimeRangeMs(result?.timeRangeMs)}`
    ];
    if (result?.error) {
        parts.push(`error=${String(result.error).slice(0, 120)}`);
    }
    return parts.join(',');
}
