import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SCAN_STATUS,
  createScanItem,
  isScanItemClear,
  summarizeCleanupRescan
} from '../scripts/cleanup.js';

test('createScanItem normalizes status counts and sizes', () => {
  const item = createScanItem(SCAN_STATUS.OK, {
    count: '2',
    size: '128',
    detail: 'entries'
  });

  assert.deepEqual(item, {
    status: SCAN_STATUS.OK,
    count: 2,
    size: 128,
    detail: 'entries',
    error: ''
  });
});

test('isScanItemClear only treats ok zero-count items as clear', () => {
  assert.equal(isScanItemClear(createScanItem(SCAN_STATUS.OK, { count: 0 })), true);
  assert.equal(isScanItemClear(createScanItem(SCAN_STATUS.OK, { count: 1 })), false);
  assert.equal(isScanItemClear(createScanItem(SCAN_STATUS.FAILED, { count: 0 })), false);
});

test('summarizeCleanupRescan returns success when all requested items are clear', () => {
  const summary = summarizeCleanupRescan({
    items: {
      localStorage: createScanItem(SCAN_STATUS.OK, { count: 0 }),
      sessionStorage: createScanItem(SCAN_STATUS.OK, { count: 0 })
    }
  }, ['localStorage', 'sessionStorage']);

  assert.equal(summary.result, 'success');
  assert.deepEqual(summary.failures, []);
  assert.deepEqual(summary.remaining, []);
});

test('summarizeCleanupRescan returns partial for remaining or unverifiable items', () => {
  const summary = summarizeCleanupRescan({
    items: {
      localStorage: createScanItem(SCAN_STATUS.OK, { count: 0 }),
      indexedDB: createScanItem(SCAN_STATUS.OK, { count: 1 }),
      cacheStorage: createScanItem(SCAN_STATUS.FAILED)
    }
  }, ['localStorage', 'indexedDB', 'cacheStorage']);

  assert.equal(summary.result, 'partial');
  assert.deepEqual(summary.failures, ['cacheStorage']);
  assert.deepEqual(summary.remaining, ['indexedDB']);
});

test('summarizeCleanupRescan returns failed when no requested item can be verified clear', () => {
  const summary = summarizeCleanupRescan({
    items: {
      localStorage: createScanItem(SCAN_STATUS.OK, { count: 3 }),
      sessionStorage: createScanItem(SCAN_STATUS.FAILED)
    }
  }, ['localStorage', 'sessionStorage']);

  assert.equal(summary.result, 'failed');
  assert.deepEqual(summary.failures, ['sessionStorage']);
  assert.deepEqual(summary.remaining, ['localStorage']);
});
