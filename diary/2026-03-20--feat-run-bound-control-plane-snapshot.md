---
summary: "Session capture for hardening downstream trust surfaces with a run-bound control-plane snapshot, amendment semantic validation, and template-literal governance coverage."
read_when:
  - "When reviewing why plan/govern/authorize now fail closed on control-plane drift"
  - "When tracing how amendment semantics and governance import parsing were hardened together"
type: "diary"
---

# 2026-03-20 — run-bound control-plane snapshot

## What I Did
- Added a run-bound `controlPlane` snapshot to `run.json` so `check` now persists the reviewed config digest, policy defaults, constitution digest + rules, agent digest + grants, and support-path bindings for approvals, waivers, overrides, attestations, and trusted keys.
- Changed downstream decision surfaces to project from that persisted snapshot instead of reloading live config / constitution / agent semantics from the repo after the run.
- Extended run-drift detection so `plan`, `govern`, and `authorize` now fail closed when the analyzed files drift **or** when the snapped config / constitution / agents drift after `check`.
- Hardened governance import parsing so no-substitution template-literal dynamic imports such as ``import(`../identity/store`)`` are treated as the same forbidden boundary crossing as string-literal imports.
- Hardened amendment evaluation/application so duplicate rule ids and replace/remove operations targeting missing rules are denied instead of silently succeeding or partially mutating the constitution.
- Updated README / architecture / governance / legitimacy / config docs to reflect the run-bound control-plane contract.

## Why This Slice
The repo already had strong deterministic evidence artifacts, but downstream trust decisions still depended on mutable live policy files. That left a split-brain boundary where a run could be reviewed under one constitution and authorized under another.

The fix was to treat the control plane itself as run evidence: snapshot it during `check`, then project later decision surfaces from that snapshot while still allowing exact-run approvals / overrides / attestations to arrive afterward.

## Verification
- `npm run build`
- `node --test test/authorization-integration.test.mjs test/cli-integration.test.mjs test/governance.test.mjs test/amend-integration.test.mjs`
- `npm run sample-artifacts`
- `node ~/ai-society/core/agent-scripts/scripts/docs-list.mjs --docs . --strict`

## Follow-on
- The next deeper hardening candidate is whether broad `runId`-only approval targeting should remain valid across multiple approval/ownership rules in one run, or whether those approvals should become rule-specific by default.
