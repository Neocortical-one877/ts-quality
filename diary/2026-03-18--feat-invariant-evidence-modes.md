---
summary: "Session capture for landing explicit vs inferred invariant evidence modes in task #181."
read_when:
  - "When resuming after task #181"
  - "When reviewing how provenance modes were added to invariant evidence"
type: "diary"
---

# 2026-03-18 — Invariant evidence modes

## What I Did
- Claimed AK task `#181` (`ts-quality: introduce explicit vs inferred invariant evidence modes`).
- Extended `packages/evidence-model/src/index.ts` so invariant evidence sub-signals now carry additive provenance fields: `mode` and `modeReason`.
- Updated `packages/invariants/src/index.ts` to classify focused-test alignment and scenario support as `explicit`, `inferred`, or `missing`, while marking direct artifact-backed coverage/mutation/changed-function signals as explicit or missing.
- Rendered provenance modes through `packages/policy-engine/src/index.ts`, including markdown/explain output plus a concise invariant-risk mode summary in policy findings.
- Added regression coverage in `test/invariants.test.mjs` and `test/cli-integration.test.mjs`, including a new explicit `requiredTestPatterns` case.
- Refreshed README / architecture / invariant DSL docs and regenerated sample artifacts.

## What Surprised Me
- Provenance fit cleanly as an additive extension of the existing `subSignals[]` array; there was no need for a second provenance summary object.
- The most important inferred-vs-explicit distinction today is still focused-test selection, while coverage/mutation/change mapping mostly remain straightforward explicit artifact evidence when present.

## Patterns
- `mode` answers **where support came from** while `level` still answers **how strong or weak it is**.
- Once provenance lives on the same sub-signal contract, downstream report and policy surfaces stay projection-only instead of inventing parallel explanations.

## Crystallization Candidates
- Promote the “single additive root + named sub-signals + provenance modes” pattern as a durable repo learning. This session confirmed it holds up cleanly.
