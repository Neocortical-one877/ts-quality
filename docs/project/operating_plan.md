---
summary: "Operating plan after AK #192, #193, and #194; the opening SG2 authorization slice is complete, config/runtime hardening is materially stronger, and no follow-on repo-local SG2 slice is materialized yet."
read_when:
  - "When deciding the next bounded implementation slice in ts-quality"
  - "When translating the current tactical state into the repo-local queue"
type: "reference"
---

# Operating plan

## Active decomposition target
There is no active repo-local implementation slice materialized right now.
The opening SG2 authorization slice is complete, and the next session should materialize the follow-on SG2 slice before coding.

## Why the opening SG2 slice is now complete
Repo truth now shows legitimacy decisions carrying the same additive run-bound evidence discipline as the reviewed operator surfaces:
- `authorize.<agent>.<action>.json` projects exact run-bound artifact paths
- authorization outputs surface current blocking governance findings instead of only a compressed denial reason
- authorization outputs surface first risky-invariant provenance from `behaviorClaims[].evidenceSummary`
- reviewed sample artifacts and regression coverage now treat that authorization projection as contract-bearing

## Completed this session

### M3 — **AK `#192`** — surface run-boundary evidence in authorization decisions
State:
- completed 2026-03-18

Deliverable now true:
- `packages/ts-quality/src/index.ts` augments authorization decisions with additive `evidenceContext`
- authorization artifacts now cite exact run-relative paths for `run.json`, `verdict.json`, `govern.txt`, and the generated change bundle
- decision artifacts now project current blocking governance findings plus the first risky-invariant provenance summary without creating a second evidence authority
- reviewed sample authorization artifacts and targeted regression coverage now lock that contract

Primary files touched:
- `packages/evidence-model/src/index.ts`
- `packages/ts-quality/src/index.ts`
- `test/authorization-integration.test.mjs`
- `test/golden-output.test.mjs`
- `examples/artifacts/governed-app/authorize.release-bot.json`
- `examples/artifacts/governed-app/authorize.maintainer.json`
- `examples/artifacts/governed-app/authorize.maintainer-approved.json`
- `README.md`
- `docs/legitimacy-agent-licensing.md`
- `docs/project/strategic_goals.md`
- `docs/project/tactical_goals.md`
- `docs/project/operating_plan.md`
- `next_session_prompt.md`
- `governance/work-items.json`
- `diary/2026-03-18--feat-authorization-evidence-context.md`

### M4 — **AK `#193`** — harden config loading to eliminate executable TS/JS module evaluation
State:
- completed 2026-03-19

Deliverable now true:
- `packages/ts-quality/src/config.ts` parses `.ts` / `.js` / `.mjs` / `.cjs` config-like files as data-only modules instead of executing repo code through `vm`
- repo-local support files loaded through the same path (`.ts-quality/invariants.*`, `.ts-quality/constitution.*`, `.ts-quality/agents.*`, and similar) now obey the same data-only contract
- executable expressions such as function calls or runtime property access are rejected deterministically during load
- regression coverage now locks accepted data-only forms and rejected executable forms
- docs and ADRs now state clearly that this is an intentional alpha-stage breaking change

Primary files touched:
- `packages/ts-quality/src/config.ts`
- `test/config-loading.test.mjs`
- `README.md`
- `ARCHITECTURE.md`
- `CHANGELOG.md`
- `docs/config-reference.md`
- `docs/decisions/2026-03-19-alpha-breaking-changes-allowed.md`
- `docs/decisions/2026-03-19-data-only-config-modules.md`
- `docs/project/strategic_goals.md`
- `docs/project/tactical_goals.md`
- `docs/project/operating_plan.md`
- `next_session_prompt.md`
- `governance/work-items.json`

### M5 — **AK `#194`** — materialize config/support modules into canonical runtime JSON artifacts
State:
- completed 2026-03-20

Deliverable now true:
- `ts-quality materialize` exports the currently loaded config/support data into `.ts-quality/materialized/`
- generated `ts-quality.config.json` rewrites support-file paths to exported JSON artifacts so later checks can run from boring materialized runtime inputs
- one end-to-end regression now proves `check --config .ts-quality/materialized/ts-quality.config.json` yields the same verdict as the source config on the governed fixture
- docs and example flow now show how to run from materialized runtime artifacts

Primary files touched:
- `packages/ts-quality/src/index.ts`
- `packages/ts-quality/src/cli.ts`
- `test/cli-integration.test.mjs`
- `README.md`
- `docs/config-reference.md`
- `examples/basic/README.md`
- `ARCHITECTURE.md`
- `CHANGELOG.md`
- `next_session_prompt.md`
- `docs/project/operating_plan.md`
- `governance/work-items.json`

## Current ready queue
Ready now:
- none repo-local

Completed this session:
- `#192` — surface run-boundary evidence in authorization decisions
- `#193` — harden config loading by replacing executable module evaluation with a data-only parser
- `#194` — materialize config/support modules into canonical runtime JSON artifacts

Deferred this session (authority-bound in AK):
- `#190` — automate AK-to-handoff projection sync
- `#191` — stabilize or untrack volatile verification artifacts

## Next materialization target
Before more implementation work, materialize the next **SG2** slice.
Candidate starting area: amendment-facing results or attestation-review outputs that still compress targeted evidence or exact run binding too far.

## HTN

```text
G0: Make decision-facing outputs stay honest about additive evidence provenance
  SG1: Close the remaining concise operator-surface gaps under behaviorClaims[].evidenceSummary [done]
    TG1: Finish concise run-status outputs so they still show risky-invariant context [done]
      P1: AK #184 -> project provenance into check-summary.txt [done]
      P2: AK #187 -> surface risky invariant context in trend output [done]
    TG2: Align generated sample artifacts and README with the concise output contract [done]
      P3: AK #185 -> add check-summary.txt to sample artifacts and README [done]
    TG3: Lock concise output parity with targeted regression coverage [done]
      O1: AK #186 -> add regression coverage for check-summary provenance output [done]
  SG2: Carry the same evidence truth into governance/legitimacy decision surfaces [active]
    TG5: Make authorization decisions cite exact run-bound evidence [done]
      P4: AK #192 -> project run-bound evidence context into authorize outputs [done]
```

## Queue discipline
- do not invent a fake active AK slice when none exists
- start the next session by confirming repo-local readiness, then materialize the next SG2 task before coding
- keep `next_session_prompt.md` pointed at real queue truth: either a ready AK task or an explicit “none materialized yet” handoff
