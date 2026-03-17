---
summary: "Minimal ROCS CLI for ai-society, including commands, ref resolution, and CI profile behavior."
read_when:
  - "When using or vendoring rocs-cli"
  - "When checking supported commands or CI wrapper behavior"
---

# rocs-cli

Minimal ROCS CLI for ai-society.

Commands:
- `rocs version`
- `rocs rules [--json]`
- `rocs explain <rule_id> [--json]`
- `rocs resolve --repo . [--profile <name>] [--resolve-refs] [--json]`
- `rocs summary --repo . [--json]`
- `rocs validate --repo . [--profile <name>] [--resolve-refs] [--strict-placeholders] [--ruleset dev|strict]`
- `rocs validate --repo . [--validate-deps]` (optional: enforce strict schema on ref layers too)
- `rocs validate --repo . --only path|ref --layer <name>`
- `rocs diff --repo . --baseline <repo:...@ref> --resolve-refs [--profile <name>]`
- `rocs lint --repo . [--fail-on-warn] [--ruleset dev|strict]`
- `rocs check-inverses --repo . [--fix]`
- `rocs graph --repo . [--relation is_a] [--format excalidraw|excalidraw-cli-json|dot] [--json] [--out <path>]`
- `rocs cache dir|ls|prune|clear`
- `rocs normalize --repo . [--apply]`
- `rocs pack <ont_id> --repo . [--profile <name>] [--resolve-refs] [--json]` (`<ont_id>` may be a concept or relation id)
- `rocs build --repo . [--profile <name>] [--resolve-refs] [--clean] [--json]` (fail-closed: refuses invalid ontology content)

Scope (MVP):
- Validate ROCS repo structure + ontology front matter schema.
- Build local artifacts into `ontology/dist/`.
- Emit `ontology/dist/authority-receipt.json` plus per-command `authority-receipt.<command>.json` artifacts for `build`/`validate` runs so CI/local consumers can see authority mode and per-layer resolution sources without losing multi-step evidence.
- Resolve layered ontology refs from a local workspace first; legacy GitLab fetch remains compatibility-only.

Layer refs (optional):
- Prefer local-first locators: `<repo:<workspace-relative-project-path>@<ref>>`
  - example: `<repo:core/ontology-kernel@main>`
  - example: `<repo:softwareco/ontology@main>`
- Legacy locators are still supported: `<gitlab:<project_path>@<ref>>`
- `--resolve-refs` enables resolving ref layers.
- Resolution precedence:
  1) workspace clone (offline)
  2) cache (offline)
  3) legacy GitLab fetch (network; legacy `<gitlab:...>` locators only)
- Workspace config:
  - `--workspace-root <path>` (or `ROCS_WORKSPACE_ROOT`): workspace root containing local clones (recommended: `~/ai-society`).
  - `--workspace-ref-mode strict|loose` (or `ROCS_WORKSPACE_REF_MODE`):
    - `strict` (default): use workspace only if `HEAD` matches the requested ref
    - `loose`: use workspace checkout even if it doesn’t match the requested ref
  - `repo:` locators bind by workspace layout, not remote origin URL.
  - legacy `gitlab:` locators still require origin-path identity hardening before using a workspace clone.
- Diagnostics:
  - `--show-resolve-sources` adds `(source=workspace|cache|gitlab|path)` to `rocs resolve` / `rocs summary` text output.
  - `--show-resolve-details` adds workspace skip reasons in text output and includes per-layer `details` in JSON output.
- Selector contract:
  - Explicit selectors fail closed. If `--layer` names no declared layer, or `--only`/`--layer` together match nothing, commands return a non-zero error instead of silently operating on zero layers.
  - Each `rocs.layers[]` entry must declare exactly one of `path` or `ref`; mixed entries are rejected instead of silently preferring one.
- Dotenv loading (so you don’t need to `export` vars):
  - Highest priority: pass `--env-file <path>`.
  - Otherwise `rocs` auto-loads the first existing file from:
    - `ROCS_ENV_FILE`
    - `<repo>/.env` (where `<repo>` is `--repo`)
    - `holdingco/governance-kernel/.env` (when running inside the ai-society workspace)
- Cache location: `ROCS_CACHE_DIR` or `$XDG_CACHE_HOME/rocs` or `~/.cache/rocs`.
- Incremental doc/index cache (local-only): enabled by default; disable with `rocs --no-index-cache ...` or `ROCS_INDEX_CACHE=0`. Debug with `rocs --index-cache-debug ...` or `ROCS_INDEX_CACHE_DEBUG=1`.
- Cache integrity: each fetched ref writes a completion marker `.rocs_cache_ok.json`; entries missing the marker are treated as incomplete and re-fetched. A per-ref lock file prevents concurrent writers.
- Legacy GitLab config: `ROCS_GITLAB_BASE_URL` (or `GITLAB_BASE_URL`) and `ROCS_GITLAB_TOKEN` (or `PAT_GITLAB`).
- In legacy GitLab CI, base url falls back to `CI_SERVER_URL`; auth can use `CI_JOB_TOKEN`.

Examples:
- `rocs resolve --repo . --resolve-refs --workspace-root ~/ai-society --workspace-ref-mode strict --show-resolve-sources`
- `rocs summary --repo . --resolve-refs --workspace-root ~/ai-society --json`
- `rocs diff --repo . --baseline <repo:core/ontology-kernel@main> --resolve-refs --workspace-root ~/ai-society`

AI Society convention (recommended):
- Set `ROCS_WORKSPACE_ROOT=~/ai-society`.
- Use `<repo:core/ontology-kernel@main>` and `<repo:softwareco/ontology@main>` in manifests for local-first layered repos.
- Keep legacy `<gitlab:...>` locators only when you explicitly still need remote archive fallback.

Graph export:
- `rocs graph` writes an `.excalidraw.json` file by default (open it in Excalidraw).
- For `excalidraw-cli` (external): use `--format excalidraw-cli-json`, then run `excalidraw-cli create <file> -o graph.excalidraw`.

Tests:
- `uv run python -m unittest discover -s tests -p 'test_*.py' -q`

CI profile wrapper (template-side policy contract):
- Script: `scripts/ci/full.sh`
- Profiles via `ROCS_CI_PROFILE=local-dev|branch-ci|main-strict`
  - `local-dev`: offline-first default; set `ROCS_LOCAL_RESOLVE_REFS=1` to force strict ref checks locally
  - `branch-ci`: requires `--resolve-refs` (fail-closed)
  - `main-strict`: requires `--resolve-refs` (authoritative fail-closed gate)
- Timeout contract in the wrapper:
  - `branch-ci`: `ROCS_GITLAB_TIMEOUT_S=30`, `ROCS_GITLAB_RETRIES=3`
  - `main-strict`: `ROCS_GITLAB_TIMEOUT_S=60`, `ROCS_GITLAB_RETRIES=3`
- See `docs/ref-resolution-ci-strategy.md` for the architecture/policy rationale and migration guidance.
- Optional overrides:
  - `ROCS_CMD` (default: `uv run python -m rocs_cli`)
  - `ROCS_REPO` (default: `.`)
  - `ROCS_PROFILE` (optional manifest profile)

FCOS convergence scripts:
- `scripts/vendor-to.sh <target> [--version X.Y.Z] [--dry-run]`
  - syncs `pyproject.toml`, `README.md`, and `src/rocs_cli/` into `<target>`
  - writes/updates `<target>/VENDORED_HASHES.json` (hash coverage includes all files under `src/rocs_cli/`)
  - refuses targets that overlap the source repo root or the source package tree
  - `--dry-run` uses the same preflight validation as apply mode
- `scripts/bootstrap-repo.sh <target> --class required|optional|ontology_repo [--dry-run]`
  - class-based FCOS bootstrap (vendored `rocs-cli`, ontology scaffold, CI gate wiring)
  - installs `scripts/ci/full.sh` and generates CI snippets that call it via explicit `ROCS_CI_PROFILE`
  - merges existing `.gitlab-ci.yml` includes structurally (fails closed on invalid YAML instead of text-splicing)
  - emits a deterministic JSON report with `rollback_paths`
  - `--dry-run` validates and reports without writing files
- `scripts/audit-fleet.py --workspace-root <path> --policy <fleet-state.yaml> [--json [PATH]] [--markdown [PATH]] [--report-only]`
  - audits each policy ledger entry against observed capabilities (`rocs_cli_vendored`, `ontology_manifest`, `rocs_ci_gate`)
  - `rocs_ci_gate` checks parsed CI YAML/script nodes (`gitlab/ci/rocs.yml` + include + `scripts/ci/full.sh` + explicit `ROCS_CI_PROFILE` call); comments do not count as evidence
  - emits deterministic JSON/Markdown scorecards (stdout when PATH omitted)
  - stable exit codes: `0` pass, `2` required capability violations, `1` policy/usage error

YAML tooling (optional, for shell-level policy inspection):
- Runtime YAML parsing in `rocs-cli` is already provided by `pyyaml`.
- Install CLI helpers via extras: `uv sync --extra tooling`
- Run query helper: `uv run --extra tooling yq --version`

Perf harness (synthetic, offline):
- `uv run python scripts/bench.py --cmd build --n-concepts 600 --runs 7 --out artifacts/perf/bench.json`
  - CI runs this as a non-gating job (artifact for trend visibility; allow_failure).

Exit codes:
- `0`: success
- `1`: error (invalid config/usage; schema/validation errors; malformed ontology content; internal errors)
- `2`: action required / partial success (e.g. `rocs normalize` changes needed; `rocs diff` breaking removals detected; `rocs pack` unknown ont_id)

JSON output:
- Prefer `--json` for machine output.
- When JSON output is selected, errors are emitted as `{"ok": false, "error": {...}}` and the process exits non-zero.

Lint (ruff):
- Tool pins: `scripts/tool_versions.json`
- Run: `uvx ruff==$(python -c 'import json; print(json.load(open(\"scripts/tool_versions.json\"))[\"ruff\"])') check .`

Type checking:
- Prefer `ty` (Astral). See `docs/ty.md`.

VHS recordings (documentation by recorded behavior):
- Install `vhs` (and its deps: `ttyd`, `ffmpeg`), then run: `core/rocs-cli/scripts/vhs-run.sh`
- Outputs land in `core/rocs-cli/artifacts/vhs/` (gitignored); share the `.gif` when reporting behavior regressions.
