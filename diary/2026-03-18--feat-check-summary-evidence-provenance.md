---
summary: "Session capture for landing concise risky-invariant provenance in check-summary.txt via AK task #184."
read_when:
  - "When resuming after task #184"
  - "When reviewing how check-summary.txt stayed downstream of behaviorClaims[].evidenceSummary"
type: "diary"
---

# 2026-03-18 — check-summary provenance

## What I Did
- Read `next_session_prompt.md`, re-ran repo-local AK doctor/readiness, and claimed AK task `#184` (`ts-quality: project risky invariant provenance into check-summary.txt`).
- Audited the existing concise-output path and found that `check-summary.txt` was still emitted as a three-line status artifact even though `pr-summary.md`, `plan.txt`, and `govern.txt` already projected concise invariant provenance from the additive evidence authority.
- Extended the shared provenance block in `packages/ts-quality/src/index.ts` so `check-summary.txt` now appends the first at-risk invariant plus concise provenance from `behaviorClaims[].evidenceSummary` without introducing a second renderer authority.
- Kept `check-summary.txt` terse by omitting the obligation line there while leaving the richer plan/govern projections unchanged.
- Added an end-to-end assertion in `test/cli-integration.test.mjs`, rebuilt `dist/`, completed AK task `#184`, and refreshed the direction/handoff docs so the next ready slice is `#187`.

## What Surprised Me
- The smallest truthful change was not in policy evaluation at all; the repo already had the right concise provenance projection helper, so the gap was simply that `check-summary.txt` had never started using it.
- `check-summary.txt` needed a slightly different terseness contract than `plan.txt`/`govern.txt`: provenance yes, obligation no.

## Patterns
- When multiple operator surfaces need the same evidence framing, reuse the same projection helper and vary only the terseness knobs instead of cloning logic.
- A concise status artifact can stay honest by projecting the first at-risk invariant and a short provenance rollup without trying to duplicate the full report.
- After an AK dependency gate lands, refresh the queue docs immediately so the next slice is obvious and repo-local docs do not lag behind AK truth.

## Candidates Deliberately Excluded
- Trend output changes: deferred to AK `#187`, which is now the next ready slice.
- Sample-artifact / README changes: deferred to AK `#185`.
- Dedicated regression/golden coverage expansion: deferred to AK `#186`; this session only added the smallest end-to-end proof needed for `#184`.
