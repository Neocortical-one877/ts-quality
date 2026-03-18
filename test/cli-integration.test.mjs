import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import test from 'node:test';
import assert from 'assert/strict';
import { repoRoot, tempCopyOfFixture, latestRunId } from './helpers.mjs';

const cli = path.join(repoRoot, 'dist', 'packages', 'ts-quality', 'src', 'cli.js');

test('init creates starter files in an empty repo', () => {
  const target = tempCopyOfFixture('governed-app');
  fs.rmSync(path.join(target, 'ts-quality.config.ts'), { force: true });
  fs.rmSync(path.join(target, '.ts-quality'), { recursive: true, force: true });
  const result = spawnSync('node', [cli, 'init', '--root', target], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.equal(fs.existsSync(path.join(target, 'ts-quality.config.ts')), true);
  assert.equal(fs.existsSync(path.join(target, '.ts-quality', 'invariants.ts')), true);
});

test('check, report, and explain produce artifacts', () => {
  const target = tempCopyOfFixture('governed-app');
  const check = spawnSync('node', [cli, 'check', '--root', target], { encoding: 'utf8' });
  assert.equal(check.status, 0);
  const runId = latestRunId(target);
  const reportPath = path.join(target, '.ts-quality', 'runs', runId, 'report.md');
  const prSummaryPath = path.join(target, '.ts-quality', 'runs', runId, 'pr-summary.md');
  assert.equal(fs.existsSync(reportPath), true);
  const report = spawnSync('node', [cli, 'report', '--root', target], { encoding: 'utf8' });
  const explain = spawnSync('node', [cli, 'explain', '--root', target], { encoding: 'utf8' });
  assert.match(fs.readFileSync(reportPath, 'utf8'), /^---\nsummary:/);
  assert.match(fs.readFileSync(prSummaryPath, 'utf8'), /^---\nsummary:/);
  assert.match(report.stdout, /Merge confidence/);
  assert.match(report.stdout, /mutation scope: [0-9]+ site\(s\), [0-9]+ killed, [0-9]+ survived/);
  assert.match(report.stdout, /focused-test-alignment \[clear; mode=inferred\]: 1 focused test file aligned to invariant scope/);
  assert.match(report.stdout, /mutation-pressure \[warning; mode=explicit\]: [0-9]+ surviving mutants? across [0-9]+ mutation sites?/);
  assert.match(explain.stdout, /Reasons:/);
  assert.match(explain.stdout, /focused tests: test\/token.test.js/);
  assert.match(explain.stdout, /scenario-support \[missing; mode=missing\]: 0\/1 scenario\(s\) have deterministic support/);
});

test('check --help renders usage instead of executing analysis', () => {
  const result = spawnSync('node', [cli, 'check', '--help'], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage: ts-quality check/);
  assert.equal(result.stderr, '');
});

test('attest sign accepts cwd-relative paths even when --root is also set', () => {
  const target = tempCopyOfFixture('governed-app');
  const check = spawnSync('node', [cli, 'check', '--root', target], { encoding: 'utf8' });
  assert.equal(check.status, 0);
  const runId = latestRunId(target);
  const cwd = path.dirname(target);
  const rootedSubject = path.join(path.basename(target), '.ts-quality', 'runs', runId, 'verdict.json');
  const rootedOutput = path.join(path.basename(target), '.ts-quality', 'attestations', 'edge.json');
  const sign = spawnSync('node', [cli, 'attest', 'sign', '--root', target, '--issuer', 'ci.verify', '--key-id', 'sample', '--private-key', '.ts-quality/keys/sample.pem', '--subject', rootedSubject, '--claims', 'ci.tests.passed', '--out', rootedOutput], { encoding: 'utf8', cwd });
  assert.equal(sign.status, 0, sign.stderr);
  assert.equal(fs.existsSync(path.join(target, '.ts-quality', 'attestations', 'edge.json')), true);
});

test('attest verify fails when the signed subject file changes', () => {
  const target = tempCopyOfFixture('governed-app');
  let result = spawnSync('node', [cli, 'check', '--root', target], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  const runId = latestRunId(target);
  const subject = path.join('.ts-quality', 'runs', runId, 'verdict.json');
  const output = path.join('.ts-quality', 'attestations', 'tamper-check.json');
  result = spawnSync('node', [cli, 'attest', 'sign', '--root', target, '--issuer', 'ci.verify', '--key-id', 'sample', '--private-key', '.ts-quality/keys/sample.pem', '--subject', subject, '--claims', 'ci.tests.passed', '--out', output], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  fs.appendFileSync(path.join(target, subject), '\n', 'utf8');
  result = spawnSync('node', [cli, 'attest', 'verify', '--root', target, '--attestation', output, '--trusted-keys', '.ts-quality/keys'], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /failed \(subject digest mismatch\)/);
});
