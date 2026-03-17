export default [
  {
    id: 'release-bot',
    kind: 'automation',
    roles: ['ci'],
    grants: [
      {
        id: 'release-bot-merge',
        actions: ['merge'],
        paths: ['src/**'],
        minMergeConfidence: 80,
        requireAttestations: ['ci.tests.passed'],
        requireHumanReview: true
      }
    ]
  },
  {
    id: 'maintainer',
    kind: 'human',
    roles: ['maintainer'],
    grants: [
      {
        id: 'maintainer-merge',
        actions: ['merge', 'override', 'amend'],
        paths: ['src/**'],
        minMergeConfidence: 60
      }
    ]
  },
  {
    id: 'security-lead',
    kind: 'human',
    roles: ['security'],
    grants: [
      {
        id: 'security-override',
        actions: ['override'],
        paths: ['src/auth/**'],
        minMergeConfidence: 0
      }
    ]
  }
];
