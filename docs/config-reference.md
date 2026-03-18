---
summary: "Configuration reference for ts-quality.config.* inputs and defaults."
read_when:
  - "When editing ts-quality configuration"
  - "When checking supported config keys and defaults"
type: "reference"
---

# Config reference

`ts-quality.config.*` may be `.ts`, `.js`, `.mjs`, `.cjs`, or `.json` and exports a plain object.

```ts
export default {
  sourcePatterns: ['src/**/*.ts', 'src/**/*.tsx', 'src/**/*.js', 'src/**/*.jsx', 'src/**/*.mjs', 'src/**/*.cjs'],
  testPatterns: ['test/**/*.js', 'test/**/*.mjs', 'test/**/*.cjs', 'test/**/*.ts', '**/*.test.js', '**/*.test.mjs', '**/*.test.cjs', '**/*.spec.ts'],
  coverage: { lcovPath: 'coverage/lcov.info' },
  mutations: {
    testCommand: ['node', '--test'],
    coveredOnly: true,
    timeoutMs: 15000,
    maxSites: 25
  },
  policy: {
    maxChangedCrap: 30,
    minMutationScore: 0.8,
    minMergeConfidence: 70
  },
  changeSet: {
    files: ['src/auth/token.js'],
    diffFile: 'changes.diff'
  },
  invariantsPath: '.ts-quality/invariants.ts',
  constitutionPath: '.ts-quality/constitution.ts',
  agentsPath: '.ts-quality/agents.ts',
  approvalsPath: '.ts-quality/approvals.json',
  waiversPath: '.ts-quality/waivers.json',
  overridesPath: '.ts-quality/overrides.json',
  attestationsDir: '.ts-quality/attestations',
  trustedKeysDir: '.ts-quality/keys'
};
```

## Notes

- `changeSet.files` scopes merge confidence to changed code.
- `changeSet.diffFile` adds diff-hunk precision.
- `mutations.coveredOnly` focuses on covered lines.
- `policy` defines default merge gates before constitutional rules add domain-specific constraints.
