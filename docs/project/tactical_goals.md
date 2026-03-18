---
summary: "Tactical goals for ts-quality after #183 landed; SG2 stays active but no new tactical slice is materialized until a real remaining operator-surface gap is confirmed."
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
`#182` carried that same evidence truth into `pr-summary.md`, so the fastest PR-facing surface now tells a reviewer whether the riskiest invariant support is explicit, inferred, or missing.
`#183` carried the same concise provenance projection into `plan.txt` and `govern.txt`, so governance-facing operator surfaces no longer hide the invariant evidence basis behind plan/finding summaries alone.

That closes the current bounded tactical wave under **SG2 — keep every operator surface downstream of the same evidence truth**.
SG2 remains the active strategic goal, but the repo does **not** have a truthful next SG2 tactical slice materialized yet.

## Active tactical goals
There is no newly materialized tactical goal right now.

Why that is truthful:
- TG4 closed the only exact-path repo-local AK slice currently justified by the fresh operator-surface audit
- `run.json`, `report.md`, `explain.txt`, `pr-summary.md`, `plan.txt`, and `govern.txt` now project the same additive invariant evidence authority
- creating another SG2 task before a fresh audit would be speculative backlog bloat

The next tactical refresh should happen only when one of these is true:
- exact-path repo-local AK truth gains a concrete follow-on slice, or
- a fresh audit shows another current operator surface still hides or diverges from `behaviorClaims[].evidenceSummary`

## Recently completed tactical goals

### TG4 — Surface invariant evidence provenance in governance-facing outputs
Backlog coverage:
- **AK `#183`** — surface invariant evidence provenance in plan/govern outputs
  - Status: complete via concise provenance projections in `plan.txt`, `govern.txt`, and the `plan` / `govern` CLI surfaces rendered directly from `behaviorClaims[].evidenceSummary.subSignals[]`, with tests, README text, and generated sample artifacts refreshed to match

### TG3 — Surface invariant evidence provenance in PR-facing outputs
Backlog coverage:
- **AK `#182`** — surface invariant evidence provenance in `pr-summary.md`
  - Status: complete via a concise PR-facing projection of evidence-mode counts plus notable sub-signals rendered directly from `behaviorClaims[].evidenceSummary.subSignals[]`, with README/tests/sample artifacts refreshed to match

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
- do not let `pr-summary.md`, `plan.txt`, `govern.txt`, or other concise operator surfaces outrank `run.json`
- do not reintroduce repo-global keyword matching as fake support
- do not let explicit/inferred wording inflate trust beyond what the evidence justifies
- keep report and run-artifact changes additive-first and regression-tested
- prefer the smallest end-to-end slice that proves the contract over broad speculative redesign

## What should happen after this tactical window
Do **not** open a replacement SG2 tactical wave just to keep the queue full.
Re-run exact-path AK truth plus an operator-surface audit, and materialize the next tactical goal only if current repo reality shows a remaining downstream provenance gap.
