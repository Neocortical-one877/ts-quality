---
summary: "Operating plan for ts-quality after #183; the exact-path repo-local queue has no new non-speculative SG2 slice materialized yet."
read_when:
  - "When deciding the next bounded implementation slice in ts-quality"
  - "When translating the active tactical goal into the current repo-local queue"
type: "reference"
---

# Operating plan

## Why this plan exists now
`#179` established additive invariant-scoped evidence summaries.
`#180` made that summary decomposed by adding named deterministic sub-signals.
`#181` then made those sub-signals mode-aware by labeling them as `explicit`, `inferred`, or `missing`.
`#182` carried that same truth into `pr-summary.md` as a compact PR-facing provenance projection.
`#183` carried the same concise provenance projection into `plan.txt` and `govern.txt` so governance-facing operator surfaces stay downstream of the canonical evidence summary too.

Per `docs/project/tactical_goals.md`, the bounded TG4 wave is now complete.
There is **no new exact-path repo-local operating slice materialized yet** because current repo truth does not justify a replacement task just to keep the queue populated.

## Canonical inputs for this wave
Do **not** replace these authorities:
- `packages/evidence-model/src/index.ts`
- `packages/invariants/src/index.ts`
- `packages/policy-engine/src/index.ts`
- `packages/governance/src/index.ts`
- `packages/ts-quality/src/*.ts`
- `README.md`
- `ARCHITECTURE.md`
- `docs/invariant-dsl.md`
- `test/golden-output.test.mjs`
- `test/cli-integration.test.mjs`
- generated sample artifacts under `examples/artifacts/`

The completed wave stayed downstream of those authorities.
Any future follow-on should do the same.

## Ordered queue
Agent Kernel is authoritative for live task state.
This file is the reviewed narrative contract for the current exact-path repo-local state.

Completed slices in the current provenance wave:
- `#179` — add invariant-scoped evidence summaries
- `#180` — split invariant evaluation into explicit evidence sub-signals
- `#181` — introduce explicit vs inferred invariant evidence modes
- `#182` — surface invariant evidence provenance in `pr-summary.md`
- `#183` — surface invariant evidence provenance in `plan.txt` and `govern.txt`

Active operating slice:
- none currently materialized

Why there is no new active slice yet:
- the exact-path repo-local AK queue does not yet hold another concrete SG2 follow-on
- `pr-summary.md`, `plan.txt`, and `govern.txt` now project the same evidence truth already used by `run.json`, `report.md`, and `explain.txt`
- creating another task before a fresh remaining-surface audit would be speculative backlog bloat

## Next queue action
Start from repo-local truth again:
- run `./scripts/ak.sh --doctor`
- inspect exact-path repo-local readiness with `./scripts/ak.sh task ready --format json | jq '.[] | select(.repo == "/home/tryinget/ai-society/softwareco/owned/ts-quality")'`
- if no exact-path task is ready, audit current operator surfaces and materialize exactly one next SG2 slice only when a real downstream provenance gap is confirmed
- keep concise outputs downstream of `behaviorClaims[].evidenceSummary`
- do **not** invent a second evidence authority or a speculative queue

## HTN for the completed wave

```text
G0: Keep operator surfaces downstream of the same invariant evidence truth
  TG4: Surface invariant evidence provenance in governance-facing outputs (#183)
    A1: audit plan/govern surfaces against behaviorClaims[].evidenceSummary
    A2: project concise provenance into plan.txt/govern.txt and matching CLI surfaces
    A3: refresh tests, generated artifacts, and handoff docs so the next queue step stays audit-first
```

## Scope guardrails
In scope for the completed wave:
- governance-facing text rendering
- concise invariant evidence-mode projection derived from existing summaries
- docs and regression tests needed to explain the new projection
- generated sample artifacts when canonical surfaces change

Out of scope:
- new scoring layers
- a second evidence authority outside `behaviorClaims[].evidenceSummary`
- unrelated governance/legitimacy expansion
- repo-global keyword matching revival
- speculative post-`#183` task creation without present-tense repo evidence

## Validation baseline
The completed wave was validated with the smallest truthful set first, then widened:

```bash
./scripts/ak.sh --doctor
node --test test/policy-engine.test.mjs test/golden-output.test.mjs test/cli-integration.test.mjs
npm run sample-artifacts
npm test
npm run verify
```

If docs or handoff files change again, also run:

```bash
node ~/ai-society/core/agent-scripts/scripts/docs-list.mjs --docs . --strict
```
