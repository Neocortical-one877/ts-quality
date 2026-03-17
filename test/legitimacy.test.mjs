import test from 'node:test';
import assert from 'assert/strict';
import { importDist } from './helpers.mjs';

const legitimacy = await importDist('packages', 'legitimacy', 'src', 'index.js');

test('signAttestation and verifyAttestation round-trip', () => {
  const pair = legitimacy.generateKeyPair();
  const attestation = legitimacy.signAttestation({
    issuer: 'ci.verify',
    keyId: 'ci.verify',
    privateKeyPem: pair.privateKeyPem,
    subjectType: 'change-bundle',
    subjectDigest: 'sha256:abc',
    claims: ['ci.tests.passed']
  });
  const result = legitimacy.verifyAttestation(attestation, { 'ci.verify': pair.publicKeyPem });
  assert.equal(result.ok, true);
});

test('evaluateAmendment enforces maintainer approvals and evidence', () => {
  const agents = [{ id: 'maintainer', kind: 'human', roles: ['maintainer'], grants: [] }];
  const constitution = [{ kind: 'boundary', id: 'rule-1', from: ['src/**'], to: ['src/internal/**'], mode: 'forbid', message: 'x' }];
  const pending = legitimacy.evaluateAmendment({
    id: 'amend-1',
    title: 'remove rule',
    rationale: 'test',
    evidence: ['migration validated'],
    changes: [{ action: 'remove', ruleId: 'rule-1' }],
    approvals: [{ by: 'maintainer', role: 'maintainer', rationale: 'ok', createdAt: new Date().toISOString(), targetId: 'amend-1' }]
  }, constitution, agents);
  assert.equal(pending.outcome, 'needs-approvals');
});

test('evaluateAmendment counts only unique approvers targeting the proposal id', () => {
  const agents = [
    { id: 'maintainer', kind: 'human', roles: ['maintainer'], grants: [] },
    { id: 'admin', kind: 'human', roles: ['admin'], grants: [] }
  ];
  const constitution = [{ kind: 'risk', id: 'rule-1', paths: ['src/**'], message: 'x', minMergeConfidence: 70 }];
  const pending = legitimacy.evaluateAmendment({
    id: 'amend-2',
    title: 'remove risk rule',
    rationale: 'test',
    evidence: ['migration validated'],
    changes: [{ action: 'remove', ruleId: 'rule-1' }],
    approvals: [
      { by: 'maintainer', role: 'maintainer', rationale: 'ok', createdAt: new Date().toISOString(), targetId: 'amend-2' },
      { by: 'maintainer', role: 'maintainer', rationale: 'duplicate', createdAt: new Date().toISOString(), targetId: 'amend-2' },
      { by: 'admin', role: 'admin', rationale: 'wrong target', createdAt: new Date().toISOString(), targetId: 'other-proposal' }
    ]
  }, constitution, agents);
  assert.equal(pending.outcome, 'needs-approvals');
  assert.deepEqual(pending.approvalsAccepted, ['maintainer']);
});
