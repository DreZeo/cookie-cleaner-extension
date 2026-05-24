import test from 'node:test';
import assert from 'node:assert/strict';

import {
  filterHistoryItems,
  getDomainCandidates,
  matchesDomain,
  normalizeDomain,
  urlMatchesCandidates
} from '../scripts/domain-utils.js';

test('normalizeDomain lowercases and strips leading www', () => {
  assert.equal(normalizeDomain('WWW.Example.COM'), 'example.com');
});

test('matchesDomain requires exact match when subdomains are excluded', () => {
  assert.equal(matchesDomain('example.com', 'example.com', false), true);
  assert.equal(matchesDomain('shop.example.com', 'example.com', false), false);
});

test('matchesDomain includes child subdomains only when requested', () => {
  assert.equal(matchesDomain('shop.example.com', 'example.com', true), true);
  assert.equal(matchesDomain('badexample.com', 'example.com', true), false);
});

test('getDomainCandidates does not collapse multi-part public suffix domains to co.uk', () => {
  const candidates = getDomainCandidates('shop.example.co.uk');

  assert.deepEqual(candidates, ['shop.example.co.uk']);
  assert.equal(candidates.includes('co.uk'), false);
});

test('getDomainCandidates keeps the normalized hostname only', () => {
  assert.deepEqual(getDomainCandidates('WWW.Example.COM'), ['example.com']);
});

test('urlMatchesCandidates does not match sibling example.co.uk domains', () => {
  const candidates = ['example.co.uk'];

  assert.equal(urlMatchesCandidates('https://shop.example.co.uk/path', candidates, true), true);
  assert.equal(urlMatchesCandidates('https://other.co.uk/path', candidates, true), false);
  assert.equal(urlMatchesCandidates('https://badexample.co.uk/path', candidates, true), false);
});

test('filterHistoryItems keeps exact and child domains without matching public suffix siblings', () => {
  const candidates = getDomainCandidates('shop.example.co.uk');
  const items = [
    { url: 'https://shop.example.co.uk/a' },
    { url: 'https://cdn.shop.example.co.uk/a' },
    { url: 'https://other.co.uk/a' },
    { url: 'https://example.com/a' }
  ];

  assert.deepEqual(
    filterHistoryItems(items, candidates, true).map(item => item.url),
    ['https://shop.example.co.uk/a', 'https://cdn.shop.example.co.uk/a']
  );
});

test('filterHistoryItems does not match unrelated sibling domains', () => {
  const candidates = getDomainCandidates('example.com');
  const items = [
    { url: 'https://example.com/a' },
    { url: 'https://shop.example.com/a' },
    { url: 'https://another-example.com/a' }
  ];

  assert.deepEqual(
    filterHistoryItems(items, candidates, true).map(item => item.url),
    ['https://example.com/a', 'https://shop.example.com/a']
  );
});
