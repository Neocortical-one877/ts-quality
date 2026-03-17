# CI integration

Typical CI steps:

```bash
npm run build --silent
npm run typecheck --silent
npm run lint --silent
node --test --experimental-test-coverage --test-reporter=lcov --test-reporter-destination=coverage/lcov.info
node dist/packages/ts-quality/src/cli.js check --root fixtures/governed-app
```

Notes:

- `ts-quality check` is strongest when `coverage/lcov.info` exists before the run.
- Mutation testing uses `mutations.testCommand`; keep that command deterministic and repo-local.
- Invariant evidence is focused to aligned test files, so use explicit names/imports or `requiredTestPatterns`.

Then, if needed:

```bash
node dist/packages/ts-quality/src/cli.js attest sign --root . --issuer ci.verify --key-id ci.verify --private-key .ts-quality/keys/ci.verify.pem --subject .ts-quality/runs/<run-id>/verdict.json --claims ci.tests.passed --out .ts-quality/attestations/ci.tests.passed.json
node dist/packages/ts-quality/src/cli.js authorize --root . --agent release-bot
```
