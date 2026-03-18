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

Shared types and storage primitives. It defines the canonical JSON artifact model, path normalization, stable serialization, hashing, diff-hunk parsing, run storage, and waiver matching.

### `packages/crap4ts`

AST-backed CRAP analysis for TS/JS. It parses LCOV, discovers function-like nodes, computes cyclomatic complexity, maps line coverage to functions, computes CRAP scores, and marks changed functions.

### `packages/ts-mutate`

Deterministic mutation testing. It discovers mutation sites from the TypeScript AST, applies exact-span mutations, runs tests in isolated temporary copies, and caches results in a manifest for incremental reuse.

### `packages/invariants`

Behavioral understanding layer. Invariants bind expected behavior to paths, symbols, and domains. The engine maps changed code, mutation survivors, and test corpus evidence back to invariants, emits missing-test obligations, and records compact invariant-scoped evidence summaries plus named deterministic sub-signals for reports and run artifacts.

### `packages/policy-engine`

Judgment layer. It combines CRAP, mutation outcomes, invariant impact, waivers, and governance findings into a merge-confidence verdict with machine-readable findings and human-readable explanations.

### `packages/governance`

Constitution layer. It enforces architectural boundaries, approval rules, rollback evidence, and domain risk budgets. It also produces implementation plans with explicit tradeoffs.

### `packages/legitimacy`

Legitimacy layer. It models agents and grants, builds proof-carrying change bundles, signs and verifies attestations with Ed25519, evaluates change authorization, records overrides, and evaluates constitutional amendments.

### `packages/ts-quality`

Product surface. It loads configuration, orchestrates the engines, writes artifacts, and exposes the unified CLI.

## Data flow

1. `ts-quality check` loads `ts-quality.config.ts`.
2. Changed files and optional diff hunks define the scope.
3. `crap4ts` computes structural risk.
4. `ts-mutate` computes behavioral pressure.
5. `invariants` interprets evidence against declared system intent using focused test corpora aligned to impacted files or explicit `requiredTestPatterns`, then emits per-invariant evidence summaries with named sub-signals (focused-test alignment, changed-function pressure, coverage pressure, mutation pressure, and scenario support) plus additive provenance modes (`explicit`, `inferred`, `missing`).
6. `policy-engine` emits an explainable merge-confidence verdict.
7. `governance` evaluates constitutional constraints and produces a plan.
8. `legitimacy` consumes the evidence bundle for authorization, attestation, override, and amendment flows.
9. Artifacts are persisted to `.ts-quality/runs/<run-id>/`.

## Design choices

- **Offline-first**: every core flow works locally with no network dependency.
- **Deterministic semantics**: invariant reasoning is keyword- and selector-driven, not opaque.
- **Stable artifacts**: JSON is key-sorted for hashing, signing, and diffability.
- **Human overrideability**: automation can be blocked, narrowed, or overridden with recorded standing and rationale.
verrideability**: automation can be blocked, narrowed, or overridden with recorded standing and rationale.
