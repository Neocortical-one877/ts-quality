export default [
  {
    id: 'maintainer',
    kind: 'human',
    roles: ['maintainer'],
    grants: [
      {
        id: 'maintainer-all',
        actions: ['merge', 'override', 'amend'],
        paths: ['packages/**'],
        minMergeConfidence: 0
      }
    ]
  }
];
