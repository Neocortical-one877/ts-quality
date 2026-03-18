---
summary: "Generated ts-quality report artifact with findings, invariants, and governance outcomes."
read_when:
  - "When reviewing the full markdown report emitted by ts-quality"
  - "When checking the generated report artifact contract"
type: "reference"
---

# ts-quality report

- Run: `2026-03-18T01-00-02-990Z`
- Merge confidence: **6/100**
- Outcome: **fail**
- Changed files: src/auth/token.js

## Findings
- [error] Mutation score 0.25 is below budget 0.75
  - Killed 1, survived 3
- [error] Surviving mutant in src/auth/token.js
  - TAP version 13
# Subtest: active token before expiry allows access
ok 1 - active token before expiry allows access
  ---
  duration_ms: 0.666934
  type: 'test'
  ...
# Subtest: missing token denies access
ok 2 - missing token denies access
  ---
  duration_ms: 0.106878
  type: 't
- [error] Surviving mutant in src/auth/token.js
  - TAP version 13
# Subtest: active token before expiry allows access
ok 1 - active token before expiry allows access
  ---
  duration_ms: 0.652729
  type: 'test'
  ...
# Subtest: missing token denies access
ok 2 - missing token denies access
  ---
  duration_ms: 0.117485
  type: 't
- [error] Surviving mutant in src/auth/token.js
  - TAP version 13
# Subtest: active token before expiry allows access
ok 1 - active token before expiry allows access
  ---
  duration_ms: 0.642612
  type: 'test'
  ...
# Subtest: missing token denies access
ok 2 - missing token denies access
  ---
  duration_ms: 0.111725
  type: 't
- [error] Invariant auth.refresh.validity is at-risk
  - 3 surviving mutants in impacted invariant scope
  - Missing deterministic test evidence for scenario 'exact expiry boundary denies access'
  - Invariant evidence modes: focused-test-alignment=inferred; scenario-support=missing; coverage-pressure=explicit; mutation-pressure=explicit; changed-function-pressure=explicit
  - Add or tighten a focused test for scenario 'exact expiry boundary denies access' to preserve invariant 'Refresh token validity'.
- [error] Auth code requires stronger evidence because it decides authorization.
  - Mutation score 0.25 below budget 0.75
- [error] Auth code requires stronger evidence because it decides authorization.
  - Merge confidence 46 below minimum 65

## Invariants
- auth.refresh.validity: at-risk
  - impacted files: src/auth/token.js
  - focused tests: test/token.test.js
  - changed functions: function:canUseRefreshToken (src/auth/token.js, coverage 100%, CRAP 3); function:isRefreshExpired (src/auth/token.js, coverage 100%, CRAP 1); function:issueAccessDecision (src/auth/token.js, coverage 100%, CRAP 3)
  - changed functions under 80% coverage: 0; max changed CRAP: 3
  - mutation scope: 4 site(s), 1 killed, 3 survived
  - scenario results: expired-boundary=missing failure-path evidence
  - sub-signals:
    - focused-test-alignment [clear; mode=inferred]: 1 focused test file aligned to invariant scope
      - mode reason: matched focused tests via deterministic path/name/selector hints
      - impacted files: src/auth/token.js
      - focused tests: test/token.test.js
    - scenario-support [missing; mode=missing]: 0/1 scenario(s) have deterministic support
      - mode reason: heuristically aligned focused tests were evaluated, but no scenario has full deterministic support
      - expired-boundary: missing failure-path evidence
    - coverage-pressure [clear; mode=explicit]: All changed functions in invariant scope are at or above 80% coverage
      - mode reason: coverage evidence came from LCOV for changed functions in invariant scope
      - changed functions under 80% coverage: 0
    - mutation-pressure [warning; mode=explicit]: 3 surviving mutants across 4 mutation sites
      - mode reason: mutation evidence came from selected mutation sites in invariant scope
      - mutation sites in scope: 4
      - killed mutants in scope: 1
      - surviving mutants in scope: 3
    - changed-function-pressure [info; mode=explicit]: 3 changed functions in invariant scope; max changed CRAP 3
      - mode reason: changed-function evidence came from CRAP/changed-function mapping in invariant scope
      - function:canUseRefreshToken (src/auth/token.js, coverage 100%, CRAP 3)
      - function:isRefreshExpired (src/auth/token.js, coverage 100%, CRAP 1)
      - function:issueAccessDecision (src/auth/token.js, coverage 100%, CRAP 3)
  - obligation: Add or tighten a focused test for scenario 'exact expiry boundary denies access' to preserve invariant 'Refresh token validity'.

## Governance
- [error] auth-risk-budget: Auth code requires stronger evidence because it decides authorization.
- [error] auth-risk-budget: Auth code requires stronger evidence because it decides authorization.
