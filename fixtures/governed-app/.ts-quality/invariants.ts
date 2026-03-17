export default [
  {
    id: 'auth.refresh.validity',
    title: 'Refresh token validity',
    description: 'Expired refresh tokens must never authorize access.',
    severity: 'high',
    selectors: ['path:src/auth/**', 'symbol:isRefreshExpired'],
    scenarios: [
      {
        id: 'expired-boundary',
        description: 'exact expiry boundary denies access',
        keywords: ['active token before expiry allows access'],
        failurePathKeywords: ['exact expiry boundary denies access'],
        expected: 'deny'
      }
    ]
  },
  {
    id: 'payments.exactly-once',
    title: 'Payment recording is effectively exactly once',
    description: 'Duplicate payment ids must not be recorded twice.',
    severity: 'critical',
    selectors: ['path:src/payments/**'],
    scenarios: [
      {
        id: 'duplicate-payment',
        description: 'duplicate payment id returns duplicate',
        keywords: ['duplicate payment id returns duplicate'],
        expected: 'duplicate'
      }
    ]
  }
];
