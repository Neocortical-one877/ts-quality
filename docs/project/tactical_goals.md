---
summary: "Tactical goals for ts-quality after #180 landed; the active queue now continues at #181."
read_when:
  - "When planning the next sprint/week for ts-quality"
  - "When turning the strategic direction into the next bounded implementation slice"
type: "reference"
---

# Tactical goals

## Current tactical window
`#179` established additive invariant-local evidence summaries.
`#180` then extended that same `behaviorClaims[].evidenceSummary` surface with named deterministic sub-signals.
The active strategic goal is therefore still **SG1 — make invariant evidence first-class, decomposed, and mode-aware**.

The remaining bounded tactical work in the current SG1 window is now:
- keep the new sub-signal surface additive and stable
- classify whether those signals are explicit or inferred

## Active tactical goals

### TG2 — Surface explicit versus inferred invariant evidence modes
Now that invariant support is decomposed into named sub-signals, make the provenance of those signals visible so operators can tell whether support comes from direct/configured evidence or deterministic alignment heuristics.
This is the active tactical goal now.

Why this is the current tactical move:
- it completes the second half of **SG1** without inventing a new authority
- it strengthens **SG2** by making every downstream report surface more honest about where support comes from
- it prevents inferred evidence from being overread as if it were direct proof

Backlog coverage:
- **AK `#181`** — introduce explicit vs inferred invariant evidence modes
  - Intended slice: distinguish evidence that is directly declared/configured (for example explicit test-pattern targeting) from evidence that is derived through deterministic alignment heuristics
  - Minimum acceptance shape: surface the mode in artifacts/reports/docs/tests so operators can tell when an invariant is backed by direct evidence versus scoped inference

## Recently completed tactical goals

### TG1 — Expose explicit invariant evidence sub-signals
Backlog coverage:
- **AK `#180`** — split invariant evaluation into explicit evidence sub-signals
  - Status: complete via additive `behaviorClaims[].evidenceSummary.subSignals` support in the evidence model, invariant evaluation, docs, reports, explain output, tests, and generated example artifacts

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
If `#181` is complete, the next tactical refresh should come from the next unfinished strategic goal.
The most likely follow-on is to propagate the clearer evidence contract consistently across remaining operator surfaces, not to invent a new scoring layer.
