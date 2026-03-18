import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import test from 'node:test';
import assert from 'assert/strict';
import { latestRunId, repoRoot, tempCopyOfFixture } from './helpers.mjs';

const cli = path.join(repoRoot, 'dist', 'packages', 'ts-quality', 'src', 'cli.js');

test('PR summary keeps stable user-facing framing', () => {
  const target = tempCopyOfFixture('governed-app');
  const check = spawnSync('node', [cli, 'check', '--root', target], { encoding: 'utf8' });
  assert.equal(check.status, 0);
  const runId = latestRunId(target);
  const summary = fs.readFileSync(path.join(target, '.ts-quality', 'runs', runId, 'pr-summary.md'), 'utf8');
  assert.match(summary, /^---\nsummary:/);
  assert.match(summary, /Merge confidence: \*\*[0-9]+\/100\*\*/);
  assert.match(summary, /Best next action:/);
  assert.match(summary, /Surviving mutants:/);
});
