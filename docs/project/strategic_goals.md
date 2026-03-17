---
summary: "Strategic goals for ts-quality after #179 established invariant-scoped evidence summaries."
read_when:
  - "When deciding the next quarter-scale direction for ts-quality"
  - "When translating the vision into bounded delivery waves"
type: "reference"
---

# Strategic goals

## Why this file exists now
The repo already proved an important direction with `#179`: invariant evidence can be made more explicit without breaking the core artifact shape.
That matters because the product's credibility depends less on new headline scores and more on whether the existing evidence basis becomes inspectable.
These goals define the next durable bridge between the project vision and the active tactical queue.

## Strategic goals

### SG1 — Make invariant evidence first-class, decomposed, and mode-aware
The current artifact surface now has `behaviorClaims[].evidenceSummary`, but that summary still needs to grow from a compact rollup into a clearer evidence contract.
The active strategic move is to make invariant support legible as named sub-signals and to distinguish explicit evidence from inferred evidence instead of silently blending them.

Success signals:
- invariant evaluation exposes distinct evidence sub-signals instead of one opaque support impression
- explicit evidence and inferred evidence are represented as different modes in the artifact/report surface
- a reviewer can tell whether an invariant failed because of test alignment, scenario support, low coverage, or mutation pressure without reverse-engineering free-form prose
- changes stay additive-first and regression-tested rather than destabilizing existing artifacts

### SG2 — Keep every operator surface downstream of the same evidence truth
The repo already emits multiple surfaces: `run.json`, `report.md`, `pr-summary.md`, `explain.txt`, `plan.txt`, and governance/legitimacy outputs.
The next strategic move after SG1 is to make those surfaces easier to read while keeping them downstream of the same native evidence contract.

Success signals:
- runtime artifacts and rendered reports describe the same evidence facts with no silent divergence
- docs explain the same contract the code emits
- CLI/report improvements increase clarity without adding a second source of truth
- top-line verdicts stay subordinate to the underlying evidence basis rather than drifting into semantic theater

## Non-goals for the current strategic window
- natural-language semantic reasoning beyond deterministic evidence
- repo-global lexical matching as a substitute for aligned/focused tests
- another top-level report authority that competes with `run.json`
- company-root or workflow-platform expansion unrelated to this repo's native product layers

## Relationship to tactical goals
- `docs/project/tactical_goals.md` should currently decompose **SG1** into the next bounded reviewed wave
- if the active tactical goal completes, refresh the tactical layer from the next unfinished strategic goal instead of leaving placeholders behind
- `next_session_prompt.md` should point only at the real next starting point from that tactical queue
