---
summary: "Session capture for landing concise invariant evidence provenance in plan.txt and govern.txt via AK task #183."
read_when:
  - "When resuming after task #183"
  - "When reviewing how governance-facing outputs stayed downstream of behaviorClaims[].evidenceSummary"
type: "diary"
---

# 2026-03-18 — plan/govern evidence provenance

## What I Did
- Re-ran repo-local AK doctor/readiness with the exact repo-path filter and confirmed there was no ready task after `#182`.
- Audited current operator surfaces against `behaviorClaims[].evidenceSummary` and found one concrete remaining SG2 gap: `plan.txt` / `govern.txt` still summarized governance pressure without surfacing the related invariant evidence provenance.
- Created and claimed AK task `#183` (`ts-quality: surface invariant evidence provenance in plan/govern outputs`).
- Refactored concise provenance rendering so `pr-summary.md`, `plan.txt`, `govern.txt`, and the `plan` / `govern` CLI surfaces all project from the same additive invariant evidence summary.
- Added regression coverage in `test/cli-integration.test.mjs` and `test/golden-output.test.mjs`, refreshed README wording, regenerated sample artifacts, and updated direction/handoff docs to reflect that `#183` is complete and that no next SG2 task is being invented yet.

## What Surprised Me
- The truthful missing slice was not another scoring/report redesign; it was the governance-facing text surfaces still lacking the same concise provenance already present in `pr-summary.md`.
- Sharing one concise provenance projection helper was the smallest way to keep multiple outputs aligned without turning each renderer into its own evidence interpreter.

## Patterns
- When SG2 is active, audit operator surfaces one by one and only materialize the next task if a live surface still hides or diverges from canonical evidence.
- Concise governance-facing outputs can stay readable by projecting the first at-risk invariant plus its provenance counts and notable sub-signals instead of copying the whole report.
- If multiple renderers need the same provenance framing, move that framing into a shared projection helper so drift gets harder to reintroduce.

## Candidates Deliberately Excluded
- A new SG2 task for legitimacy/authorization outputs: deferred because this session did not find a present-tense divergence there.
- Any queue-padding follow-on after `#183`: excluded because exact-path repo-local AK truth still has no concrete next slice.
- Broader governance-plan redesign: excluded because the truthful gap was provenance visibility, not plan semantics.
