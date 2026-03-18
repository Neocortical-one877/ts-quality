---
summary: "Active handoff after analysis-context hardening; the next repo-local queue continues at #182 for PR-facing provenance projection."
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
- Latest durable learning: `docs/learnings/2026-03-18-additive-evidence-provenance-modes.md`
- Latest session capture: `diary/2026-03-18--feat-analysis-context-hardening.md`
- Active/deferred work authority: Agent Kernel
- Checked-in work-items projection: `governance/work-items.json`
- Raw session capture: `diary/`
- Long-term project docs: `docs/project/purpose.md`, `docs/project/mission.md`, `docs/project/vision.md`, `docs/project/strategic_goals.md`, `docs/project/tactical_goals.md`, `docs/project/operating_plan.md`

## DIRECTION-TO-EXECUTION RULE (HARD)
If a repo-local AK rescore finds no ready task and there is no better active handoff, decompose the next architecture-native improvement wave into one bounded repo-local slice instead of refreshing wording only.
Prefer explicit evidence/report improvements over vague semantic-expansion work.

## ACTIVE HANDOFF
- Repo registration in AK remains verified.
- **`#181`** — introduce explicit vs inferred invariant evidence modes — is complete.
- Operator-driven analysis-context hardening is now also complete: run artifacts carry additive `analysis` / `mutationBaseline` receipts, diff hunks narrow scope inside changed files, mutation cache keys fingerprint execution context, approvals can bind to exact run ids, ownership rules are enforced, and overrides are revalidated against real `override` grants.
- The next reviewed repo-local queue now continues in the next SG2 operator-surface wave:
  - **`#182`** — surface invariant evidence provenance in `pr-summary.md`
- Keep scope bounded to PR-facing output, evidence-summary projections, docs, regression tests, and generated sample artifacts.
- Keep `pr-summary.md` downstream of `behaviorClaims[].evidenceSummary`; do **not** invent a second authority or a second reasoning system.
- Keep concise output honest about whether invariant support is explicit, inferred, or missing.
- Do **not** let a headline merge-confidence score outrank the underlying evidence basis.
- Do **not** let docs promise semantic depth beyond what deterministic evidence actually supports.

## AK COMMANDS
This repo now ships the same repo-local AK launcher pattern used in `ts-quality-tools`:

```bash
./scripts/ak.sh --doctor
./scripts/ak.sh task ready --format json | jq '.[] | select(.repo == "/home/tryinget/ai-society/softwareco/owned/ts-quality")'
./scripts/ak.sh task list --format json --verbose | jq '.[] | select(.repo == "/home/tryinget/ai-society/softwareco/owned/ts-quality" and .id == 182)'
./scripts/ak.sh task claim 182 --agent pi
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
10. `docs/learnings/2026-03-18-additive-evidence-provenance-modes.md`
11. `diary/2026-03-18--feat-analysis-context-hardening.md`
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
- Slice executed: operator-driven analysis-context hardening across evidence-model / crap4ts / ts-mutate / governance / legitimacy / ts-quality
- Outcome: additive `run.analysis` / `run.mutationBaseline` receipts now ship; diff hunks narrow scope within changed files; mutation scoring refuses red baselines and fingerprints execution context; exact run-id approval binding, ownership enforcement, override-scope checks, and deep package attribution are covered by regression tests/docs/sample artifacts
- Refactoring status: structural hardening stayed additive-first; existing report/invariant surfaces were preserved while the hidden execution context became explicit
- Validation from the completed slice: `npm test` (pass), `npm run sample-artifacts` (pass), `npm run verify` (pass), `node ~/ai-society/core/agent-scripts/scripts/docs-list.mjs --docs . --strict` (pass)
- Next-session starting point: inspect AK task **`#182`**, read the PR-summary/report rendering code paths it touches, and keep the concise provenance projection downstream of the current evidence-summary authority plus the new run-level analysis receipts

## END-OF-SESSION
- keep this file aligned with the real next starting point
- update only the active handoff window above when needed
- move novel session narrative to `diary/`
- keep AK authoritative for task status / readiness / priority
- if docs changed, run `node ~/ai-society/core/agent-scripts/scripts/docs-list.mjs --docs . --strict`
