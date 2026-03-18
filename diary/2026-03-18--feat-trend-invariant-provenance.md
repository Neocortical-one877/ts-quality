---
summary: "Session capture for landing concise risky-invariant provenance in trend output via AK task #187."
read_when:
  - "When resuming after task #187"
  - "When reviewing how trend stayed downstream of behaviorClaims[].evidenceSummary"
type: "diary"
---

# 2026-03-18 — trend invariant provenance

## What I Did
- Read `next_session_prompt.md`, re-ran repo-local AK doctor/readiness, and claimed AK task `#187` (`ts-quality: surface risky invariant context in trend output`).
- Audited `packages/ts-quality/src/index.ts` and confirmed the remaining concise run-status gap was isolated to `renderTrend()`, while the provenance projection helper already existed and was shared by other operator surfaces.
- Extended `renderTrend()` so it still prints the numeric delta lines, then appends the first at-risk invariant plus concise provenance from `behaviorClaims[].evidenceSummary` when the latest run is risky.
- Kept `trend` terse by reusing the shared provenance block with `includeObligation: false`, avoiding a second report authority and avoiding a more verbose governance-style appendix.
- Added an end-to-end CLI integration test that runs `check` twice, asserts `trend` still reports deltas, and verifies the latest risky-invariant provenance appears without an obligation line.
- Rebuilt `dist/`, ran repo verification, completed AK task `#187`, and refreshed the strategic/tactical/operating handoff docs so the next slice is `#185`.

## What Surprised Me
- The smallest truthful implementation was even narrower than expected: no policy or artifact model changes were needed because `trend` could reuse the same projection helper already trusted by `check-summary`, `plan`, and `govern`.
- Running `check` twice against the same fixture was enough to prove the trend contract; the important distinction was current-vs-previous run identity, not a different underlying risk profile.

## Patterns
- When a concise surface is still compressing too much, prefer projecting the same additive evidence root instead of inventing a surface-specific summary path.
- Terseness can stay honest by reusing one projection helper and toggling only whether extra explanatory lines like obligations belong on that surface.
- After the active tactical slice lands, immediately promote the next tactical goal in docs so repo-local planning does not lag AK state.

## Candidates Deliberately Excluded
- Sample-artifact / README alignment: deferred to AK `#185`, now the next ready slice.
- Additional regression hardening for `check-summary.txt`: deferred to AK `#186`; this session only added the smallest end-to-end proof needed for `trend`.
- Any new artifact/report authority beyond `behaviorClaims[].evidenceSummary`.
