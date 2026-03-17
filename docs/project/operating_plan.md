---
summary: "Operating plan for ts-quality's current invariant-evidence wave after #179; the live queue continues at #180 and #181."
read_when:
  - "When deciding the next bounded implementation slice in ts-quality"
  - "When translating the active tactical goal into the current repo-local queue"
type: "reference"
---

# Operating plan

## Why this plan exists now
`#179` established additive invariant-scoped evidence summaries.
That completed the first proof point for the current invariant-evidence direction, but it did not yet make invariant support fully decomposed or mode-aware.

Per `docs/project/tactical_goals.md`, the **active tactical goal right now is TG1 — expose explicit invariant evidence sub-signals**.
That means this operating plan should stay focused on the current repo-local slice behind AK task `#180`.
The next tactical goal (`#181` explicit vs inferred evidence modes) is real, but it is **next**, not part of the active operating plan yet.

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
This file is the reviewed narrative contract for the active operating slices under TG1.

Completed predecessor slice:
- `#179` — add invariant-scoped evidence summaries

Active operating slice:

| AK task | Priority | Slice | Deliverable | Validation anchor |
|---|---:|---|---|---|
| `#180` | P2 | Explicit evidence sub-signals | expose deterministic invariant evidence components as named sub-signals under the additive evidence-summary/report surface | targeted invariant + CLI tests, then repo validation |

Queued next tactical follow-on (not part of the active operating plan yet):
- `#181` — explicit vs inferred invariant evidence modes

Next queue action:
- start with `./scripts/ak.sh --doctor`
- inspect repo-local candidates with `./scripts/ak.sh task ready --format json | jq '.[] | select(.repo == "/home/tryinget/ai-society/softwareco/owned/ts-quality")'`
- inspect task detail with `./scripts/ak.sh task list --format json --verbose | jq '.[] | select(.repo == "/home/tryinget/ai-society/softwareco/owned/ts-quality" and .id == 180)'`
- claim **`#180`** if it is still the top repo-local ready task
- keep `behaviorClaims[].evidenceSummary` as the additive authority while extending it
- keep scope bounded to invariant evaluation, evidence model, report/explain/run artifacts, docs, tests, and generated sample artifacts

## HTN for the active wave

```text
G0: Make invariant evidence more legible without replacing the current artifact authority
  TG1: Explicit evidence sub-signals (#180)
    A1: define the minimum named sub-signals that explain invariant support truthfully
    A2: carry those sub-signals through evidence model, invariant evaluation, and rendered outputs
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
