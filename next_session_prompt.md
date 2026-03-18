---
summary: "Active handoff: AK #184 is complete; start with #187 unless the operator reprioritizes #185 or #186."
read_when:
  - "At the start of every work session"
  - "When resuming work in ts-quality after a pause"
type: "reference"
---

# Next Session Prompt

## SESSION TRIGGER (AUTO-START)
Reading this file is authorization to begin immediately.
Do not ask for permission to start.

## ACTIVE GOAL STACK
- **Strategic goal:** SG1 — close the remaining concise operator-surface gaps under `behaviorClaims[].evidenceSummary`
- **Tactical goal:** TG1 — finish concise run-status outputs so they still show risky-invariant context
- **Operating slices:** AK `#187`, `#185`, `#186`

## START HERE
1. Run `./scripts/ak.sh --doctor`
2. Confirm repo-local ready work with:
   ```bash
   ./scripts/ak.sh task ready --format json | jq '.[] | select(.repo == "/home/tryinget/ai-society/softwareco/owned/ts-quality")'
   ```
3. Unless the operator reprioritizes, start with **AK `#187`** — `ts-quality: surface risky invariant context in trend output`

## CURRENT QUEUE TRUTH
Ready now:
- `#187` — surface risky invariant context in trend output
- `#185` — include `check-summary.txt` in generated sample artifacts and README
- `#186` — add regression coverage for check-summary provenance output

Completed this session:
- `#184` — project risky invariant provenance into `check-summary.txt`

## READ-FIRST ORDER
1. `AGENTS.md`
2. `README.md`
3. `ARCHITECTURE.md`
4. `docs/project/strategic_goals.md`
5. `docs/project/tactical_goals.md`
6. `docs/project/operating_plan.md`
7. `docs/config-reference.md`
8. `docs/invariant-dsl.md`
9. relevant package source + tests for the claimed AK slice

## EXECUTION RULES
- Keep `behaviorClaims[].evidenceSummary` as the additive authority.
- Do not invent a second evidence/report authority.
- Make the smallest end-to-end additive change that proves the claimed slice.
- Update `docs/project/*`, `next_session_prompt.md`, diary, and `governance/work-items.json` when queue truth changes.
- If docs change, run `node ~/ai-society/core/agent-scripts/scripts/docs-list.mjs --docs . --strict`.

## END-OF-SESSION
- keep this file short and current
- point it at the next real AK task
- move session narrative to `diary/`
- keep AK authoritative for live task state
