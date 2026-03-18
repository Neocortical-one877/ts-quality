import fs from 'fs';
import os from 'os';
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
  assert.equal(second.executionFingerprint, first.executionFingerprint);
});


test('discoverMutationSites honors diff hunks within changed files', () => {
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
  const sites = mutate.discoverMutationSites(source, 'src/sample.js', [], ['src/sample.js'], [{ filePath: 'src/sample.js', hunkId: 'h1', span: { startLine: 5, endLine: 6 } }], false);
  assert.deepEqual(sites.map((site) => site.span.startLine), [6]);
});


test('runMutations requires a passing baseline before trusting mutation results', () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-quality-mutant-baseline-'));
  fs.mkdirSync(path.join(rootDir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'src', 'flag.js'), 'function flag() { return true; }\nmodule.exports = { flag };\n', 'utf8');
  fs.writeFileSync(path.join(rootDir, 'check.js'), 'process.exit(1);\n', 'utf8');

  const run = mutate.runMutations({
    repoRoot: rootDir,
    sourceFiles: ['src/flag.js'],
    changedFiles: ['src/flag.js'],
    testCommand: ['node', 'check.js'],
    coveredOnly: false,
    maxSites: 5,
    timeoutMs: 5_000
  });

  assert.equal(run.baseline.status, 'fail');
  assert.equal(run.score, 0);
  assert.equal(run.results.every((result) => result.status === 'error'), true);
});


test('runMutations invalidates manifest entries when the test corpus changes', () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-quality-mutant-manifest-'));
  const manifestPath = path.join(rootDir, '.ts-quality', 'mutation-manifest.json');
  fs.mkdirSync(path.join(rootDir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'src', 'flag.js'), 'function flag() { return true; }\nmodule.exports = { flag };\n', 'utf8');
  fs.writeFileSync(path.join(rootDir, 'state.json'), JSON.stringify({ ok: true }), 'utf8');
  fs.writeFileSync(path.join(rootDir, 'check.js'), "const fs = require('fs'); const state = JSON.parse(fs.readFileSync('state.json', 'utf8')); process.exit(state.ok ? 0 : 1);\n", 'utf8');

  const first = mutate.runMutations({
    repoRoot: rootDir,
    sourceFiles: ['src/flag.js'],
    changedFiles: ['src/flag.js'],
    testCommand: ['node', 'check.js'],
    coveredOnly: false,
    manifestPath,
    maxSites: 5,
    timeoutMs: 5_000
  });
  fs.writeFileSync(path.join(rootDir, 'state.json'), JSON.stringify({ ok: false }), 'utf8');
  const second = mutate.runMutations({
    repoRoot: rootDir,
    sourceFiles: ['src/flag.js'],
    changedFiles: ['src/flag.js'],
    testCommand: ['node', 'check.js'],
    coveredOnly: false,
    manifestPath,
    maxSites: 5,
    timeoutMs: 5_000
  });

  assert.equal(first.baseline.status, 'pass');
  assert.equal(second.baseline.status, 'fail');
  assert.equal(second.executionFingerprint === first.executionFingerprint, false);
  assert.equal(second.results.every((result) => result.status === 'error'), true);
});


test('runMutations ignores inherited NODE_TEST_CONTEXT and keeps mutation outcomes deterministic', () => {
  const cleanRoot = tempCopyOfFixture('governed-app');
  const contaminatedRoot = tempCopyOfFixture('governed-app');
  const cleanCoverage = crap.parseLcov(fs.readFileSync(path.join(cleanRoot, 'coverage', 'lcov.info'), 'utf8'));
  const contaminatedCoverage = crap.parseLcov(fs.readFileSync(path.join(contaminatedRoot, 'coverage', 'lcov.info'), 'utf8'));

  const clean = mutate.runMutations({
    repoRoot: cleanRoot,
    sourceFiles: ['src/auth/token.js'],
    changedFiles: ['src/auth/token.js'],
    coverage: cleanCoverage,
    testCommand: ['node', '--test'],
    coveredOnly: true,
    manifestPath: path.join(cleanRoot, '.ts-quality', 'mutation-manifest.json'),
    maxSites: 4,
    timeoutMs: 10_000
  });

  const previous = process.env.NODE_TEST_CONTEXT;
  process.env.NODE_TEST_CONTEXT = 'child-v8';
  try {
    const contaminated = mutate.runMutations({
      repoRoot: contaminatedRoot,
      sourceFiles: ['src/auth/token.js'],
      changedFiles: ['src/auth/token.js'],
      coverage: contaminatedCoverage,
      testCommand: ['node', '--test'],
      coveredOnly: true,
      manifestPath: path.join(contaminatedRoot, '.ts-quality', 'mutation-manifest.json'),
      maxSites: 4,
      timeoutMs: 10_000
    });

    assert.equal(clean.executionFingerprint, contaminated.executionFingerprint);
    assert.deepEqual(
      contaminated.results.map((result) => result.status),
      clean.results.map((result) => result.status)
    );
    assert.equal(contaminated.survived, clean.survived);
    assert.equal(contaminated.killed, clean.killed);
    assert.equal(contaminated.results.some((result) => (result.details ?? '').includes('run() is being called recursively')), false);
  } finally {
    if (previous === undefined) {
      delete process.env.NODE_TEST_CONTEXT;
    } else {
      process.env.NODE_TEST_CONTEXT = previous;
    }
  }
});
