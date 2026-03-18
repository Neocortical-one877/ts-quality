---
summary: "Session capture for landing additive invariant evidence summaries in task #179."
read_when:
  - "When resuming the invariant-evidence wave after #179"
  - "When reviewing how evidenceSummary was introduced"
type: "explanation"
---

# 2026-03-17 — Invariant evidence summaries

## What I Did
- Claimed AK task #179 (`ts-quality: add invariant-scoped evidence summaries`).
- Added additive `evidenceSummary` support to invariant behavior claims in `packages/evidence-model/src/index.ts`.
- Extended invariant evaluation to compute impacted files, focused tests, changed-function summaries, coverage pressure, mutation counts, and per-scenario support.
- Rendered the new summary data in `report.md` and `explain.txt` output.
- Added regression coverage in `test/invariants.test.mjs` and `test/cli-integration.test.mjs`.
- Updated README / architecture / invariant DSL docs and regenerated example artifacts via `npm run verify`.

## What Surprised Me
- The existing artifact/report surface already had the right extension point: attaching the summary to each behavior claim kept the change additive without needing a separate top-level invariant artifact array.
- Sample artifact regeneration also updated attestation/authorization example outputs because verification replays the full sample flow.

## Patterns
- The clearest explainability win came from structured invariant-local counts and file lists, not from adding more free-form prose.
- Keeping the summary alongside the behavior claim preserves compatibility while making later signal-splitting work easier.

## Crystallization Candidates
- → docs/learnings/ if future tasks (#180 / #181) confirm that invariant-local structured summaries are the right base for sub-signals and evidence modes.
