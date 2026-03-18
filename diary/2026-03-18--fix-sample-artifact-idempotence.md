---
summary: "Session capture for stabilizing sample-artifact generation and verify drift detection via AK task #189."
read_when:
  - "When resuming after task #189"
  - "When reviewing how reviewed sample artifacts became idempotent without requiring a clean git tree"
type: "diary"
---

# 2026-03-18 — sample artifact idempotence

## What I Did
- Materialized and claimed AK task `#189` (`ts-quality: stabilize sample artifact generation and gate drift in verify`) after confirming that reviewed sample artifacts still churned across runs even after mutation scoring itself was hermetic.
- Reworked `scripts/generate-samples.mjs` so the governed-app sample flow now uses a fixed sample run id, fixed sample timestamps where needed, a fixed temp-root path, and normalized volatile mutation timing text before copying the reviewed bundle into `examples/artifacts/governed-app/`.
- Replaced CLI attestation signing in the sample generator with programmatic signing using a fixed `issuedAt`, so the checked-in attestation sample stays stable instead of re-signing to a new timestamp every run.
- Updated `scripts/verify.mjs` so verification now enforces sample-artifact idempotence by running `sample-artifacts` twice and failing if the second pass changes the reviewed bundle.
- Bound the remaining non-code surfaced findings into AK with first-class deferrals: `#190` for AK-to-handoff projection automation and `#191` for the verification-artifact contract.

## What Surprised Me
- The last source of sample churn was not the main deterministic verdict itself; it was the interaction of truncated failing-test output, variable timing text, and time-based signing metadata inside the reviewed sample bundle.
- A direct `git diff --exit-code` gate was too strict for the normal development loop because it required a clean tree even while intentionally updating checked-in examples; the right enforcement was consecutive-pass idempotence.

## Patterns
- For reviewed sample bundles, stability usually requires both fixed IDs/timestamps and normalization of incidental runtime noise.
- If a drift gate blocks legitimate in-progress work, tighten the invariant you actually care about instead of weakening the gate entirely.
- Deferrals should only survive a corrective pass if they are explicitly bound into AK with a real trigger and review date.

## Candidates Deliberately Excluded
- Automating AK-to-doc projection sync in this same pass; that needs an explicit authority-boundary decision first (`#190`, deferred).
- Changing whether `VERIFICATION.md` / `verification/verification.log` remain checked-in reference artifacts; that also needs a repo-level contract decision first (`#191`, deferred).
