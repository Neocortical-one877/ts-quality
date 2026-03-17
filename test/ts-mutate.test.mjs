import fs from 'fs';
import path from 'path';
import test from 'node:test';
import assert from 'assert/strict';
import { fixturePath, importDist, tempCopyOfFixture } from './helpers.mjs';

const mutate = await importDist('packages', 'ts-mutate', 'src', 'index.js');
const crap = await importDist('packages', 'crap4ts', 'src', 'index.js');

test('discoverMutationSites finds boolean and operator mutations', () => {
  const filePath = path.join(fixturePath('governed-app'), 'src', 'auth', 'token.js');
  const source = fs.readFileSync(filePath, 'utf8');
  const coverage = crap.parseLcov(fs.readFileSync(path.join(fixturePath('governed-app'), 'coverage', 'lcov.info'), 'utf8'));
  const sites = mutate.discoverMutationSites(source, 'src/auth/token.js', coverage, ['src/auth/token.js'], [], true);
  assert.equal(sites.length > 0, true);
  assert.equal(sites.some((site) => site.original === '>=' || site.replacement === '>='), true);
});

test('applyMutation replaces exact span instead of first matching line fragment', () => {
  const source = 'const value = left >= right;\n';
  const site = {
    id: 'x',
    filePath: 'sample.js',
    span: { startLine: 1, endLine: 1 },
    startOffset: 19,
    endOffset: 21,
    operator: '>=',
    original: '>=',
    replacement: '>',
    description: 'tighten'
  };
  assert.equal(mutate.applyMutation(source, site), 'const value = left > right;\n');
});

test('runMutations writes manifest and reuses cached results', () => {
  const rootDir = tempCopyOfFixture('governed-app');
  const manifestPath = path.join(rootDir, '.ts-quality', 'mutation-manifest.json');
  const coverage = crap.parseLcov(fs.readFileSync(path.join(rootDir, 'coverage', 'lcov.info'), 'utf8'));
  const first = mutate.runMutations({
    repoRoot: rootDir,
    sourceFiles: ['src/auth/token.js'],
    changedFiles: ['src/auth/token.js'],
    coverage,
    testCommand: ['node', '--test'],
    coveredOnly: true,
    manifestPath,
    maxSites: 3,
    timeoutMs: 10_000
  });
  const second = mutate.runMutations({
    repoRoot: rootDir,
    sourceFiles: ['src/auth/token.js'],
    changedFiles: ['src/auth/token.js'],
    coverage,
    testCommand: ['node', '--test'],
    coveredOnly: true,
    manifestPath,
    maxSites: 3,
    timeoutMs: 10_000
  });
  assert.equal(fs.existsSync(manifestPath), true);
  assert.equal(second.results.length, first.results.length);
});
