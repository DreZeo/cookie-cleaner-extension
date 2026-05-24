import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getFirstPartyCookies,
  isCookieProtectedByWhitelist,
  isFirstPartyCookie
} from '../scripts/cookies.js';

const cookie = domain => ({
  domain,
  name: 'sid',
  value: '123',
  path: '/',
  secure: true,
  storeId: '0'
});

test('isFirstPartyCookie matches exact host cookies', () => {
  assert.equal(isFirstPartyCookie(cookie('example.com'), 'example.com', false), true);
  assert.equal(isFirstPartyCookie(cookie('.example.com'), 'example.com', false), true);
  assert.equal(isFirstPartyCookie(cookie('shop.example.com'), 'example.com', false), false);
});

test('isFirstPartyCookie includes subdomains when enabled', () => {
  assert.equal(isFirstPartyCookie(cookie('shop.example.com'), 'example.com', true), true);
  assert.equal(isFirstPartyCookie(cookie('.shop.example.com'), 'example.com', true), true);
  assert.equal(isFirstPartyCookie(cookie('badexample.com'), 'example.com', true), false);
});

test('isFirstPartyCookie treats parent-domain cookies as first-party for subdomain pages', () => {
  assert.equal(isFirstPartyCookie(cookie('.example.com'), 'shop.example.com', true), true);
  assert.equal(isFirstPartyCookie(cookie('example.com'), 'shop.example.com', true), true);
});

test('getFirstPartyCookies separates first-party cookies from unrelated cookies', () => {
  const allCookies = [
    cookie('example.com'),
    cookie('.example.com'),
    cookie('cdn.example.com'),
    cookie('other.com')
  ];

  assert.deepEqual(
    getFirstPartyCookies(allCookies, 'example.com', true).map(c => c.domain),
    ['example.com', '.example.com', 'cdn.example.com']
  );
});

test('isCookieProtectedByWhitelist protects exact whitelist domains only when subdomains are disabled', () => {
  const rules = [{ domain: 'example.com', includeSubdomains: false }];

  assert.equal(isCookieProtectedByWhitelist(cookie('.example.com'), rules), true);
  assert.equal(isCookieProtectedByWhitelist(cookie('shop.example.com'), rules), false);
});

test('isCookieProtectedByWhitelist protects child domains when subdomains are enabled', () => {
  const rules = [{ domain: 'example.com', includeSubdomains: true }];

  assert.equal(isCookieProtectedByWhitelist(cookie('example.com'), rules), true);
  assert.equal(isCookieProtectedByWhitelist(cookie('shop.example.com'), rules), true);
  assert.equal(isCookieProtectedByWhitelist(cookie('badexample.com'), rules), false);
});

test('cookie party classification can distinguish first-party, protected third-party, and removable third-party', () => {
  const allCookies = [
    cookie('example.com'),
    cookie('cdn.example.com'),
    cookie('accounts.example.co.uk'),
    cookie('tracker.test')
  ];
  const whitelistRules = [{ domain: 'example.co.uk', includeSubdomains: true }];

  const firstParty = allCookies.filter(c => isFirstPartyCookie(c, 'example.com', true));
  const protectedThirdParty = allCookies.filter(c =>
    !isFirstPartyCookie(c, 'example.com', true) && isCookieProtectedByWhitelist(c, whitelistRules)
  );
  const removableThirdParty = allCookies.filter(c =>
    !isFirstPartyCookie(c, 'example.com', true) && !isCookieProtectedByWhitelist(c, whitelistRules)
  );

  assert.deepEqual(firstParty.map(c => c.domain), ['example.com', 'cdn.example.com']);
  assert.deepEqual(protectedThirdParty.map(c => c.domain), ['accounts.example.co.uk']);
  assert.deepEqual(removableThirdParty.map(c => c.domain), ['tracker.test']);
});

test('first-party cookie matching does not treat unrelated sibling domains as first-party', () => {
  assert.equal(isFirstPartyCookie(cookie('another-example.com'), 'example.com', true), false);
  assert.equal(isFirstPartyCookie(cookie('.another-example.com'), 'example.com', true), false);
});
