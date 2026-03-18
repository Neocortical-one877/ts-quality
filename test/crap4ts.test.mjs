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


test('analyzeSource narrows changed functions to diff hunks within a changed file', () => {
  const source = [
    'function first(a, b) {',
    '  return a === b;',
    '}',
    '',
    'function second(a, b) {',
    '  return a > b;',
    '}',
    ''
  ].join('\n');
  const functions = crap.analyzeSource('src/sample.js', source, [], new Set(['src/sample.js']), [{ filePath: 'src/sample.js', hunkId: 'h1', span: { startLine: 5, endLine: 6 } }]);
  assert.equal(functions.find((item) => item.symbol === 'function:first')?.changed, false);
  assert.equal(functions.find((item) => item.symbol === 'function:second')?.changed, true);
});


test('analyzeSource prefers exact LCOV matches over suffix collisions', () => {
  const coverage = crap.parseLcov([
    'SF:packages/a/src/index.js',
    'DA:1,0',
    'end_of_record',
    'SF:src/index.js',
    'DA:1,1',
    'end_of_record',
    ''
  ].join('\n'));
  const [result] = crap.analyzeSource('src/index.js', 'function root() { return true; }\n', coverage, new Set(['src/index.js']), []);
  assert.equal(result.coveragePct, 100);
});
