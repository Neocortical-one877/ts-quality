---
summary: "Session capture for landing concise invariant evidence provenance in pr-summary.md via AK task #182."
read_when:
  - "When resuming after task #182"
  - "When reviewing how PR-facing provenance stayed downstream of behaviorClaims[].evidenceSummary"
type: "diary"
---

# 2026-03-18 — PR summary evidence provenance

## What I Did
- Claimed AK task `#182` (`ts-quality: surface invariant evidence provenance in pr-summary.md`).
- Extended `packages/policy-engine/src/index.ts` so `renderPrSummary()` now projects a compact provenance view for the first risky invariant: mode counts plus the most review-relevant sub-signals.
- Kept the PR-facing projection downstream of the existing additive `behaviorClaims[].evidenceSummary.subSignals[]` contract instead of introducing a second summary authority.
- Added regression coverage in `test/policy-engine.test.mjs`, `test/golden-output.test.mjs`, and `test/cli-integration.test.mjs`.
- Updated `README.md`, regenerated sample artifacts, and refreshed the direction/handoff docs to reflect that `#182` is complete and that no next SG2 task is being invented yet.

## What Surprised Me
- The most concise honest PR projection was not a new score; it was a small projection of already-existing sub-signals.
- Limiting the PR surface to non-explicit or non-clear signals preserved readability while still showing whether support was explicit, inferred, or missing.

## Patterns
- Concise operator surfaces should project the additive evidence root, then foreground only the signals that explain review risk.
- When an exact-path repo-local AK queue goes empty after a bounded slice, the truthful next step is a fresh audit, not automatic backlog expansion.

## Crystallization Candidates
- If more concise review surfaces are added later, reuse the same pattern: counts + notable sub-signals from the canonical evidence summary.
