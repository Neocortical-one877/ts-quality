---
summary: "Agent legitimacy, grant scope, and authorization decision model for ts-quality."
read_when:
  - "When editing agent grants or legitimacy rules"
  - "When interpreting authorization outcomes"
type: "reference"
---

# Legitimacy and agent licensing

Agents define who or what may act.

```ts
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
  }
];
```

Authorization considers:

- grant scope
- changed files
- merge confidence
- constitutional approval rules
- verified attestation claims
- recorded overrides

Recorded overrides are re-validated against human `override` grants on the exact changed scope. An override record without a matching override grant is ignored rather than treated as a blanket bypass.

Outputs are explicit decisions: approve, deny, narrow-scope, request-more-proof, or require-human-approver.
