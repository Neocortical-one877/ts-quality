# Invariant DSL

Invariants are executable intent. They are written as TypeScript or JavaScript arrays.

```ts
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
  }
];
```

## Selector forms

- `path:src/auth/**`
- `symbol:isRefreshExpired`
- `domain:payments`

## Deterministic reasoning

The engine does not guess semantics. It uses:

- changed-file and diff-hunk impact
- function evidence from CRAP analysis
- mutation survivors in invariant scope
- focused test corpus keywords for happy-path and failure-path scenarios

Focused tests are selected by either:

- explicit `requiredTestPatterns`, or
- deterministic alignment to the impacted source via file-name/import hints

Unrelated tests elsewhere in the repo do not satisfy an invariant just because they contain the same words.

When evidence is weak, it emits concrete `TestObligation` records.
