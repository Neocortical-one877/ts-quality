---
summary: "Session capture for restoring hermetic mutation execution and exact deterministic check-summary parity via AK task #188."
read_when:
  - "When resuming after task #188"
  - "When reviewing why mutation subprocesses now strip nested test-runner recursion context"
type: "diary"
---

# 2026-03-18 — hermetic mutation execution

## What I Did
- Materialized and claimed AK task `#188` (`ts-quality: hermeticize mutation subprocess context and fingerprint runner env`) after reproducing that `ts-quality check` returned different mutation outcomes when launched from inside `node --test`.
- Reproduced the failure in two forms: direct CLI on `fixtures/governed-app` produced `mergeConfidence=6` with `3` surviving mutants, while the same run launched from a `node --test` wrapper produced `mergeConfidence=0` with `4` surviving mutants and recursive `node:test` warnings.
- Updated `packages/ts-mutate/src/index.ts` so mutation subprocesses now strip inherited `NODE_TEST_CONTEXT` before launching test commands, and so execution fingerprints include a cache-version bump plus the effective execution environment.
- Restored `test/golden-output.test.mjs` to exact `check-summary.txt` equality against the reviewed sample, because the underlying determinism defect is now fixed instead of normalized away.
- Added a focused regression in `test/ts-mutate.test.mjs` that simulates inherited `NODE_TEST_CONTEXT` and proves mutation outcomes + execution fingerprints stay stable.
- Updated runtime docs (`README.md`, `ARCHITECTURE.md`, `docs/config-reference.md`) and queue/handoff artifacts (`docs/project/*`, `next_session_prompt.md`, `governance/work-items.json`).

## What Surprised Me
- The critical failure mode was not just wrong scoring during a nested run; the old execution fingerprint let those poisoned mutation results persist through the manifest cache even after rerunning in a clean direct CLI context.
- The fastest proof of the bug was not a complicated integration harness; simply setting `process.env.NODE_TEST_CONTEXT = 'child-v8'` before `runMutations()` reproduced the corruption directly.

## Patterns
- In a deterministic evidence system, inherited runner context is part of the runtime contract whether you acknowledge it or not.
- Cache keys are semantic boundaries. If they omit execution context or version shifts, bad results become sticky.
- If a golden test needs normalization on a contract field that is supposed to be deterministic, investigate the producer before weakening the oracle.

## Candidates Deliberately Excluded
- Broader SG2 decomposition work; this session was corrective maintenance so the repo could trust its current evidence substrate again.
- A broad child-process environment scrub beyond the currently proven recursive-runner contaminant; the fingerprint now captures selected effective env inputs so later expansions stay additive.
