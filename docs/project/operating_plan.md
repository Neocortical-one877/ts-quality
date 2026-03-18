---
summary: "Operating plan for the active tactical goal (TG2) in ts-quality, with exact AK task IDs for the current sample-artifact / README alignment wave."
read_when:
  - "When deciding the next bounded implementation slice in ts-quality"
  - "When translating the active tactical goal into the current repo-local queue"
type: "reference"
---

# Operating plan

## Active decomposition target
This file decomposes **TG2 — align generated sample artifacts and README with the concise output contract**.
It does **not** queue TG3-TG4 yet.

## Why TG2 is the active tactical goal
Repo truth now shows the runtime concise surfaces aligned:
- `check-summary.txt` projects risky-invariant provenance
- `trend` now projects the latest run's first at-risk invariant provenance while keeping numeric deltas

The remaining gap is that the reviewed sample bundle and README still do not show the full concise artifact contract operators now rely on.

## Ordered operating slices (authoritative AK references)

### O1 — **AK `#185`** — include `check-summary.txt` in generated sample artifacts and README
State:
- ready now

Deliverable:
- `scripts/generate-samples.mjs` exports `check-summary.txt`
- `README.md` truthfully lists the concise run-status artifact contract
- sample artifacts remain intentional and reviewable

Primary files likely involved:
- `scripts/generate-samples.mjs`
- `README.md`
- `examples/artifacts/governed-app/check-summary.txt`

## Completed prerequisite slices

### P1 — **AK `#184`** — project risky invariant provenance into `check-summary.txt`
State:
- completed 2026-03-18

### P2 — **AK `#187`** — surface risky invariant context in `trend` output
State:
- completed 2026-03-18

## Current ready queue
Ready now:
- `#185` — include `check-summary.txt` in generated sample artifacts and README
- `#186` — add regression coverage for `check-summary` provenance output

Completed this session:
- `#187` — surface risky invariant context in `trend` output

## HTN

```text
G0: Make concise operator surfaces stay honest about invariant evidence provenance
  SG1: Close the remaining concise operator-surface gaps under behaviorClaims[].evidenceSummary
    TG1: Finish concise run-status outputs so they still show risky-invariant context [done]
      P1: AK #184 -> project provenance into check-summary.txt [done]
      P2: AK #187 -> surface risky-invariant context in trend output [done]
    TG2: Align generated sample artifacts and README with the concise output contract [active]
      O1: AK #185 -> add check-summary.txt to sample artifacts and README
    TG3: Lock concise output parity with targeted regression coverage [next]
      Later: AK #186 -> add regression coverage for check-summary provenance output
```

## Queue discipline
- start with `#185` unless the operator explicitly reprioritizes `#186`
- do not decompose TG3-TG4 into active operating slices yet
- after TG2 is materially complete, refresh `tactical_goals.md`, promote TG3, and point `next_session_prompt.md` at `#186`
