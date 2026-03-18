---
summary: "Learning note on keeping invariant evidence provenance additive under the existing sub-signal contract."
read_when:
  - "When changing invariant evidence provenance or report semantics"
  - "When deciding whether a new evidence/report authority is actually necessary"
type: "explanation"
---

# Additive evidence provenance modes

## Context
`#180` already decomposed invariant evidence into named sub-signals under `behaviorClaims[].evidenceSummary`.
`#181` needed to show whether that support was explicit, inferred, or missing without inventing a second summary tree.

## Discovery
The cleanest contract was to extend each existing sub-signal rather than introduce a parallel provenance object.
Adding `mode` plus a short `modeReason` to the current `subSignals[]` surface kept the model additive and let every downstream surface project from the same artifact truth.

That also clarified a useful split:
- focused-test support is **explicit** only when `requiredTestPatterns` directly target the tests
- focused-test support is **inferred** when deterministic path/name/selector hints align the tests
- support is **missing** when that class of evidence is absent
- direct artifact evidence like coverage, mutation, and changed-function mapping stays **explicit** when present

## Evidence
- extended `behaviorClaims[].evidenceSummary.subSignals[]` with additive provenance fields
- rendered `mode` and `modeReason` in `report.md` and `explain.txt`
- propagated a concise provenance summary into invariant-risk policy findings so downstream trust decisions can see the same evidence basis
- added regression coverage for heuristic alignment, explicit `requiredTestPatterns`, and CLI rendering

## Application
When a deterministic evidence system already has a stable additive root, provenance usually belongs on the existing leaves instead of in a second authority.
That keeps artifacts, reports, and downstream findings in projection mode instead of turning them into competing reasoning systems.

## TIP Candidate
Yes. This pattern should generalize to other evidence-native tools that need to distinguish direct support from deterministic inference without breaking artifact compatibility.
