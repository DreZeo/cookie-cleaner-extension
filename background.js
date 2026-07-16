// ========== 浏览记录后台处理（兼容 Edge） ==========

import {
  normalizeDomain,
  getDomainCandidates,
  matchesDomain,
  matchesCandidates,
  escapeRegExp,
  urlMatchesCandidates,
  toSafeTimeRangeMs
} from './scripts/domain-utils.js';
import {
  mergeHistorySearchResults,
  summarizeHistoryClear
} from './scripts/history-model.js';
import {
  historySearch,
  historyDeleteUrl
} from './scripts/history-api.js';

const HISTORY_MAX_RESULTS = 5000;
const WHITELIST_STORAGE_KEY = 'whitelistRules';
const CLEANUP_LOG_STORAGE_KEY = 'cleanupLogs';
const CLEANUP_LOG_LIMIT = 200;
const ALLOWED_LOG_ACTIONS = new Set([
  'cookies',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'cacheStorage',
  'serviceWorker',
  'all',
  'history',
  'formData',
  'passwords',
  'guestMode'
]);
const ALLOWED_LOG_RESULTS = new Set(['success', 'partial', 'failed', 'blocked']);
const ALLOWED_MESSAGE_TYPES = new Set([
  'history_get',
  'history_clear',
  'whitelist_list',
  'whitelist_add',
  'whitelist_remove',
  'whitelist_check',
  'cleanup_log_add',
  'cleanup_log_list',
  'cleanup_log_clear'
]);

function isTrustedSender(sender) {
  if (!sender || sender.id !== chrome.runtime.id) return false;
  return !!sender.url && sender.url.startsWith(`chrome-extension://${chrome.runtime.id}/`);
}

function storageLocalGet(keys) {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.get(keys, data => {
        const err = chrome.runtime?.lastError;
        if (err) {
          reject(err);
          return;
        }
        resolve(data || {});
      });
    } catch (e) {
      reject(e);
    }
  });
}

function storageLocalSet(values) {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.set(values, () => {
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

function normalizeWhitelistRule(rule) {
  const domain = normalizeDomain(rule?.domain);
  if (!domain) return null;
  return {
    domain,
    includeSubdomains: rule?.includeSubdomains !== false,
    createdAt: Number.isFinite(Number(rule?.createdAt)) ? Number(rule.createdAt) : Date.now()
  };
}

function dedupeWhitelistRules(rules) {
  const byDomain = new Map();
  for (const raw of rules || []) {
    const normalized = normalizeWhitelistRule(raw);
    if (!normalized) continue;
    const existing = byDomain.get(normalized.domain);
    if (!existing) {
      byDomain.set(normalized.domain, normalized);
      continue;
    }
    byDomain.set(normalized.domain, {
      ...existing,
      includeSubdomains: existing.includeSubdomains || normalized.includeSubdomains,
      createdAt: Math.min(existing.createdAt, normalized.createdAt)
    });
  }
  return Array.from(byDomain.values()).sort((a, b) => a.domain.localeCompare(b.domain));
}

async function getWhitelistRules() {
  const data = await storageLocalGet([WHITELIST_STORAGE_KEY]);
  return dedupeWhitelistRules(data?.[WHITELIST_STORAGE_KEY]);
}

async function setWhitelistRules(rules) {
  const normalized = dedupeWhitelistRules(rules);
  await storageLocalSet({ [WHITELIST_STORAGE_KEY]: normalized });
  return normalized;
}

function findWhitelistMatch(domain, rules) {
  const target = normalizeDomain(domain);
  if (!target) return null;
  for (const rule of rules || []) {
    const base = normalizeDomain(rule?.domain);
    if (!base) continue;
    if (rule?.includeSubdomains) {
      if (target === base || target.endsWith('.' + base)) {
        return { domain: base, includeSubdomains: true, createdAt: rule.createdAt || Date.now() };
      }
      continue;
    }
    if (target === base) {
      return { domain: base, includeSubdomains: false, createdAt: rule.createdAt || Date.now() };
    }
  }
  return null;
}

async function addWhitelistRule(domain, includeSubdomains) {
  const normalizedDomain = normalizeDomain(domain);
  if (!normalizedDomain) {
    throw new Error('invalid domain');
  }
  if (normalizedDomain.includes('/') || normalizedDomain.includes('*')) {
    throw new Error('invalid domain');
  }

  const rules = await getWhitelistRules();
  const existing = rules.find(rule => rule.domain === normalizedDomain);
  if (existing) {
    existing.includeSubdomains = existing.includeSubdomains || includeSubdomains !== false;
  } else {
    rules.push({
      domain: normalizedDomain,
      includeSubdomains: includeSubdomains !== false,
      createdAt: Date.now()
    });
  }
  const saved = await setWhitelistRules(rules);
  const matchedRule = saved.find(rule => rule.domain === normalizedDomain) || null;
  return { rules: saved, rule: matchedRule };
}

async function removeWhitelistRule(domain) {
  const normalizedDomain = normalizeDomain(domain);
  if (!normalizedDomain) {
    throw new Error('invalid domain');
  }
  if (normalizedDomain.includes('/') || normalizedDomain.includes('*')) {
    throw new Error('invalid domain');
  }

  const rules = await getWhitelistRules();
  const nextRules = rules.filter(rule => rule.domain !== normalizedDomain);
  await setWhitelistRules(nextRules);
  return { rules: nextRules, removed: nextRules.length !== rules.length };
}

async function checkWhitelist(domain) {
  const rules = await getWhitelistRules();
  const rule = findWhitelistMatch(domain, rules);
  return { protected: !!rule, rule };
}

function normalizeCleanupLog(log) {
  const action = String(log?.action || '');
  const result = String(log?.result || '').toLowerCase();
  return {
    timestamp: Number.isFinite(Number(log?.timestamp)) ? Number(log.timestamp) : Date.now(),
    domain: normalizeDomain(log?.domain),
    action: ALLOWED_LOG_ACTIONS.has(action) ? action : '',
    result: ALLOWED_LOG_RESULTS.has(result) ? result : 'failed',
    count: Number.isFinite(Number(log?.count)) ? Number(log.count) : null,
    detail: String(log?.detail || '').slice(0, 300)
  };
}

async function getCleanupLogs() {
  const data = await storageLocalGet([CLEANUP_LOG_STORAGE_KEY]);
  const logs = Array.isArray(data?.[CLEANUP_LOG_STORAGE_KEY]) ? data[CLEANUP_LOG_STORAGE_KEY] : [];
  return logs
    .map(normalizeCleanupLog)
    .filter(log => !!log.domain && !!log.action)
    .slice(0, CLEANUP_LOG_LIMIT);
}

async function appendCleanupLog(log) {
  const entry = normalizeCleanupLog(log);
  if (!entry.domain || !entry.action) {
    throw new Error('invalid cleanup log');
  }
  const logs = await getCleanupLogs();
  logs.unshift(entry);
  const trimmed = logs.slice(0, CLEANUP_LOG_LIMIT);
  await storageLocalSet({ [CLEANUP_LOG_STORAGE_KEY]: trimmed });
  return entry;
}

async function clearCleanupLogs() {
  await storageLocalSet({ [CLEANUP_LOG_STORAGE_KEY]: [] });
  return { cleared: true };
}

async function getHistoryItems(domain, timeRangeMs, includeSubdomains) {
  const candidates = getDomainCandidates(domain);
  if (candidates.length === 0) {
    return {
      status: 'ok',
      count: 0,
      truncated: false,
      items: []
    };
  }

  const safeTimeRangeMs = toSafeTimeRangeMs(timeRangeMs);
  const startTime = safeTimeRangeMs > 0 ? Date.now() - safeTimeRangeMs : 0;
  // 仅用域名文本查询，避免空字符串查询拉取全部历史记录。
  // filterHistoryItems 会在客户端做精确域名匹配，补全 text 搜索的遗漏。
  const queryTexts = Array.from(new Set(candidates)).filter(Boolean);

  const queryResults = await Promise.all(
    queryTexts.map(async text => {
      try {
        return await historySearch({
          text,
          startTime,
          maxResults: HISTORY_MAX_RESULTS
        });
      } catch (err) {
        console.error('history.search failed:', err);
        return [];
      }
    })
  );

  return mergeHistorySearchResults(queryResults, candidates, includeSubdomains, HISTORY_MAX_RESULTS);
}

async function clearHistory(domain, timeRangeMs, includeSubdomains) {
  const beforeScan = await getHistoryItems(domain, timeRangeMs, includeSubdomains);
  let deletedCount = 0;
  let failedCount = 0;

  for (const item of beforeScan.items) {
    const deleted = await historyDeleteUrl(item.url);
    if (deleted) {
      deletedCount += 1;
    } else {
      failedCount += 1;
    }
  }

  const afterScan = await getHistoryItems(domain, timeRangeMs, includeSubdomains);
  return summarizeHistoryClear(beforeScan, afterScan, {
    attemptedCount: beforeScan.items.length,
    deletedCount,
    failedCount
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return;
  if (!ALLOWED_MESSAGE_TYPES.has(message.type)) return;
  if (!isTrustedSender(sender)) {
    sendResponse({ ok: false, error: 'unauthorized sender' });
    return;
  }

  if (message.type === 'history_get') {
    getHistoryItems(message.domain, message.timeRangeMs, message.includeSubdomains)
      .then(scan => sendResponse({
        ok: true,
        status: scan.status,
        count: scan.count,
        truncated: scan.truncated
      }))
      .catch(err => sendResponse({ ok: false, error: String(err?.message || err) }));
    return true;
  }

  if (message.type === 'history_clear') {
    clearHistory(message.domain, message.timeRangeMs, message.includeSubdomains)
      .then(summary => sendResponse({ ok: true, ...summary }))
      .catch(err => sendResponse({ ok: false, error: String(err?.message || err) }));
    return true;
  }

  if (message.type === 'whitelist_list') {
    getWhitelistRules()
      .then(rules => sendResponse({ ok: true, rules }))
      .catch(err => sendResponse({ ok: false, error: String(err?.message || err) }));
    return true;
  }

  if (message.type === 'whitelist_add') {
    addWhitelistRule(message.domain, message.includeSubdomains)
      .then(data => sendResponse({ ok: true, ...data }))
      .catch(err => sendResponse({ ok: false, error: String(err?.message || err) }));
    return true;
  }

  if (message.type === 'whitelist_remove') {
    removeWhitelistRule(message.domain)
      .then(data => sendResponse({ ok: true, ...data }))
      .catch(err => sendResponse({ ok: false, error: String(err?.message || err) }));
    return true;
  }

  if (message.type === 'whitelist_check') {
    checkWhitelist(message.domain)
      .then(data => sendResponse({ ok: true, ...data }))
      .catch(err => sendResponse({ ok: false, error: String(err?.message || err) }));
    return true;
  }

  if (message.type === 'cleanup_log_add') {
    appendCleanupLog(message.entry)
      .then(entry => sendResponse({ ok: true, entry }))
      .catch(err => sendResponse({ ok: false, error: String(err?.message || err) }));
    return true;
  }

  if (message.type === 'cleanup_log_list') {
    getCleanupLogs()
      .then(logs => sendResponse({ ok: true, logs }))
      .catch(err => sendResponse({ ok: false, error: String(err?.message || err) }));
    return true;
  }

  if (message.type === 'cleanup_log_clear') {
    clearCleanupLogs()
      .then(data => sendResponse({ ok: true, ...data }))
      .catch(err => sendResponse({ ok: false, error: String(err?.message || err) }));
    return true;
  }
});
