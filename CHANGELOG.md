---
summary: "Release history and notable shipped changes for ts-quality."
read_when:
  - "When reviewing what changed between releases"
  - "When preparing release notes or upgrade communication"
type: "reference"
---

# Changelog

## Unreleased

- Fixed glob semantics so patterns like `src/**/*.js` and `tests/**/*.mjs` match files directly under `src/` and `tests/`.
- Added `.mjs`/`.cjs` support across source discovery, mutation defaults, config loading, config discovery, and governance import resolution.
- Tightened invariant evidence so only focused tests aligned to impacted files or explicit `requiredTestPatterns` count toward support.
- Added regression tests for `.mjs` config loading, extension-aware source discovery, and focused invariant evidence.
- Clarified docs around deterministic scope, coverage prerequisites, and focused test evidence.
- Added explicit/inferred/missing provenance modes to invariant evidence sub-signals and rendered report/explain output.

## 5.0.0

- Added a root `ts-quality` CLI and unified config surface.
- Added a canonical evidence model and stable artifact storage under `.ts-quality/`.
- Added change-centric merge-confidence scoring with Markdown and JSON reporting.
- Added an invariant DSL and deterministic missing-test obligation generation.
- Added constitutional governance primitives, architectural boundary checks, and rollout planning.
- Added legitimacy primitives: agents, grants, proof-carrying change bundles, Ed25519 attestations, overrides, and amendments.
- Added tests, fixtures, examples, CI, verification scripts, and generated sample artifacts.
