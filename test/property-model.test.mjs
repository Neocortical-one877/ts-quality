import test from 'node:test';
import assert from 'assert/strict';
import { importDist } from './helpers.mjs';

const evidence = await importDist('packages', 'evidence-model', 'src', 'index.js');

function randomPath(seed) {
  let value = seed;
  const parts = [];
  for (let index = 0; index < 4; index += 1) {
    value = (value * 1664525 + 1013904223) % 4294967296;
    parts.push(`p${value % 7}`);
  }
  return parts.join(seed % 2 === 0 ? '\\' : '/');
}

for (let seed = 1; seed <= 8; seed += 1) {
  test(`normalizePath property seed ${seed}`, () => {
    const raw = `./${seed % 2 === 0 ? 'src' : 'packages'}/${randomPath(seed)}/`;
    const normalized = evidence.normalizePath(raw);
    assert.equal(evidence.normalizePath(normalized), normalized);
  });
}

test('stableStringify round-trips random objects', () => {
  for (let index = 0; index < 10; index += 1) {
    const value = { [`k${10 - index}`]: index, nested: { b: index + 1, a: index } };
    const parsed = JSON.parse(evidence.stableStringify(value));
    assert.deepEqual(parsed, { [`k${10 - index}`]: index, nested: { a: index, b: index + 1 } });
  }
});
