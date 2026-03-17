import fs from 'fs';
import os from 'os';
import path from 'path';
import test from 'node:test';
import assert from 'assert/strict';
import { importDist } from './helpers.mjs';

const config = await importDist('packages', 'ts-quality', 'src', 'config.js');

test('loadContext accepts ts-quality.config.mjs', () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-quality-config-'));
  fs.writeFileSync(path.join(rootDir, 'ts-quality.config.mjs'), `export default {
  sourcePatterns: ['src/**/*.mjs'],
  testPatterns: ['tests/**/*.mjs'],
  mutations: { testCommand: ['node', '--test'] }
};
`, 'utf8');

  const loaded = config.loadContext(rootDir);
  assert.equal(path.basename(loaded.configPath), 'ts-quality.config.mjs');
  assert.deepEqual(Array.from(loaded.config.sourcePatterns), ['src/**/*.mjs']);
  assert.deepEqual(Array.from(loaded.config.testPatterns), ['tests/**/*.mjs']);
});
