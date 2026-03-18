import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import test from 'node:test';
import assert from 'assert/strict';
import { latestRunId, repoRoot, tempCopyOfFixture } from './helpers.mjs';

const cli = path.join(repoRoot, 'dist', 'packages', 'ts-quality', 'src', 'cli.js');

test('concise operator outputs keep stable provenance framing', () => {
  const target = tempCopyOfFixture('governed-app');
  const check = spawnSync('node', [cli, 'check', '--root', target], { encoding: 'utf8' });
  assert.equal(check.status, 0);
  const runId = latestRunId(target);
  const base = path.join(target, '.ts-quality', 'runs', runId);
  const summary = fs.readFileSync(path.join(base, 'pr-summary.md'), 'utf8');
  const plan = fs.readFileSync(path.join(base, 'plan.txt'), 'utf8');
  const govern = fs.readFileSync(path.join(base, 'govern.txt'), 'utf8');
  assert.match(summary, /^---\nsummary:/);
  assert.match(summary, /Merge confidence: \*\*[0-9]+\/100\*\*/);
  assert.match(summary, /Best next action:/);
  assert.match(summary, /Surviving mutants:/);
  assert.match(summary, /Evidence provenance: explicit [0-9]+, inferred [0-9]+, missing [0-9]+/);
  assert.match(summary, /focused-test-alignment \[clear; mode=inferred\]: 1 focused test file aligned to invariant scope/);
  assert.match(summary, /scenario-support \[missing; mode=missing\]: 0\/1 scenario\(s\) have deterministic support/);
  assert.match(plan, /Invariant evidence at risk: auth\.refresh\.validity/);
  assert.match(plan, /Evidence provenance: explicit [0-9]+, inferred [0-9]+, missing [0-9]+/);
  assert.match(plan, /mutation-pressure \[warning; mode=explicit\]: [0-9]+ surviving mutants across [0-9]+ mutation sites/);
  assert.match(govern, /Invariant evidence at risk: auth\.refresh\.validity/);
  assert.match(govern, /scenario-support \[missing; mode=missing\]: 0\/1 scenario\(s\) have deterministic support/);
});
