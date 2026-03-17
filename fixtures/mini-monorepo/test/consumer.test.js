const test = require('node:test');
const assert = require('assert/strict');
const { consumerEmail } = require('../packages/api/src/consumer');

test('consumer email reads identity data', () => {
  assert.equal(consumerEmail({ id: 'c1', email: 'a@example.com' }), 'a@example.com');
});
