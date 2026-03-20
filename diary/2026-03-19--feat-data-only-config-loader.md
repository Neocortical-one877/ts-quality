---
summary: "Session capture for AK #193, replacing executable config/support-module evaluation with a data-only parser."
read_when:
  - "When resuming after AK #193"
  - "When reviewing why ts-quality config and .ts-quality support files no longer execute project code"
type: "reference"
---

# AK #193 — data-only config loader

## What changed
- removed `vm`-based execution from `packages/ts-quality/src/config.ts`
- replaced it with a deterministic parser for data-only `.ts` / `.js` / `.mjs` / `.cjs` modules
- supported shapes now include literal objects/arrays, spreads over resolved data, and top-level `const` bindings that resolve to data
- rejected shapes now include executable expressions such as function calls and runtime property access like `process.env.X`
- the same data-only contract now applies to repo-local support files loaded through the config path (`.ts-quality/invariants.*`, `.ts-quality/constitution.*`, `.ts-quality/agents.*`, etc.)

## Why this landed now
- ADR `2026-03-19-alpha-breaking-changes-allowed.md` made it explicit that alpha-stage compatibility is not the governing constraint
- ADR `2026-03-19-data-only-config-modules.md` chose the target contract: parse config/support modules as data, do not execute repo code
- this closed the sharpest remaining trust-boundary weakness that earlier hardening passes left open

## Validation
- `npm run build`
- `npm test`
- `node ~/ai-society/core/agent-scripts/scripts/docs-list.mjs --docs . --strict`
- `npm run verify`

## Queue truth
- AK `#193` completed 2026-03-19
- no new ready SG2 slice was materialized in the same pass
