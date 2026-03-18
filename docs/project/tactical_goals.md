---
summary: "Tactical goals for the active strategic goal (SG1) in ts-quality, ranked by Eisenhower-3D and grounded in current concise output gaps."
read_when:
  - "When planning the next sprint/week for ts-quality"
  - "When turning the active strategic goal into bounded delivery waves"
type: "reference"
---

# Tactical goals

## Active strategic goal being decomposed
This file decomposes **SG1 — close the remaining concise operator-surface gaps under `behaviorClaims[].evidenceSummary`**.
It does **not** yet decompose SG2.

## Tactical goals for SG1 (Eisenhower-3D)

| Rank | Tactical goal | Importance | Urgency | Difficulty | Status |
|---|---|---:|---:|---:|---|
| 1 | **TG1 — Finish concise run-status outputs so they still show risky-invariant context** | 5 | 5 | 2 | **active now** |
| 2 | **TG2 — Align generated sample artifacts and README with the concise output contract** | 4 | 4 | 2 | next under SG1 |
| 3 | **TG3 — Lock concise output parity with targeted regression coverage** | 4 | 4 | 3 | next under SG1 |
| 4 | **TG4 — Re-audit remaining decision-side outputs after run-status parity lands** | 3 | 3 | 3 | later under SG1 |

## TG1 — Finish concise run-status outputs so they still show risky-invariant context

### Why TG1 is active now
One currently shipped concise run-status surface still compresses the evidence basis too far:
- `trend` reports deltas, but not whether the latest run's at-risk invariant evidence is explicit, inferred, or missing

`check-summary.txt` now projects the first at-risk invariant and concise provenance from the same additive authority, so TG1 can focus on finishing `trend` without inventing a second reasoning path.

### Success signals
- terse run-status outputs stay readable while exposing the first at-risk invariant when present
- provenance remains a projection from `behaviorClaims[].evidenceSummary`, not a parallel reasoning tree
- trend output keeps its delta role while adding just enough invariant context to stay honest

### Operating-plan handoff
`operating_plan.md` now decomposes **TG1 only** into exact AK slices.

## TG2 — Align generated sample artifacts and README with the concise output contract

### Why this matters next
Once TG1 lands, the reviewed example bundle and README must show the same concise surfaces the runtime emits.
That keeps docs and examples from lagging behind the product surface.

### Success signals
- `scripts/generate-samples.mjs` exports the concise surfaces the repo intends reviewers to trust
- `README.md` lists and describes those concise artifacts truthfully
- example artifacts remain reviewable and intentional

## TG3 — Lock concise output parity with targeted regression coverage

### Why this matters next
Concise outputs drift easily because they look secondary.
They need explicit regression coverage once the remaining projections are in place.

### Success signals
- targeted tests fail if concise provenance disappears from the intended surfaces
- golden-output coverage includes the concise run-status surfaces the repo treats as contract-bearing
- future report tweaks are less likely to silently create divergence

## TG4 — Re-audit remaining decision-side outputs after run-status parity lands

### Why this stays later
This tactical goal belongs to the same strategic theme, but it should wait until the run-status surfaces are complete.
After TG1-TG3, the repo can re-check whether any remaining decision-side outputs still summarize evidence too aggressively.

### Likely evidence to inspect when promoted
- authorization / attestation review text
- amendment-facing outputs
- any concise decision summaries downstream of governance or legitimacy flows

## Tactical guardrails
- keep `behaviorClaims[].evidenceSummary` as the additive root
- do not let concise outputs outrank `run.json`
- prefer small end-to-end slices over broad redesign
- do not decompose TG2-TG4 into operating slices until TG1 is materially complete
