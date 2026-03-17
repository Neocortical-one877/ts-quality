---
summary: "Operating plan for ts-quality's current invariant-evidence wave after #180; the live queue now continues at #181."
read_when:
  - "When deciding the next bounded implementation slice in ts-quality"
  - "When translating the active tactical goal into the current repo-local queue"
type: "reference"
---

# Operating plan

## Why this plan exists now
`#179` established additive invariant-scoped evidence summaries.
`#180` then made that summary decomposed by adding named deterministic sub-signals.

Per `docs/project/tactical_goals.md`, the **active tactical goal right now is TG2 — surface explicit versus inferred invariant evidence modes**.
That means this operating plan should now stay focused on the current repo-local slice behind AK task `#181`.

This plan stays intentionally narrow and does **not** invent extra operating slices or new AK tasks that the authoritative queue does not yet justify.

## Canonical inputs for this wave
Do **not** replace these authorities:
- `packages/evidence-model/src/index.ts`
- `packages/invariants/src/index.ts`
- `packages/policy-engine/src/index.ts`
- `packages/ts-quality/src/*.ts`
- `README.md`
- `ARCHITECTURE.md`
- `docs/config-reference.md`
- `docs/invariant-dsl.md`
- `test/invariants.test.mjs`
- `test/cli-integration.test.mjs`
- generated sample artifacts under `examples/artifacts/`

The active wave must stay downstream of those authorities.
It may clarify or extend their evidence contract, but it must not invent a second source of truth.

## Ordered queue
Agent Kernel is authoritative for live task state.
This file is the reviewed narrative contract for the active operating slice under TG2.

Completed predecessor slices:
- `#179` — add invariant-scoped evidence summaries
- `#180` — split invariant evaluation into explicit evidence sub-signals

Active operating slice:

| AK task | Priority | Slice | Deliverable | Validation anchor |
|---|---:|---|---|---|
| `#181` | P2 | Explicit vs inferred evidence modes | label the provenance of invariant evidence sub-signals without replacing the additive evidence-summary/report surface | targeted invariant + CLI tests, then repo validation |

Next queue action:
- start with `./scripts/ak.sh --doctor`
- inspect repo-local candidates with `./scripts/ak.sh task ready --format json | jq '.[] | select(.repo == "/home/tryinget/ai-society/softwareco/owned/ts-quality")'`
- inspect task detail with `./scripts/ak.sh task list --format json --verbose | jq '.[] | select(.repo == "/home/tryinget/ai-society/softwareco/owned/ts-quality" and .id == 181)'`
- claim **`#181`** if it is still the top repo-local ready task
- keep `behaviorClaims[].evidenceSummary` as the additive authority while extending it
- keep scope bounded to invariant evaluation, evidence model, report/explain/run artifacts, docs, tests, and generated sample artifacts

## HTN for the active wave

```text
G0: Make invariant evidence mode-aware without replacing the current artifact authority
  TG2: Explicit vs inferred evidence modes (#181)
    A1: define the minimum provenance contract for invariant evidence sub-signals
    A2: carry those modes through evidence model, invariant evaluation, and rendered outputs
    A3: pin the additive contract with targeted docs/tests/example-artifact updates
```

## Scope guardrails
In scope:
- invariant evidence-model contract changes
- invariant evaluation logic
- report / explain / run artifact clarity
- docs and regression tests needed to explain the new contract
- generated example artifacts when the canonical surfaces change

Out of scope:
- repo-global keyword matching revival
- semantic-theater scoring changes
- unrelated governance/legitimacy feature expansion
- new workflow/control-plane product surfaces outside this repo's native evidence model

## Validation baseline
Every slice in this operating wave should keep using the smallest truthful validation set first, then widen only as needed:

```bash
./scripts/ak.sh --doctor
node --test test/invariants.test.mjs test/cli-integration.test.mjs
npm test
npm run verify
```

If docs or handoff files changed, also run:

```bash
node ~/ai-society/core/agent-scripts/scripts/docs-list.mjs --docs . --strict
```

Note: docs strictness currently fails on multiple pre-existing metadata gaps outside this wave; treat that as a repo-level cleanup debt unless the current slice is explicitly fixing those docs.
