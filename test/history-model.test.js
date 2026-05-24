import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createHistoryScanResult,
  getHistoryClearDetail,
  mergeHistorySearchResults,
  summarizeHistoryClear
} from '../scripts/history-model.js';

test('createHistoryScanResult marks scans truncated when a query hits max results', () => {
  const scan = createHistoryScanResult(
    [{ url: 'https://example.com/a' }],
    [[{ url: 'https://example.com/a' }, { url: 'https://example.com/b' }]],
    2
  );

  assert.equal(scan.status, 'truncated');
  assert.equal(scan.count, 1);
  assert.equal(scan.truncated, true);
});

test('mergeHistorySearchResults dedupes URLs after domain filtering', () => {
  const scan = mergeHistorySearchResults([
    [
      { url: 'https://example.com/a' },
      { url: 'https://shop.example.com/a' },
      { url: 'https://other.com/a' }
    ],
    [
      { url: 'https://example.com/a' }
    ]
  ], ['example.com'], true, 10);

  assert.equal(scan.status, 'ok');
  assert.deepEqual(scan.items.map(item => item.url), [
    'https://example.com/a',
    'https://shop.example.com/a'
  ]);
});

test('summarizeHistoryClear returns success when rescan is empty and deletes did not fail', () => {
  const summary = summarizeHistoryClear(
    createHistoryScanResult([{ url: 'https://example.com/a' }], [[]], 10),
    createHistoryScanResult([], [[]], 10),
    { attemptedCount: 1, deletedCount: 1, failedCount: 0 }
  );

  assert.equal(summary.result, 'success');
  assert.equal(summary.deletedCount, 1);
  assert.equal(summary.remainingCount, 0);
});

test('summarizeHistoryClear returns partial for remaining items after some deletes', () => {
  const summary = summarizeHistoryClear(
    createHistoryScanResult([
      { url: 'https://example.com/a' },
      { url: 'https://example.com/b' }
    ], [[]], 10),
    createHistoryScanResult([{ url: 'https://example.com/b' }], [[]], 10),
    { attemptedCount: 2, deletedCount: 1, failedCount: 1 }
  );

  assert.equal(summary.result, 'partial');
  assert.equal(summary.failedCount, 1);
  assert.equal(summary.remainingCount, 1);
});

test('summarizeHistoryClear returns failed when nothing changed', () => {
  const summary = summarizeHistoryClear(
    createHistoryScanResult([{ url: 'https://example.com/a' }], [[]], 10),
    createHistoryScanResult([{ url: 'https://example.com/a' }], [[]], 10),
    { attemptedCount: 1, deletedCount: 0, failedCount: 1 }
  );

  assert.equal(summary.result, 'failed');
});

test('getHistoryClearDetail includes compact diagnostic fields', () => {
  const detail = getHistoryClearDetail({
    truncated: true,
    failedCount: 2,
    remainingCount: 3
  });

  assert.equal(detail, 'truncated,failedCount=2,remainingCount=3');
});
