import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import test from 'node:test';
import assert from 'assert/strict';
import { repoRoot, tempCopyOfFixture } from './helpers.mjs';

const cli = path.join(repoRoot, 'dist', 'packages', 'ts-quality', 'src', 'cli.js');

test('amend evaluates sensitive proposal with duplicate approvals as needing more approval', () => {
  const target = tempCopyOfFixture('governed-app');
  const proposalPath = path.join(target, 'proposal.json');
  fs.writeFileSync(proposalPath, JSON.stringify({
    id: 'amend-auth-risk',
    title: 'Tune auth risk budget',
    rationale: 'Need a temporary policy adjustment during migration.',
    evidence: ['migration plan approved'],
    changes: [{
      action: 'replace',
      ruleId: 'auth-risk-budget',
      rule: {
        kind: 'risk',
        id: 'auth-risk-budget',
        paths: ['src/auth/**'],
        message: 'Adjusted during migration window.',
        maxCrap: 20,
        minMutationScore: 0.7,
        minMergeConfidence: 60
      }
    }],
    approvals: [
      { by: 'maintainer', role: 'maintainer', rationale: 'ok', createdAt: new Date().toISOString(), targetId: 'amend-auth-risk' },
      { by: 'maintainer', role: 'maintainer', rationale: 'duplicate fixture approval', createdAt: new Date().toISOString(), targetId: 'amend-auth-risk' }
    ]
  }, null, 2));
  const result = spawnSync('node', [cli, 'amend', '--root', target, '--proposal', proposalPath], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.outcome, 'needs-approvals');
});

test('amend --apply writes a loadable constitution module', () => {
  const target = tempCopyOfFixture('governed-app');
  const proposalPath = path.join(target, 'proposal-apply.json');
  fs.writeFileSync(proposalPath, JSON.stringify({
    id: 'amend-payments-approval-message',
    title: 'Clarify payment approval wording',
    rationale: 'Non-sensitive wording update.',
    evidence: ['docs updated'],
    changes: [{
      action: 'replace',
      ruleId: 'payments-maintainer-approval',
      rule: {
        kind: 'approval',
        id: 'payments-maintainer-approval',
        paths: ['src/payments/**'],
        message: 'Payment changes require explicit maintainer review.',
        minApprovals: 1,
        roles: ['maintainer']
      }
    }],
    approvals: [
      { by: 'maintainer', role: 'maintainer', rationale: 'wording ok', createdAt: new Date().toISOString(), targetId: 'amend-payments-approval-message' }
    ]
  }, null, 2));

  let result = spawnSync('node', [cli, 'amend', '--root', target, '--proposal', proposalPath, '--apply'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.outcome, 'approved');
  const constitutionText = fs.readFileSync(path.join(target, '.ts-quality', 'constitution.ts'), 'utf8');
  assert.match(constitutionText, /export default/);
  result = spawnSync('node', [cli, 'check', '--root', target], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
