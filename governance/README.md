---
summary: "Planning-model contract for the repo-local governance work-items projection."
read_when:
  - "When validating governance/work-items.json"
  - "When deciding whether work belongs in the repo-local planning model"
type: "reference"
---

# Project Work Items

`governance/work-items.json` is the project-local planning model for this repository.

## Purpose

- Scope: **single repo** (features, bugs, improvements)
- Authority: planning/coordination
- Operational status: **non-operational** (no scheduler)

Use this when work is local to this repo. Use L0/FCOS programs when work spans repos.

## Contract (must stay aligned)

- Schema: `governance/work-items.cue`
- Seed model: `governance/work-items.json`

Core fields:
- `schema_version`
- `updated_at`
- `owner`
- `project_name`
- `milestones[]`

Issue state machine:
- `triage -> queued -> doing -> review -> done`

## Validation

```bash
cue vet governance/work-items.json governance/work-items.cue
```

## Use this vs alternatives

| Use this file when | Use alternative when |
|---|---|
| Work is repo-local and needs milestone/issue/task structure | Work spans multiple repos/programs (use FCOS/L0 program models) |
| You need deterministic schema checks | You only need lightweight conversational triage (use issues/notes) |

## Non-negotiable

Do not leave deferred work as ad-hoc comments or scattered markdown notes.
Track deferred work in the authoritative work-items model.
