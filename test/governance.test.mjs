import test from 'node:test';
import assert from 'assert/strict';
import { fixturePath, importDist } from './helpers.mjs';

const governance = await importDist('packages', 'governance', 'src', 'index.js');
const config = await importDist('packages', 'ts-quality', 'src', 'config.js');

test('evaluateGovernance catches extensionless forbidden imports', () => {
  const rootDir = fixturePath('mini-monorepo');
  const constitution = config.loadConstitution(rootDir, '.ts-quality/constitution.ts');
  const findings = governance.evaluateGovernance({
    rootDir,
    constitution,
    changedFiles: ['packages/api/src/consumer.js'],
    changedRegions: []
  });
  assert.equal(findings.length, 1);
  assert.match(findings[0].evidence[0], /identity\/src\/store\.js/);
});

test('approval rules count only unique targeted approvals', () => {
  const rootDir = fixturePath('governed-app');
  const findings = governance.evaluateGovernance({
    rootDir,
    constitution: [{
      kind: 'approval',
      id: 'payments-maintainer-approval',
      paths: ['src/payments/**'],
      message: 'Payments require explicit approval.',
      minApprovals: 2,
      roles: ['maintainer']
    }],
    changedFiles: ['src/payments/ledger.js'],
    changedRegions: [],
    approvals: [
      { by: 'maintainer-a', role: 'maintainer', rationale: 'ok', createdAt: new Date().toISOString(), targetId: 'payments-maintainer-approval' },
      { by: 'maintainer-a', role: 'maintainer', rationale: 'duplicate', createdAt: new Date().toISOString(), targetId: 'payments-maintainer-approval' },
      { by: 'maintainer-b', role: 'maintainer', rationale: 'wrong target', createdAt: new Date().toISOString(), targetId: 'other-target' }
    ]
  });
  assert.equal(findings.length, 1);
  assert.match(findings[0].evidence[0], /Approvals present 1\/2/);
});
