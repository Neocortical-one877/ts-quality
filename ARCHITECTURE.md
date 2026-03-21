---
summary: "Runtime architecture for ts-quality's deterministic evidence, policy, governance, and legitimacy layers."
read_when:
  - "When changing core package boundaries or data flow"
  - "When aligning docs with shipped runtime behavior"
type: "reference"
---

# Architecture

## Overview

`ts-quality` is split into deterministic layers.

### `packages/evidence-model`

Shared types and storage primitives. It defines the canonical JSON artifact model, path normalization, repo-local path containment checks (including symlink escapes), stable serialization, hashing, diff-hunk parsing, run storage, waiver matching, additive execution receipts, and exact/unique coverage-path resolution helpers.

### `packages/crap4ts`

AST-backed CRAP analysis for TS/JS. It parses LCOV, discovers function-like nodes, computes cyclomatic complexity, maps line coverage to functions, computes CRAP scores, and marks changed functions. When both changed files and diff hunks are present, diff hunks now narrow the effective scope within the file instead of silently widening back to whole-file analysis.

### `packages/ts-mutate`

Deterministic mutation testing. It discovers mutation sites from the TypeScript AST, applies exact-span mutations, validates that the baseline test command passes before trusting mutant outcomes, runs tests in isolated temporary copies, strips inherited nested test-runner recursion context before launching mutation subprocesses, mirrors mutated JS into configured built-runtime roots when tests execute compiled output, transpiles mutated TS/TSX into matching JS runtime mirrors when the runtime under test is compiled output, and caches results in a manifest keyed by a deterministic execution fingerprint that includes the effective execution environment plus runtime-mirror configuration so test-corpus drift or runner-context leakage cannot silently reuse stale answers.

### `packages/invariants`

Behavioral understanding layer. Invariants bind expected behavior to paths, symbols, and domains. The engine maps changed code, mutation survivors, and test corpus evidence back to invariants, emits missing-test obligations, and records compact invariant-scoped evidence summaries plus named deterministic sub-signals for reports and run artifacts.

### `packages/policy-engine`

Judgment layer. It combines CRAP, mutation outcomes, invariant impact, waivers, and governance findings into a merge-confidence verdict with machine-readable findings and human-readable explanations.

### `packages/governance`

Constitution layer. It enforces architectural boundaries, approval rules, rollback evidence, ownership reservations, and domain risk budgets. Boundary checks use repo-aware module resolution, walking from the importer toward the repo root for the nearest `tsconfig.json`, so TS path aliases, extensionless local imports, and dynamic `import(...)` calls — including no-substitution template-literal specifiers such as ``import(`../identity/store`)`` — cannot silently bypass the constitution in common nested package layouts. When a boundary-scoped file uses a non-literal dynamic `import(...)`/`require(...)` expression that cannot be statically resolved, governance now fails closed instead of silently assuming the target is safe. It also produces implementation plans with explicit tradeoffs.

### `packages/legitimacy`

Legitimacy layer. It models agents and grants, builds proof-carrying change bundles, signs and verifies attestations with Ed25519, validates attestation shape before trust decisions, evaluates change authorization, records overrides, and evaluates constitutional amendments. Attestations are trusted only when they bind to repo-local artifacts under the exact evaluated run boundary, and authorization refuses vacuous empty-file scopes. Overrides are re-validated against override grants on the exact changed scope; a recorded override is not a blanket bypass.

### `packages/ts-quality`

Product surface. It loads configuration through a data-only module contract rather than executing repo code, canonicalizes path-bearing analysis inputs into a repo-local preflight manifest before execution, enforces repo-local trust/input paths for config-driven artifacts, binds signed subject digests to exact file bytes instead of UTF-8-decoded text views, can materialize author-authored config/support files into canonical runtime JSON artifacts with reserved input subtrees for copied user files, orchestrates the engines, writes artifacts, and exposes the unified CLI. It also owns the run-bound decision-context projection used by downstream governance and legitimacy commands so approvals, attestations, drift checks, and evidence-missing cases are evaluated against the exact reviewed run instead of ambient repo state. The same run now snapshots the decision control plane — schema version, config digest, policy defaults, constitution digest + rules, agent digest + grants, and support-path bindings for approvals / waivers / overrides / attestation trust inputs — so later plan/govern/authorize surfaces can reject unsupported or malformed snapshot schemas and fail closed on control-plane drift instead of silently trusting live repo edits.

## Data flow

1. `ts-quality check` loads `ts-quality.config.ts`.
2. A canonical preflight manifest resolves repo-local config inputs (coverage path, changed scope, diff path, runtime mirror roots), then a preallocated analysis context establishes the run id, exact changed-file list, optional diff hunks, source file set, and mutation execution fingerprint.
3. `crap4ts` computes structural risk, with diff hunks narrowing changed scope inside files when present.
4. `ts-mutate` validates the baseline test command, computes behavioral pressure in a hermetic subprocess context, fingerprints the effective execution environment, and records a baseline execution receipt.
5. `invariants` interprets evidence against declared system intent using focused test corpora aligned to impacted files or explicit `requiredTestPatterns`, then emits per-invariant evidence summaries with named sub-signals (focused-test alignment, changed-function pressure, coverage pressure, mutation pressure, and scenario support) plus additive provenance modes (`explicit`, `inferred`, `missing`).
6. `policy-engine` emits an explainable merge-confidence verdict and explicitly blocks on invalid mutation baselines or mutation execution errors.
7. `governance` evaluates constitutional constraints, including exact run-targeted approvals and ownership reservations, and produces a plan.
8. `legitimacy` consumes the evidence bundle for authorization, attestation, override, and amendment flows.
9. After `check`, downstream decision surfaces (`plan`, `govern`, `authorize`) project a run-bound context from the persisted artifact plus exact-run approvals/attestations, keep using the snapped constitution / grants / policy from `run.json`, and fail closed when the analyzed changed files or snapped control-plane files drift on disk.
10. Artifacts are persisted to `.ts-quality/runs/<run-id>/`.

## Design choices

- **Offline-first**: every core flow works locally with no network dependency.
- **Deterministic semantics**: invariant reasoning is keyword- and selector-driven, not opaque.
- **Stable artifacts**: JSON is key-sorted for hashing, signing, and diffability.
- **Preconditions before confidence**: mutation scoring is only trustworthy when the baseline command is green, the execution context is explicitly fingerprinted, and the evaluated scope produces measurable mutation pressure instead of a synthetic success state.
- **Run-bound downstream decisions**: governance and legitimacy projections must stay anchored to the exact evaluated run id, the snapped config / policy / constitution / grants for that run, exact run-targeted approvals/attestations, and current digests of the analyzed changed files plus snapped control-plane files.
- **Human overrideability**: automation can be blocked, narrowed, or overridden with recorded standing and rationale, but override grants must still match the exact changed scope.
