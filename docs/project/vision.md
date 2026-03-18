---
summary: "Project vision for ts-quality after invariant evidence became mode-aware through #181."
read_when:
  - "When aligning long-term direction for ts-quality"
  - "When deciding what kind of evidence/report work belongs in this repo"
type: "reference"
---

# Vision: ts-quality

## Why this file exists now
`ts-quality` already has the right architecture shape: evidence, mutation, invariants, governance, and legitimacy all exist as deterministic layers.
The recent invariant-evidence wave (`#179` → `#181`) proved a more specific destination than "better invariant checks".
It points toward a product that makes the basis of trust inspection explicit, decomposed, reviewable, and consistently projected into operator-facing surfaces.

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
- concise operator surfaces like `pr-summary.md` restate the same underlying evidence truth without competing with `run.json`
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
The next architectural consequence is clear:

1. keep the additive invariant evidence contract canonical
2. push that same explicit/inferred/missing truth into remaining operator-facing projections
3. keep concise review surfaces downstream of `run.json` instead of inventing a second authority

That is the bridge from the completed SG1 evidence-contract wave into the next bounded SG2 task wave in `docs/project/tactical_goals.md`.

## THE ADDITION
Propagate the existing mode-aware invariant evidence contract into the remaining operator surfaces so reviewers can see the same provenance truth even in concise summaries.

## WHY THIS, SPECIFICALLY
- Smartest: it extends the exact authority the repo already hardened (`behaviorClaims[].evidenceSummary`) instead of inventing a second report model.
- Innovative: it makes fast review surfaces honest about whether support is explicit, inferred, or missing.
- Accretive: once the concise surfaces project the same truth, every future operator touchpoint can keep layering on top of the same contract.
- Useful: it helps reviewers trust quick summaries without forcing them to reverse-engineer full reports for provenance.
- Compelling: it improves usability now while keeping the architecture explainable.

## PLAN/PROJECT FIT
- Current anchor point: additive `behaviorClaims[].evidenceSummary` plus mode-aware `subSignals[]` under the completed `#179` → `#181` wave.
- Brownfield compatibility: follow-on work should stay downstream of the existing evidence model, invariant engine, report surfaces, and docs without replacing the behavior-claim contract.
- Time-to-first-value: the next payoff appears as soon as `pr-summary.md` and similar concise outputs can tell a reviewer whether the key invariant evidence is explicit, inferred, or missing.

## MINIMUM VIABLE INTRODUCTION
- First step: add a compact evidence-mode projection to the most common concise operator surface.
- Owner: repo maintainer working in the evidence-model / reporting layers.
- Validation signal: a reviewer can inspect one concise summary and still tell whether the riskiest invariant evidence is explicit, inferred, or missing.

## WHY NOT THE NEXT BEST ADDITION
The nearest alternative is another scoring refinement or heuristic upgrade, but that is weaker right now because the repo gets more value from carrying its newly clarified evidence truth consistently across surfaces than from introducing another headline abstraction.
