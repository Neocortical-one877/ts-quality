export default [
  {
    kind: 'risk',
    id: 'auth-risk-budget',
    paths: ['src/auth/**'],
    message: 'Auth changes need stronger evidence.',
    maxCrap: 15,
    minMutationScore: 0.75,
    minMergeConfidence: 65
  }
];
