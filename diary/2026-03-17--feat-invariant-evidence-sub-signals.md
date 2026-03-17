---
summary: "Session capture for landing additive invariant evidence sub-signals in task #180."
read_when:
  - "When resuming the invariant-evidence wave after #180"
  - "When reviewing how sub-signals were introduced"
type: "diary"
---

# 2026-03-17 — Invariant evidence sub-signals

## What I Did
- Claimed AK task #180 (`ts-quality: split invariant evaluation into explicit evidence sub-signals`).
- Extended `packages/evidence-model/src/index.ts` so `behaviorClaims[].evidenceSummary` now carries additive `subSignals[]` entries for `focused-test-alignment`, `scenario-support`, `coverage-pressure`, `mutation-pressure`, and `changed-function-pressure`.
- Updated `packages/invariants/src/index.ts` to compute those named deterministic sub-signals from the existing focused-test, scenario, coverage, mutation, and changed-function evidence.
- Rendered the sub-signals in `report.md` and `explain.txt` via `packages/policy-engine/src/index.ts`.
- Added regression coverage in `test/invariants.test.mjs` and `test/cli-integration.test.mjs`.
- Updated README / architecture / invariant DSL docs and refreshed the project handoff docs for the next queue step.

## What Surprised Me
- The cleanest additive contract was not a new top-level invariant report block; it was attaching a deterministic `subSignals[]` array to the existing `evidenceSummary` root and letting downstream rendering stay derived from that one authority.
- Keeping the old compact rollups while adding the named sub-signals made the rendered outputs easier to inspect without forcing a report redesign.

## Patterns
- A small fixed set of named evidence sub-signals is enough to explain most invariant outcomes: focused-test alignment, scenario support, coverage pressure, mutation pressure, and changed-function pressure.
- The moment those sub-signals exist in the artifact contract, report and explain output become a projection problem rather than a second reasoning system.

## Crystallization Candidates
- Consider promoting the “single additive root + named sub-signals” pattern into `docs/learnings/` if task #181 confirms that provenance modes also fit cleanly under the same surface.
