---
summary: "Tactical goals for ts-quality after #179 landed; the active queue continues at #180 and #181."
read_when:
  - "When planning the next sprint/week for ts-quality"
  - "When turning the strategic direction into the next bounded implementation slice"
type: "reference"
---

# Tactical goals

## Current tactical window
`#179` proved that invariant-local evidence can be surfaced additively through `behaviorClaims[].evidenceSummary`.
That was the right first step, but it is not yet the full contract the vision needs.
The active strategic goal is therefore still **SG1 — make invariant evidence first-class, decomposed, and mode-aware**.

The next bounded tactical work under SG1 is now split into two repo-local waves:
- first make invariant support legible as named deterministic sub-signals
- then classify whether that evidence is explicit or inferred

## Active tactical goals

### TG1 — Expose explicit invariant evidence sub-signals
Use the new summary surface from `#179` as the additive base layer, then make it clearer which evidence pressures actually drive invariant support status.
This is the active tactical goal now.

Why this is the current tactical move:
- it advances **SG1** directly by decomposing invariant support into named deterministic parts
- it supports **SG2** because the same clearer contract can flow through `run.json`, reports, and explain output
- it keeps the change additive-first instead of replacing the current behavior-claim surface

Backlog coverage:
- **AK `#180`** — split invariant evaluation into explicit evidence sub-signals
  - Intended slice: expose the main invariant support components as named deterministic sub-signals so reviewers can tell which evidence pressure actually drove `supported`, `unsupported`, or `at-risk`
  - Minimum acceptance shape: keep `behaviorClaims[].evidenceSummary` as the additive root while making scenario support, focused-test alignment, coverage pressure, mutation pressure, and changed-function pressure easier to inspect as separate facts

### TG2 — Surface explicit versus inferred invariant evidence modes
Once the sub-signal surface exists, make the provenance of those signals visible so operators can tell whether support comes from direct/configured evidence or deterministic alignment heuristics.
This is the next tactical goal under the same strategic wave.

Why this is the next tactical move:
- it completes the second half of **SG1** without inventing a new authority
- it strengthens **SG2** by making every downstream report surface more honest about where support comes from
- it prevents inferred evidence from being overread as if it were direct proof

Backlog coverage:
- **AK `#181`** — introduce explicit vs inferred invariant evidence modes
  - Intended slice: distinguish evidence that is directly declared/configured (for example explicit test-pattern targeting) from evidence that is derived through deterministic alignment heuristics
  - Minimum acceptance shape: surface the mode in artifacts/reports/docs/tests so operators can tell when an invariant is backed by direct evidence versus scoped inference

## Recently completed tactical goals

### TG0 — Add invariant-scoped evidence summaries
Backlog coverage:
- **AK `#179`** — add invariant-scoped evidence summaries
  - Status: complete via additive `behaviorClaims[].evidenceSummary` support in the evidence model, invariant evaluation, docs, reports, explain output, tests, and generated example artifacts

## Tactical guardrails
- keep `behaviorClaims[].evidenceSummary` as the current additive authority unless the repo explicitly adopts a breaking redesign
- do not reintroduce repo-global invariant keyword matching as fake support
- do not let explicit/inferred mode wording inflate trust beyond what the evidence justifies
- keep report and run-artifact changes additive-first and regression-tested
- prefer the smallest end-to-end slice that proves the contract over broad speculative redesign

## What should happen after this tactical window
If `#180` and `#181` are complete, the next tactical refresh should come from the next unfinished strategic goal.
The most likely follow-on is to propagate the clearer evidence contract consistently across remaining operator surfaces, not to invent a new scoring layer.
