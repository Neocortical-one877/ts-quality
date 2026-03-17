const test = require('node:test');
const assert = require('assert/strict');
const { issueAccessDecision, canUseRefreshToken } = require('../src/auth/token');

test('active token before expiry allows access', () => {
  const now = 1_700_000_000_000;
  const token = { status: 'active', expiresAtMs: now + 5_000 };
  assert.equal(canUseRefreshToken(token, now), true);
  assert.equal(issueAccessDecision(token, now), 'allow');
});

test('missing token denies access', () => {
  assert.equal(issueAccessDecision(undefined, 1_700_000_000_000), 'deny');
});
