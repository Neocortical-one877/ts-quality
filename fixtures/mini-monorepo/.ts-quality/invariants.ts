export default [
  {
    id: 'pii.boundary',
    title: 'PII boundary',
    description: 'API packages must not directly own identity state.',
    severity: 'critical',
    selectors: ['path:packages/api/**'],
    scenarios: [
      {
        id: 'api-does-not-own-pii',
        description: 'api package uses approved projections only',
        keywords: ['consumer email reads identity data'],
        expected: 'projection-only'
      }
    ]
  }
];
