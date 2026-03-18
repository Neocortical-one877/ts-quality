---
summary: "Operating-plan transition after corrective task AK #189; no follow-on repo-local SG2 slice is materialized yet."
read_when:
  - "When deciding the next bounded implementation slice in ts-quality"
  - "When translating the current tactical state into the repo-local queue"
type: "reference"
---

# Operating plan

## Active decomposition target
There is no active repo-local implementation slice materialized right now.
TG3 is complete, and the next session should first materialize the opening SG2 slice.

## Why TG3 is now complete
Repo truth now shows the concise operator contract hardened end to end:
- `check-summary.txt` projects risky-invariant provenance
- `trend` projects the latest run's first at-risk invariant provenance while keeping numeric deltas
- generated sample artifacts include `check-summary.txt`
- `README.md` describes the same concise artifact contract the code emits
- targeted regression coverage now checks `check-summary.txt` provenance framing against the reviewed sample contract

## Completed this session

### M2 — **AK `#189`** — stabilize sample artifact generation and gate drift in verify
State:
- completed 2026-03-18

Deliverable now true:
- `scripts/generate-samples.mjs` emits an idempotent reviewed sample bundle with fixed sample run ids and normalized volatile mutation timing text
- `npm run verify` now reruns sample generation and fails if the second pass changes `examples/artifacts/governed-app`
- sample-artifact drift is harder to miss without requiring a perfectly clean git tree during implementation

Primary files touched:
- `scripts/generate-samples.mjs`
- `scripts/verify.mjs`
- `README.md`
- `docs/project/strategic_goals.md`
- `docs/project/tactical_goals.md`
- `docs/project/operating_plan.md`
- `next_session_prompt.md`
- `governance/work-items.json`
- `diary/2026-03-18--fix-sample-artifact-idempotence.md`

## Current ready queue
Ready now:
- none repo-local

Completed this session:
- `#189` — stabilize sample artifact generation and gate drift in verify

Deferred this session (authority-bound in AK):
- `#190` — automate AK-to-handoff projection sync
- `#191` — stabilize or untrack volatile verification artifacts

## Next materialization target
Before more implementation work, decompose **SG2** into the first real repo-local AK slice.
Candidate starting area: governance / legitimacy decision outputs that still compress evidence provenance or exact run targeting too far.

## HTN

```text
G0: Make concise operator surfaces stay honest about invariant evidence provenance
  SG1: Close the remaining concise operator-surface gaps under behaviorClaims[].evidenceSummary [done]
    TG1: Finish concise run-status outputs so they still show risky-invariant context [done]
      P1: AK #184 -> project provenance into check-summary.txt [done]
      P2: AK #187 -> surface risky invariant context in trend output [done]
    TG2: Align generated sample artifacts and README with the concise output contract [done]
      P3: AK #185 -> add check-summary.txt to sample artifacts and README [done]
    TG3: Lock concise output parity with targeted regression coverage [done]
      O1: AK #186 -> add regression coverage for check-summary provenance output [done]
  SG2: Carry the same evidence truth into governance/legitimacy decision surfaces [active, not yet decomposed]
```

## Queue discipline
- do not invent a fake active AK slice when none exists
- start the next session by confirming repo-local readiness, then materialize the first SG2 task before coding
- keep `next_session_prompt.md` pointed at real queue truth: either a ready AK task or an explicit “none materialized yet” handoff
