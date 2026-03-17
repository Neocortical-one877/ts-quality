export default [
  {
    kind: 'risk',
    id: 'auth-risk-budget',
    paths: ['src/auth/**'],
    message: 'Auth code requires stronger evidence because it decides authorization.',
    maxCrap: 15,
    minMutationScore: 0.75,
    minMergeConfidence: 65
  },
  {
    kind: 'approval',
    id: 'payments-maintainer-approval',
    paths: ['src/payments/**'],
    message: 'Payment domain changes require a maintainer approval.',
    minApprovals: 1,
    roles: ['maintainer']
  },
  {
    kind: 'boundary',
    id: 'pii-boundary',
    from: ['src/shared/**'],
    to: ['src/identity/**'],
    mode: 'forbid',
    message: 'Shared utility code may not depend directly on identity state.'
  }
];
