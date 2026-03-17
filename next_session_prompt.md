---
summary: "Active handoff after landing #179 invariant evidence summaries; the next repo-local queue continues at #180 over explicit invariant evidence sub-signals."
read_when:
  - "At the start of every work session"
  - "When resuming work in ts-quality after a pause"
type: "reference"
---

# Next Session Prompt

## SESSION TRIGGER (AUTO-START)
Reading this file is authorization to begin immediately.
Do not ask for permission to start.

## AUTONOMY RULE (HARD)
After reading this file, continue the workflow without interim progress updates.
Only stop before completion if:
1. a destructive or ambiguous choice requires operator input, or
2. a hard blocker prevents further progress.

Otherwise continue through research, implementation, validation, and handoff in one run.

## ANTI-STALE RULES (HARD)
- Keep this file short and current.
- Keep only the active handoff window, not a running history log.
- Track live work state in Agent Kernel.
- Keep `governance/work-items.json` as the checked-in projection from AK, not the canonical queue.
- Move finished session narrative to `diary/`.
- Put durable lessons in `docs/learnings/`.
- Keep durable project direction in `docs/project/` and keep it aligned with repo truth; do **not** let project prose outrank runtime/code reality when they diverge.

## SOURCE-OF-TRUTH MAP
- Repo operating contract: `AGENTS.md`
- Product overview + CLI surface: `README.md`
- Runtime architecture: `ARCHITECTURE.md`
- Config contract: `docs/config-reference.md`
- Invariant contract: `docs/invariant-dsl.md`
- CI/operator integration: `docs/ci-integration.md`
- Latest durable learning: `docs/learnings/2026-03-17-deterministic-evidence-depth.md`
- Latest session capture: `diary/2026-03-17--feat-invariant-evidence-summaries.md`
- Active/deferred work authority: Agent Kernel
- Checked-in work-items projection: `governance/work-items.json`
- Raw session capture: `diary/`
- Long-term project docs: `docs/project/purpose.md`, `docs/project/mission.md`, `docs/project/vision.md`, `docs/project/strategic_goals.md`, `docs/project/tactical_goals.md`, `docs/project/operating_plan.md`

## DIRECTION-TO-EXECUTION RULE (HARD)
If a repo-local AK rescore finds no ready task and there is no better active handoff, decompose the next architecture-native improvement wave into one bounded repo-local slice instead of refreshing wording only.
Prefer explicit evidence/report improvements over vague semantic-expansion work.

## ACTIVE HANDOFF
- Repo registration in AK remains verified.
- **`#179`** — add invariant-scoped evidence summaries — is complete.
- The next reviewed repo-local queue now continues in the same invariant-evidence wave:
  - **`#180`** — split invariant evaluation into explicit evidence sub-signals
  - **`#181`** — introduce explicit vs inferred invariant evidence modes
- Keep scope bounded to this repo's invariant evaluation, evidence-model, report/explain/run artifact surfaces, docs, examples, and regression tests.
- Keep `behaviorClaims[].evidenceSummary` additive; extend it rather than replacing it with a new top-level authority unless the repo explicitly adopts that change.
- Keep deterministic evidence depth grounded in:
  - correct glob semantics
  - focused aligned tests or explicit `requiredTestPatterns`
  - explicit artifact evidence rather than repo-global keyword coincidence
- Do **not** reintroduce repo-global invariant keyword matching as if it were focused evidence.
- Do **not** let a headline merge-confidence score outrank the underlying evidence basis.
- Do **not** let docs promise semantic depth beyond what deterministic evidence actually supports.

## AK COMMANDS
This repo now ships the same repo-local AK launcher pattern used in `ts-quality-tools`:

```bash
./scripts/ak.sh --doctor
./scripts/ak.sh task ready --format json | jq '.[] | select(.repo == "/home/tryinget/ai-society/softwareco/owned/ts-quality")'
./scripts/ak.sh task list --format json --verbose | jq '.[] | select(.repo == "/home/tryinget/ai-society/softwareco/owned/ts-quality" and .id == 180)'
./scripts/ak.sh task list --format json --verbose | jq '.[] | select(.repo == "/home/tryinget/ai-society/softwareco/owned/ts-quality" and .id == 181)'
./scripts/ak.sh task claim 180 --agent pi
git status --short
```

## READ-FIRST ALLOWLIST (STARTUP BUDGET)
1. `AGENTS.md`
2. `README.md`
3. `ARCHITECTURE.md`
4. `docs/project/vision.md`
5. `docs/project/strategic_goals.md`
6. `docs/project/tactical_goals.md`
7. `docs/project/operating_plan.md`
8. `docs/config-reference.md`
9. `docs/invariant-dsl.md`
10. `docs/learnings/2026-03-17-deterministic-evidence-depth.md`
11. `diary/2026-03-17--feat-invariant-evidence-summaries.md`
12. relevant package source + regression tests for the claimed task

## EXECUTION MODE (MANDATORY ORDER)
1. **Task** — select or confirm the exact repo-scoped AK task before coding.
2. **Research** — read the relevant docs and inspect the current code path.
3. **Architecture design** — decide canonical artifact contract vs downstream projection.
4. **Implementation plan** — write acceptance bullets and validation commands before coding.
5. **Implementation** — make the smallest end-to-end additive change that proves the slice.
6. **Verification / validation** — run targeted tests first, then repo-level validation appropriate to the slice.
7. **Refactoring** — remove stale naming/glue/docs, or explicitly record that no refactor was needed.
8. **Promotion** — update docs/handoff, capture diary context, and keep AK/projection truth aligned.
9. **Commit** — leave the repo ready for a clean next context window unless the operator explicitly says otherwise.

## SESSION CHECKPOINT
- Slice executed: **`#179`** — add invariant-scoped evidence summaries
- Outcome: additive `behaviorClaims[].evidenceSummary` support now flows through the evidence model, invariant evaluation, run/report/explain output, docs, tests, and generated example artifacts
- Refactoring status: no structural refactor was required; the existing behavior-claim surface carried the additive summary cleanly
- Validation from the completed slice: `npm test` (pass), `npm run verify` (pass)
- Next-session starting point: inspect AK task **`#180`**, read the invariant/evidence-model/report code paths it touches, and keep any follow-on signal split additive to the current artifact/report surface

## END-OF-SESSION
- keep this file aligned with the real next starting point
- update only the active handoff window above when needed
- move novel session narrative to `diary/`
- keep AK authoritative for task status / readiness / priority
- if docs changed, run `node ~/ai-society/core/agent-scripts/scripts/docs-list.mjs --docs . --strict`
