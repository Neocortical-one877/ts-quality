---
summary: "Repo operating contract for ts-quality."
read_when:
  - "You start work in this repo"
  - "You need repo-wide guardrails, validation commands, or project/runtime boundary rules"
type: "reference"
---

# AGENTS.md — ts-quality

## TRUE INTENT
Build a delivery repo where the repository root owns project-wide docs, validation, release policy, and governance, while implementation details live in the actual code, scripts, and language-specific docs.

## Project/runtime boundary
- Keep this file concise, stable, and policy-oriented.
- Put implementation details in source files, scripts, `README.md`, and project docs rather than duplicating them here.
- Treat `docs/_core/**` as immutable when present.
- Track deferred work in `governance/work-items.json` when the repo uses that projection.

## Repo-wide rules
- No secrets in git.
- Keep checked-in docs aligned with shipped behavior.
- Prefer deterministic repo-local scripts over ad-hoc commands when both exist.
- Keep the stack contract explicit when this repo ships a language/software pack:
  - `policy/stack-lane.json` pins the upstream lane
  - `docs/tech-stack.local.md` records repo-local overrides

## Validation contract

- Keep one canonical repo-root validation command and document it in `README.md`
- Prefer deterministic repo scripts for build, test, and release entrypoints

- Keep CI wrappers deterministic and repo-root relative.

## Deterministic tooling policy
- Prefer `./scripts/rocs.sh <args...>` before ad-hoc inline scripting when ROCS is present.
- Use inline Python only as an explicit escape hatch when no deterministic command exists.
- Prefer project-local wrappers over copied command snippets.

## Knowledge flow
Session output -> `diary/` -> `docs/learnings/` -> checks/docs propagation.
A review is not complete until the same class of issue is harder to reintroduce.

## Read order
1. `README.md`
2. `docs/_core/` (if present)
3. `docs/project/`
4. `docs/decisions/` (if present)
5. `docs/learnings/`
6. `docs/tech-stack.local.md` (if present)
7. `diary/`
8. relevant scripts and source entrypoints
