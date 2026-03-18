---
summary: "Tactical handoff after SG1 completion; SG2 is active but no repo-local SG2 tactical slice is materialized yet."
read_when:
  - "When planning the next sprint/week for ts-quality"
  - "When turning the current strategic state into bounded delivery waves"
type: "reference"
---

# Tactical goals

## Current decomposition state
SG1 is materially complete as of 2026-03-18.
SG2 is now the active strategic goal, but no repo-local SG2 tactical wave has been materialized into AK yet.

## SG1 tactical record

| Rank | Tactical goal | Importance | Urgency | Difficulty | Status |
|---|---|---:|---:|---:|---|
| 1 | **TG1 — Finish concise run-status outputs so they still show risky-invariant context** | 5 | 5 | 2 | **completed 2026-03-18** |
| 2 | **TG2 — Align generated sample artifacts and README with the concise output contract** | 4 | 4 | 2 | **completed 2026-03-18** |
| 3 | **TG3 — Lock concise output parity with targeted regression coverage** | 4 | 4 | 3 | **completed 2026-03-18** |
| 4 | **TG4 — Re-audit remaining decision-side outputs after run-status parity lands** | 3 | 3 | 3 | **not promoted; folded into SG2 intake** |

## TG3 — Lock concise output parity with targeted regression coverage

### Why TG3 is now complete
The concise operator surfaces are no longer relying only on renderer truth and reviewed-sample convention.
They now have targeted regression coverage for the remaining `check-summary.txt` projection risk.

### Completion signals now true
- targeted tests fail if concise provenance disappears from `check-summary.txt`
- golden-output coverage now includes the concise run-status surface the repo treats as contract-bearing with exact deterministic parity restored under `node --test`
- the checked-in reviewed `examples/artifacts/governed-app/check-summary.txt` sample is now part of the regression-hardening path
- mutation subprocesses now ignore inherited nested test-runner recursion context so cacheable evidence stays stable across launcher contexts
- reviewed sample-artifact generation is now idempotent, and repo verification fails if consecutive sample generation passes drift

## TG4 — Re-audit remaining decision-side outputs after run-status parity lands

### Why TG4 was not promoted as the next active tactical goal
After `#186`, the remaining meaningful work sits one layer later than concise run-status parity.
That makes it a better fit for **SG2** than for extending SG1 with another mostly-complete operator-surface wave.

### What moved into SG2 intake
- authorization / attestation review text
- amendment-facing summaries
- any remaining governance / legitimacy decision outputs that still compress evidence provenance or exact run targeting too far

## Next tactical handoff
- **Active strategic goal:** SG2
- **Active tactical goal:** none materialized yet
- **Next required action:** audit SG2 candidate decision surfaces and materialize the first repo-local AK slice before coding

## Tactical guardrails
- keep `behaviorClaims[].evidenceSummary` as the additive root
- do not let concise or decision-side outputs outrank `run.json`
- prefer small end-to-end slices over broad redesign
- when no tactical slice is materialized yet, say so explicitly instead of pretending there is active queue truth
