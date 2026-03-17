# Deterministic Evidence Depth

## Context
`ts-quality` was exercised against a normal package with `.mjs` tests and a small surface area. The tool looked deeper in the README than it felt in practice.

## Discovery
Two implementation details were flattening real signal:

1. glob handling treated `src/**/*.js` and `tests/**/*.mjs` as requiring at least one nested directory, so top-level source and test files were silently skipped.
2. invariant evidence was gathered from a repo-global test corpus, so unrelated tests could satisfy an invariant by sharing keywords.

The result was that a run could look more confident than the underlying evidence really justified.

## Evidence
- fixed glob semantics so `**/` matches zero or more directories
- added regression tests for `.mjs` / `.cjs` discovery and `.mjs` config loading
- tightened invariant evaluation to use focused test corpora aligned to impacted files or explicit `requiredTestPatterns`
- re-ran the full ts-quality test suite successfully

## Application
Any deterministic quality tool that uses globs and lexical evidence should:

- test its own glob semantics against top-level files
- constrain evidence to scoped inputs instead of repo-global text
- document prerequisites for meaningful confidence scores

## TIP Candidate
Yes. This applies to template defaults and any future evidence-driven agent tooling that relies on path globs or lexical matching.
