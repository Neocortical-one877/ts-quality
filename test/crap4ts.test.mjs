import fs from 'fs';
import path from 'path';
import test from 'node:test';
import assert from 'assert/strict';
import { fixturePath, importDist } from './helpers.mjs';

const crap = await importDist('packages', 'crap4ts', 'src', 'index.js');

test('parseLcov reads coverage entries', () => {
  const lcov = fs.readFileSync(path.join(fixturePath('governed-app'), 'coverage', 'lcov.info'), 'utf8');
  const coverage = crap.parseLcov(lcov);
  assert.equal(coverage[0].filePath, 'src/auth/token.js');
  assert.equal(coverage[0].coveredLines > 0, true);
});

test('crapScore increases with lower coverage', () => {
  assert.ok(crap.crapScore(5, 50) > crap.crapScore(5, 100));
});

test('analyzeCrap marks changed functions', () => {
  const lcov = fs.readFileSync(path.join(fixturePath('governed-app'), 'coverage', 'lcov.info'), 'utf8');
  const report = crap.analyzeCrap({
    rootDir: fixturePath('governed-app'),
    sourceFiles: ['src/auth/token.js'],
    coverage: crap.parseLcov(lcov),
    changedFiles: ['src/auth/token.js']
  });
  assert.equal(report.hotspots.length >= 2, true);
  assert.equal(report.hotspots.some((item) => item.changed), true);
});
