---
summary: "Session capture for landing analysis-context hardening across scope, mutation baseline, governance binding, and authorization checks."
read_when:
  - "When reviewing how the analysis-context hardening slice was implemented"
  - "When tracing the rationale behind baseline receipts, execution fingerprints, and exact-scope fixes"
type: "session"
---

# 2026-03-18 — Analysis Context Hardening

## What I Did
- Added additive `analysis` and `mutationBaseline` receipts to `run.json`.
- Preallocated `runId` in `ts-quality check` and exposed `--run-id` for exact approval binding.
- Tightened diff-hunk semantics so diff hunks narrow changed scope inside already-changed files.
- Fixed coverage lookup to prefer exact LCOV matches over ambiguous suffix matches.
- Hardened mutation caching with deterministic execution fingerprints and blocked mutation trust when the baseline command is red.
- Enforced ownership rules and revalidated overrides against real `override` grants on the exact changed scope.
- Fixed package attribution so nested package files map to the deepest matching package.
- Added regression coverage for all of the above and regenerated sample artifacts.

## What Surprised Me
- `node --test` spawned from inside the repo test runner silently skips nested test execution, which can make mutation tests look greener than they are if the test command itself uses `node --test` under a test harness.
- The biggest reliability wins came from making hidden context explicit, not from changing any scoring formula.

## Patterns
- Preconditions before confidence: a score is invalid if the execution baseline is invalid.
- Exact identity before inference: exact path/run binding prevents surprisingly large classes of false evidence.
- Shared scope beats re-derived scope: micro bugs clustered where packages reconstructed changed scope independently.

## Crystallization Candidates
- → docs/learnings/ if we want a durable note on baseline validity + execution fingerprints as a general evidence-system heuristic
- → future PR-summary work so provenance and baseline state are surfaced concisely downstream
