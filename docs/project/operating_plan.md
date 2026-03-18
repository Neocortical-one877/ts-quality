---
summary: "Operating plan for ts-quality after #181; the live queue now focuses on PR-facing evidence provenance in #182."
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

Per `docs/project/tactical_goals.md`, the **active tactical goal right now is TG3 — surface invariant evidence provenance in PR-facing outputs**.
That means this operating plan should now stay focused on the current repo-local slice behind AK task `#182`.

This plan stays intentionally narrow and does **not** invent extra operating slices or new AK tasks that the authoritative queue does not yet justify.

## Canonical inputs for this wave
Do **not** replace these authorities:
- `packages/evidence-model/src/index.ts`
- `packages/invariants/src/index.ts`
- `packages/policy-engine/src/index.ts`
- `packages/ts-quality/src/*.ts`
- `README.md`
- `ARCHITECTURE.md`
- `docs/invariant-dsl.md`
- `test/golden-output.test.mjs`
- `test/cli-integration.test.mjs`
- generated sample artifacts under `examples/artifacts/`

The active wave must stay downstream of those authorities.
It may clarify or extend their review projection, but it must not invent a second source of truth.

## Ordered queue
Agent Kernel is authoritative for live task state.
This file is the reviewed narrative contract for the active operating slice under TG3.

Completed predecessor slices:
- `#179` — add invariant-scoped evidence summaries
- `#180` — split invariant evaluation into explicit evidence sub-signals
- `#181` — introduce explicit vs inferred invariant evidence modes

Active operating slice:

| AK task | Priority | Slice | Deliverable | Validation anchor |
|---|---:|---|---|---|
| `#182` | P2 | PR-facing provenance projection | surface a concise invariant evidence-mode projection in `pr-summary.md` without replacing the additive evidence-summary authority | targeted golden/CLI tests, then repo validation |

Next queue action:
- start with `./scripts/ak.sh --doctor`
- inspect repo-local candidates with `./scripts/ak.sh task ready --format json | jq '.[] | select(.repo == "/home/tryinget/ai-society/softwareco/owned/ts-quality")'`
- inspect task detail with `./scripts/ak.sh task list --format json --verbose | jq '.[] | select(.repo == "/home/tryinget/ai-society/softwareco/owned/ts-quality" and .id == 182)'`
- claim **`#182`** if it is still the top repo-local ready task
- keep `pr-summary.md` downstream of `behaviorClaims[].evidenceSummary`
- keep scope bounded to PR-facing output, docs, tests, and generated sample artifacts

## HTN for the active wave

```text
G0: Keep concise operator surfaces downstream of the same invariant evidence truth
  TG3: Surface invariant evidence provenance in PR-facing outputs (#182)
    A1: define the minimum PR-summary projection of evidence modes
    A2: carry that projection through rendering, tests, and generated artifacts
    A3: document the concise-vs-canonical boundary so run.json remains authoritative
```

## Scope guardrails
In scope:
- PR-facing summary rendering
- concise invariant evidence-mode projection derived from existing summaries
- docs and regression tests needed to explain the new projection
- generated sample artifacts when canonical surfaces change

Out of scope:
- new scoring layers
- a second evidence authority outside `behaviorClaims[].evidenceSummary`
- unrelated governance/legitimacy expansion
- repo-global keyword matching revival

## Validation baseline
Every slice in this operating wave should keep using the smallest truthful validation set first, then widen only as needed:

```bash
./scripts/ak.sh --doctor
node --test test/golden-output.test.mjs test/cli-integration.test.mjs
npm test
npm run verify
```

If docs or handoff files changed, also run:

```bash
node ~/ai-society/core/agent-scripts/scripts/docs-list.mjs --docs . --strict
```

Note: docs strictness currently fails on multiple pre-existing metadata gaps outside this wave; treat that as a repo-level cleanup debt unless the current slice is explicitly fixing those docs.
