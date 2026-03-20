---
summary: "Session capture for AK #194, adding a materialized runtime JSON lane for config and repo-local support files."
read_when:
  - "When resuming after AK #194"
  - "When reviewing why ts-quality now supports `materialize` before `check`"
type: "reference"
---

# AK #194 — materialized runtime config lane

## What changed
- added `ts-quality materialize`
- the command exports the currently loaded config/support data into `.ts-quality/materialized/` by default
- generated `ts-quality.config.json` rewrites support-file paths to exported JSON artifacts
- later commands can run from those boring runtime artifacts via `--config .ts-quality/materialized/ts-quality.config.json`
- the first end-to-end regression proves the materialized runtime config yields the same verdict as the source config on the governed fixture

## Why this matters
AK `#193` removed executable config loading, but still left runtime dependent on a product-owned data-only parser.
This new lane starts separating authoring from ingestion: humans can keep authoring in supported source files, while runtime can increasingly move toward canonical exported data artifacts.

## Validation
- `npm run build`
- `npm test`
- `node ~/ai-society/core/agent-scripts/scripts/docs-list.mjs --docs . --strict`
- `npm run verify`

## Queue truth
- AK `#194` completed 2026-03-20
- no new SG2 tactical slice was materialized in the same pass
