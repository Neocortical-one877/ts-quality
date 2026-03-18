---
summary: "Tactical goals for ts-quality after #181 landed; the active queue now refreshes into SG2 at #182."
read_when:
  - "When planning the next sprint/week for ts-quality"
  - "When turning the strategic direction into the next bounded implementation slice"
type: "reference"
---

# Tactical goals

## Current tactical window
`#179` established additive invariant-local evidence summaries.
`#180` extended that same `behaviorClaims[].evidenceSummary` surface with named deterministic sub-signals.
`#181` then labeled those sub-signals as `explicit`, `inferred`, or `missing` without introducing a second authority.

That means the SG1 wave is now complete enough to stop treating it as the active tactical window.
The next tactical refresh now comes from **SG2 — keep every operator surface downstream of the same evidence truth**.

## Active tactical goals

### TG3 — Surface invariant evidence provenance in PR-facing outputs
The next bounded move is to carry the clearer invariant evidence contract into the fastest operator-facing review surface: `pr-summary.md`.
That summary should stay concise, but it should stop hiding whether the risky invariant evidence is explicit, inferred, or missing.

Why this is the current tactical move:
- it is the smallest honest follow-on from `#181`
- it advances **SG2** without inventing a second report authority
- it improves review ergonomics while keeping `run.json` / `behaviorClaims[].evidenceSummary` canonical

Backlog coverage:
- **AK `#182`** — surface invariant evidence provenance in `pr-summary.md`
  - Intended slice: add a compact, review-friendly projection of invariant evidence modes to `pr-summary.md`
  - Minimum acceptance shape: one PR-facing summary can tell a reviewer whether the riskiest invariant support is explicit, inferred, or missing without reverse-engineering the full report

## Recently completed tactical goals

### TG2 — Surface explicit versus inferred invariant evidence modes
Backlog coverage:
- **AK `#181`** — introduce explicit vs inferred invariant evidence modes
  - Status: complete via additive `behaviorClaims[].evidenceSummary.subSignals[].mode` / `modeReason` support in the evidence model, invariant evaluation, report/explain output, invariant-risk findings, docs, tests, and generated sample artifacts

### TG1 — Expose explicit invariant evidence sub-signals
Backlog coverage:
- **AK `#180`** — split invariant evaluation into explicit evidence sub-signals
  - Status: complete via additive `behaviorClaims[].evidenceSummary.subSignals` support in the evidence model, invariant evaluation, docs, reports, explain output, tests, and generated example artifacts

### TG0 — Add invariant-scoped evidence summaries
Backlog coverage:
- **AK `#179`** — add invariant-scoped evidence summaries
  - Status: complete via additive `behaviorClaims[].evidenceSummary` support in the evidence model, invariant evaluation, docs, reports, explain output, tests, and generated example artifacts

## Tactical guardrails
- keep `behaviorClaims[].evidenceSummary` as the additive authority unless the repo explicitly adopts a breaking redesign
- do not let `pr-summary.md` or other concise operator surfaces outrank `run.json`
- do not reintroduce repo-global keyword matching as fake support
- do not let explicit/inferred wording inflate trust beyond what the evidence justifies
- keep report and run-artifact changes additive-first and regression-tested
- prefer the smallest end-to-end slice that proves the contract over broad speculative redesign

## What should happen after this tactical window
If `#182` is complete, continue decomposing **SG2** across the next remaining operator surfaces instead of inventing new scores or semantic theater.
