---
summary: "Session capture for hardening the canonical preflight analysis lane across repo-local path containment, governance import detection, and runtime mirror coverage."
read_when:
  - "When reviewing how analysis-input path containment was centralized"
  - "When tracing why dynamic import governance and root-level runtime mirrors were hardened together"
type: "reference"
---

# 2026-03-20 — analysis preflight manifest hardening

## What I Did
- centralized path-bearing analysis input hardening in `loadContext()` so `coverage.lcovPath`, `changeSet.files`, `changeSet.diffFile`, and `mutations.runtimeMirrorRoots` are canonicalized to repo-local paths before execution
- routed `runCheck()` through a single analysis manifest that carries canonical changed scope, coverage path, and runtime mirror roots into execution receipts
- extended governance import discovery to catch dynamic `import(...)` in addition to static imports and `require(...)`
- broadened runtime mirror candidate mapping so root-level sources can mirror into configured built-runtime roots like `dist/index.js`
- added regression coverage for escaping config paths, escaping CLI `--changed` overrides, dynamic-import boundary violations, and root-level runtime mirror mutation runs
- updated runtime/docs/changelog surfaces and re-ran repo verification

## What Surprised Me
- the original green test suite still allowed off-repo changed-file scope to flow into authorization bundles because `changeSet.files` was type-checked but not repo-contained
- custom runtime mirror roots already existed conceptually, but the implementation still assumed a literal `src/` segment

## Patterns
- deterministic evidence only stays trustworthy when every config/CLI ingress path is normalized through one canonical repo-local resolver
- governance edge extraction should be syntax-complete enough to survive common refactors like lazy loading

## Crystallization Candidates
- → docs/learnings/: centralize repo-local ingress normalization before evidence computation
- → docs/learnings/: treat dynamic `import(...)` as a first-class architectural dependency edge
