import fs from 'fs';
import os from 'os';
import path from 'path';
import test from 'node:test';
import assert from 'assert/strict';
import { fixturePath, importDist } from './helpers.mjs';

const crap = await importDist('packages', 'crap4ts', 'src', 'index.js');
const mutate = await importDist('packages', 'ts-mutate', 'src', 'index.js');
const invariants = await importDist('packages', 'invariants', 'src', 'index.js');
const config = await importDist('packages', 'ts-quality', 'src', 'config.js');

test('evaluateInvariants produces obligations for missing failure-path tests', () => {
  const rootDir = fixturePath('governed-app');
  const coverage = crap.parseLcov(fs.readFileSync(path.join(rootDir, 'coverage', 'lcov.info'), 'utf8'));
  const complexity = crap.analyzeCrap({ rootDir, sourceFiles: ['src/auth/token.js'], coverage, changedFiles: ['src/auth/token.js'] }).hotspots;
  const mutationRun = mutate.runMutations({
    repoRoot: rootDir,
    sourceFiles: ['src/auth/token.js'],
    changedFiles: ['src/auth/token.js'],
    coverage,
    testCommand: ['node', '--test'],
    coveredOnly: true,
    maxSites: 3,
    timeoutMs: 10_000
  });
  const claims = invariants.evaluateInvariants({
    rootDir,
    invariants: config.loadInvariants(rootDir, '.ts-quality/invariants.ts'),
    changedFiles: ['src/auth/token.js'],
    changedRegions: [],
    complexity,
    mutationSites: mutationRun.sites,
    mutations: mutationRun.results,
    testPatterns: ['test/**/*.js']
  });
  const authClaim = claims.find((claim) => claim.invariantId === 'auth.refresh.validity');
  assert.equal(authClaim.status, 'at-risk');
  assert.equal(authClaim.obligations.length > 0, true);
});
test('evaluateInvariants ignores unrelated mjs tests even if they contain the right keywords', () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-quality-invariants-unrelated-'));
  fs.mkdirSync(path.join(rootDir, 'src'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'tests'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'src', 'TriggerEditor.js'), 'export function getContext() { return true; }\n', 'utf8');
  fs.writeFileSync(path.join(rootDir, 'tests', 'other-behavior.test.mjs'), "test('other', () => { const cwd = 'x'; const sessionCtx = {}; const value = undefined; });\n", 'utf8');

  const claims = invariants.evaluateInvariants({
    rootDir,
    invariants: [{
      id: 'trigger-editor.session-context',
      title: 'Session context propagation',
      description: 'TriggerEditor must propagate cwd and sessionKey to context.',
      severity: 'medium',
      selectors: ['path:src/TriggerEditor.js', 'symbol:getContext'],
      scenarios: [{ id: 'context-has-cwd', description: 'context includes session cwd', keywords: ['cwd', 'sessionCtx'], failurePathKeywords: ['undefined'], expected: 'defined' }]
    }],
    changedFiles: ['src/TriggerEditor.js'],
    changedRegions: [],
    complexity: [{ kind: 'complexity', filePath: 'src/TriggerEditor.js', symbol: 'function:getContext', span: { startLine: 1, endLine: 1 }, complexity: 1, coveragePct: 100, crap: 1, changed: true }],
    mutationSites: [],
    mutations: [],
    testPatterns: ['tests/**/*.mjs']
  });

  assert.equal(claims[0].status, 'unsupported');
  assert.match(claims[0].evidence.join('\n'), /No focused test files matched invariant scope/);
});

test('evaluateInvariants accepts focused mjs tests aligned to the impacted file', () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-quality-invariants-focused-'));
  fs.mkdirSync(path.join(rootDir, 'src'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'tests'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'src', 'TriggerEditor.js'), 'export function getContext() { return true; }\n', 'utf8');
  fs.writeFileSync(path.join(rootDir, 'tests', 'trigger-editor.test.mjs'), "test('TriggerEditor context', () => { const cwd = 'x'; const sessionCtx = {}; const value = undefined; });\n", 'utf8');

  const claims = invariants.evaluateInvariants({
    rootDir,
    invariants: [{
      id: 'trigger-editor.session-context',
      title: 'Session context propagation',
      description: 'TriggerEditor must propagate cwd and sessionKey to context.',
      severity: 'medium',
      selectors: ['path:src/TriggerEditor.js', 'symbol:getContext'],
      scenarios: [{ id: 'context-has-cwd', description: 'context includes session cwd', keywords: ['cwd', 'sessionCtx'], failurePathKeywords: ['undefined'], expected: 'defined' }]
    }],
    changedFiles: ['src/TriggerEditor.js'],
    changedRegions: [],
    complexity: [{ kind: 'complexity', filePath: 'src/TriggerEditor.js', symbol: 'function:getContext', span: { startLine: 1, endLine: 1 }, complexity: 1, coveragePct: 100, crap: 1, changed: true }],
    mutationSites: [],
    mutations: [],
    testPatterns: ['tests/**/*.mjs']
  });

  assert.equal(claims[0].status, 'supported');
  assert.match(claims[0].evidence.join('\n'), /Focused tests: tests\/trigger-editor.test.mjs/);
});
