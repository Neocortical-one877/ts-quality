---
summary: "Project vision for ts-quality after invariant evidence summaries landed."
read_when:
  - "When aligning long-term direction for ts-quality"
  - "When deciding what kind of evidence/report work belongs in this repo"
type: "reference"
---

# Vision: ts-quality

## Why this file exists now
`ts-quality` already has the right architecture shape: evidence, mutation, invariants, governance, and legitimacy all exist as deterministic layers.
What was missing was a clear project-level statement of where the next wave is going after `#179` landed.
The next tasks (`#180` and `#181`) imply a more specific destination than "better invariant checks".
They point toward a product that makes the basis of trust inspection explicit, decomposed, and reviewable.

## North star
`ts-quality` should become an **evidence-native trust platform** for software change.
A reviewer should be able to look at one run and answer, without guesswork:

- what evidence is **explicit**
- what evidence is **inferred**
- what evidence is **missing**
- which invariant is unsupported because of test alignment, scenario coverage, mutation pressure, or low coverage
- why the top-line verdict is what it is

The goal is not to make the product sound semantically magical.
The goal is to make it feel like a precise evidence debugger for change risk.

## Desired future state
In the intended end state:

- invariant support is broken into explicit sub-signals rather than hidden inside one blended status
- explicit and inferred evidence are visible as different modes, not silently mixed together
- `run.json`, `report.md`, `explain.txt`, and related outputs all restate the same underlying evidence contract
- merge confidence remains downstream of explicit evidence rather than outranking it
- governance and legitimacy consume the same explainable evidence basis instead of inventing parallel truth

## Product properties this vision requires
- **Deterministic** — identical inputs must keep producing identical artifacts and verdicts
- **Additive-first** — evidence/report schema changes should extend existing contracts instead of silently replacing them
- **Explainable** — every claim must be traceable to concrete evidence in artifacts
- **Scoped** — focused tests and aligned evidence beat repo-global keyword coincidence
- **Operator-grade** — reports should end in specific evidence facts or missing obligations, not vague confidence theater

## Boundary
This vision is **not**:

- natural-language semantic proof
- repo-global keyword matching dressed up as understanding
- opaque learned scoring that cannot be inspected
- a company-wide workflow/control-plane product

This repo should improve its native evidence, invariant, governance, and legitimacy semantics.
It should not import foreign workflow doctrine just to make the surface sound more advanced.

## Implication for the next wave
The immediate architectural consequence is clear:

1. make invariant evidence more decomposed and explicit
2. mark explicit versus inferred evidence directly in the contract
3. keep that change additive across artifacts, reports, docs, and tests

That is the bridge from the current `#179` summary work into the next bounded task wave in `docs/project/tactical_goals.md`.

## THE ADDITION
Introduce an invariant evidence provenance ladder that labels every support signal as explicit, inferred, or missing and carries that same structure through artifacts, reports, and downstream trust decisions.

## WHY THIS, SPECIFICALLY
- Smartest: it strengthens the exact area the repo is already improving (`behaviorClaims[].evidenceSummary`) instead of inventing a second authority or a speculative new scoring layer.
- Innovative: it turns invariant support from a blended impression into a mode-aware provenance surface that reviewers can inspect directly.
- Accretive: once the ladder exists, every future invariant, report, governance rule, and legitimacy check can reuse the same clearer evidence basis.
- Useful: it immediately helps operators understand whether weak support comes from missing explicit tests, heuristic alignment only, low coverage, or mutation pressure.
- Compelling: it makes trust outputs easier to believe right now without requiring a reset of the existing architecture.

## PLAN/PROJECT FIT
- Current anchor point: additive extension of `behaviorClaims[].evidenceSummary` and the active `#180` / `#181` invariant-evidence wave.
- Brownfield compatibility: it attaches to the existing evidence model, invariant engine, report surfaces, and docs without replacing the current behavior-claim contract.
- Time-to-first-value: first payoff appears as soon as the next invariant artifact/report renders explicit sub-signals and explicit-vs-inferred mode labels.

## MINIMUM VIABLE INTRODUCTION
- First step: extend the invariant evidence summary/report contract so scenario support, focused-test alignment, coverage pressure, mutation pressure, and evidence mode are visible as named deterministic facts.
- Owner: repo maintainer working in the evidence-model / invariants / reporting layers.
- Validation signal: reviewers can inspect one run and tell which invariant evidence is explicit, which is inferred, and which is missing without reverse-engineering free-form prose.

## WHY NOT THE NEXT BEST ADDITION
The nearest alternative is adding smarter heuristic matching or another top-line confidence refinement, but that is weaker right now because it expands inference before the evidence basis itself becomes sufficiently legible.
