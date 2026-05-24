import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createPrivacyCapability,
  createPrivacyClearResult,
  getPrivacyClearMessageKey,
  getPrivacyConfirmMessageKey,
  getPrivacyLogDetail,
  getPrivacyTimeRangeTextKey
} from '../scripts/privacy-model.js';

test('createPrivacyCapability describes browser-scoped unverifiable cleanup capability', () => {
  assert.deepEqual(createPrivacyCapability('formData', '86400000', true), {
    action: 'formData',
    available: true,
    verified: false,
    scope: 'browser',
    timeRangeMs: 86400000
  });
});

test('createPrivacyClearResult normalizes success and failure results', () => {
  assert.deepEqual(createPrivacyClearResult('passwords', 0, 'success'), {
    action: 'passwords',
    result: 'success',
    verified: false,
    scope: 'browser',
    timeRangeMs: 0,
    error: ''
  });

  const failed = createPrivacyClearResult('passwords', 3600000, 'failed', 'API unavailable');
  assert.equal(failed.result, 'failed');
  assert.equal(failed.error, 'API unavailable');
});

test('getPrivacyTimeRangeTextKey maps known privacy ranges to existing i18n keys', () => {
  assert.equal(getPrivacyTimeRangeTextKey(3600000), 'history.range.1h');
  assert.equal(getPrivacyTimeRangeTextKey(86400000), 'history.range.24h');
  assert.equal(getPrivacyTimeRangeTextKey(604800000), 'history.range.7d');
  assert.equal(getPrivacyTimeRangeTextKey(2419200000), 'history.range.4w');
  assert.equal(getPrivacyTimeRangeTextKey(0), 'history.range.all');
  assert.equal(getPrivacyTimeRangeTextKey('not-a-number'), 'history.range.all');
});

test('privacy message helpers return action-specific keys', () => {
  assert.equal(getPrivacyClearMessageKey({ result: 'success' }), 'message.privacyClearRequestDone');
  assert.equal(getPrivacyClearMessageKey({ result: 'failed' }), 'message.privacyClearFailed');
  assert.equal(getPrivacyConfirmMessageKey('formData'), 'message.highRiskConfirmFormData');
  assert.equal(getPrivacyConfirmMessageKey('passwords'), 'message.highRiskConfirmPasswords');
});

test('getPrivacyLogDetail records unverifiable scope and time range diagnostics', () => {
  assert.equal(
    getPrivacyLogDetail({
      verified: false,
      scope: 'browser',
      timeRangeMs: 604800000,
      error: 'remove failed'
    }),
    'verified=false,scope=browser,timeRangeMs=604800000,error=remove failed'
  );
});
