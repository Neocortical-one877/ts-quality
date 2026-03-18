---
summary: "Session capture for landing regression hardening for check-summary provenance output via AK task #186."
read_when:
  - "When resuming after task #186"
  - "When reviewing how check-summary coverage was hardened without adding a second authority"
type: "diary"
---

# 2026-03-18 — check-summary provenance regression coverage

## What I Did
- Read `next_session_prompt.md`, re-ran the repo-local AK doctor/readiness flow, and claimed AK task `#186` (`ts-quality: add regression coverage for check-summary provenance output`).
- Audited the current concise-output coverage and confirmed the main remaining hardening gap was `test/golden-output.test.mjs`: `check-summary.txt` already had end-to-end CLI assertions, but it was not yet part of the reviewed-sample regression path.
- Extended `test/golden-output.test.mjs` so it now reads `check-summary.txt`, asserts the intended provenance framing, confirms the concise surface omits obligation lines, and compares it against the checked-in reviewed sample after normalizing score-only numeric volatility.
- Refreshed `docs/project/strategic_goals.md`, `docs/project/tactical_goals.md`, `docs/project/operating_plan.md`, `next_session_prompt.md`, and `governance/work-items.json` so repo truth shows SG1/TG3 complete and no follow-on SG2 AK slice materialized yet.

## What Surprised Me
- Exact `check-summary.txt` equality was too strict under `node --test`: merge confidence and surviving-mutant counts drifted between the reviewed sample and the in-test generated run even though the provenance framing stayed stable.
- Normalizing those score-only numeric fields preserved the real contract this task was meant to harden: the concise provenance projection and its reviewed-sample shape.

## Patterns
- When a concise artifact is already exercised end to end, the next truthful hardening step is often to pull it into the golden/sample contract rather than duplicating the same regex coverage elsewhere.
- If a reviewed sample and an in-test live run differ only in derived numeric scoring, normalize that volatility and keep the regression focused on the intended semantic contract.
- When the active queue empties, update the handoff docs to say so explicitly instead of pretending there is another ready slice.

## Candidates Deliberately Excluded
- Any new renderer or second evidence/report authority beyond `behaviorClaims[].evidenceSummary`.
- Further SG1 implementation slices after `#186`; the next meaningful work now belongs to SG2 decomposition.
