---
summary: "Operating plan for the active tactical goal (TG1) in ts-quality, with exact AK task IDs for the current concise run-status wave."
read_when:
  - "When deciding the next bounded implementation slice in ts-quality"
  - "When translating the active tactical goal into the current repo-local queue"
type: "reference"
---

# Operating plan

## Active decomposition target
This file decomposes **TG1 — finish concise run-status outputs so they still show risky-invariant context**.
It does **not** queue TG2-TG4 yet.

## Why TG1 is the active tactical goal
Repo truth still shows one remaining concise run-status gap:
- `trend` is a concise CLI surface, but it currently reports only deltas and no risky-invariant context

`check-summary.txt` now projects the first at-risk invariant plus concise provenance from `behaviorClaims[].evidenceSummary`, so TG1 can finish with the remaining trend slice.

## Ordered operating slices (authoritative AK references)

### O1 — **AK `#184`** — project risky invariant provenance into `check-summary.txt`
State:
- completed 2026-03-18

Deliverable:
- `check-summary.txt` stays terse but includes the first at-risk invariant plus concise provenance when a risky claim exists
- rendering remains downstream of `behaviorClaims[].evidenceSummary`

Primary files involved:
- `packages/ts-quality/src/index.ts`
- `test/cli-integration.test.mjs`

### O2 — **AK `#187`** — surface risky invariant context in `trend` output
State:
- ready now

Deliverable:
- `trend` keeps numeric deltas, but also shows the latest run's first at-risk invariant and concise provenance when relevant
- trend remains a projection, not a second report authority

Primary files likely involved:
- `packages/ts-quality/src/index.ts`
- targeted CLI/report tests if needed

### O3 — **AK `#185`** — include `check-summary.txt` in generated sample artifacts and README
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

### O4 — **AK `#186`** — add regression coverage for `check-summary` provenance output
State:
- ready now

Deliverable:
- targeted tests fail if `check-summary.txt` drops the intended provenance projection
- concise output contract is harder to regress silently

Primary files likely involved:
- `test/cli-integration.test.mjs`
- `test/golden-output.test.mjs`

## Current ready queue
Ready now:
- `#187` — surface risky invariant context in `trend` output
- `#185` — include `check-summary.txt` in generated sample artifacts and README
- `#186` — add regression coverage for `check-summary` provenance output

Completed this session:
- `#184` — project risky invariant provenance into `check-summary.txt`

## HTN

```text
G0: Make concise operator surfaces stay honest about invariant evidence provenance
  SG1: Close the remaining concise operator-surface gaps under behaviorClaims[].evidenceSummary
    TG1: Finish concise run-status outputs so they still show risky-invariant context
      O1: AK #184 -> project provenance into check-summary.txt
      O2: AK #187 -> surface risky-invariant context in trend output
      O3: AK #185 -> add check-summary.txt to sample artifacts and README
      O4: AK #186 -> add regression coverage for check-summary provenance output
```

## Queue discipline
- start with `#187` unless the operator explicitly reprioritizes `#185` or `#186`
- do not create TG2-TG4 tasks yet
- after TG1 is materially complete, refresh `tactical_goals.md` and promote TG2
