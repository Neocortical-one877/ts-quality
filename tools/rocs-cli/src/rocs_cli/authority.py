from __future__ import annotations

import contextlib
import json
import os
from pathlib import Path
from typing import TYPE_CHECKING

from rocs_cli import __version__
from rocs_cli.errors import RocsCliError
from rocs_cli.layers import dist_dir, parse_ref_locator
from rocs_cli.workspace import workspace_ref_mode_from_env

if TYPE_CHECKING:
    from rocs_cli.layers import LayerSpec


_AUTHORITY_RECEIPT = "authority-receipt.json"
_COMMAND_RECEIPT_FMT = "authority-receipt.{command}.json"


@contextlib.contextmanager
def _receipt_lock(lock_path: Path):
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    with lock_path.open("a+", encoding="utf-8") as f:
        f.seek(0)
        if f.read(1) == "":
            f.seek(0)
            f.write("\0")
            f.flush()
        f.seek(0)
        locked = False
        try:
            if os.name == "nt":
                import msvcrt  # noqa: PLC0415

                msvcrt.locking(f.fileno(), msvcrt.LK_LOCK, 1)
                locked = True
            else:
                import fcntl  # noqa: PLC0415

                fcntl.flock(f.fileno(), fcntl.LOCK_EX)
                locked = True
        except Exception:
            locked = False
        try:
            yield
        finally:
            if locked:
                try:
                    f.seek(0)
                    if os.name == "nt":
                        import msvcrt  # noqa: PLC0415

                        msvcrt.locking(f.fileno(), msvcrt.LK_UNLCK, 1)
                    else:
                        import fcntl  # noqa: PLC0415

                        fcntl.flock(f.fileno(), fcntl.LOCK_UN)
                except Exception:
                    pass


def effective_workspace_ref_mode(explicit_mode: str | None) -> str:
    mode = (explicit_mode or workspace_ref_mode_from_env() or "strict").strip().lower()
    if mode not in ("strict", "loose"):
        raise RocsCliError(kind="usage", message="--workspace-ref-mode must be strict|loose")
    return mode


def can_write_authority_receipt(repo_root: Path) -> bool:
    return repo_root.exists() and (repo_root / "ontology").exists()


def authority_receipt_path(repo_root: Path) -> Path:
    return dist_dir(repo_root) / _AUTHORITY_RECEIPT


def command_authority_receipt_path(repo_root: Path, command: str) -> Path:
    safe = command.strip().lower()
    if not safe:
        raise RocsCliError(kind="usage", message="authority receipt command must not be empty")
    return dist_dir(repo_root) / _COMMAND_RECEIPT_FMT.format(command=safe)


def _ci_profile() -> str | None:
    raw = (os.environ.get("ROCS_CI_PROFILE") or "").strip()
    return raw or None


def _locator_kind(layer_spec: LayerSpec) -> str:
    if layer_spec.kind != "ref":
        return "path"
    parsed = parse_ref_locator(layer_spec.origin)
    if parsed is None:
        return "ref"
    return parsed[0]


def _error_payload(error: RocsCliError | None) -> dict | None:
    if error is None:
        return None
    payload: dict[str, object] = {"kind": error.kind, "message": error.message}
    if error.details:
        payload["details"] = error.details
    return payload


def _authority_mode(
    *,
    ok: bool,
    resolve_refs_requested: bool,
    workspace_ref_mode: str,
    layers: list[LayerSpec],
    error: RocsCliError | None,
) -> str:
    ref_layers = [layer for layer in layers if layer.kind == "ref"]
    if error is not None and not ok:
        return "error"
    if not resolve_refs_requested:
        return "local_only"
    if not ref_layers:
        return "no_ref_layers"
    if workspace_ref_mode == "loose" and any(layer.source == "workspace" for layer in ref_layers):
        return "best_effort_workspace_loose"
    return "strict_ref_resolution"


def authority_receipt_payload(
    repo_root: Path,
    *,
    command: str,
    ok: bool,
    profile: str | None,
    resolve_refs_requested: bool,
    workspace_ref_mode: str,
    layers: list[LayerSpec],
    result: dict | None = None,
    error: RocsCliError | None = None,
) -> dict:
    ci_profile = _ci_profile()
    layer_sources: list[dict[str, str]] = []
    locator_kinds: set[str] = set()
    ref_layers_present = False
    ref_layer_count = 0
    legacy_gitlab_fallback_used = False
    loose_workspace_ref_layers_used = 0

    for layer_spec in sorted(layers, key=lambda x: x.name):
        locator_kind = _locator_kind(layer_spec)
        if layer_spec.kind == "ref":
            ref_layers_present = True
            ref_layer_count += 1
            if layer_spec.source == "workspace" and workspace_ref_mode == "loose":
                loose_workspace_ref_layers_used += 1
        if layer_spec.source == "gitlab":
            legacy_gitlab_fallback_used = True
        locator_kinds.add(locator_kind)
        layer_sources.append(
            {
                "name": layer_spec.name,
                "kind": layer_spec.kind,
                "locator_kind": locator_kind,
                "origin": layer_spec.origin,
                "source": layer_spec.source,
            }
        )

    authority_mode = _authority_mode(
        ok=ok,
        resolve_refs_requested=resolve_refs_requested,
        workspace_ref_mode=workspace_ref_mode,
        layers=layers,
        error=error,
    )

    payload: dict[str, object] = {
        "schema_version": 2,
        "version": __version__,
        "command": command,
        "ok": ok,
        "repo": str(repo_root),
        "profile": profile,
        "ci_profile": ci_profile,
        "authority_mode": authority_mode,
        "authoritative": authority_mode == "strict_ref_resolution",
        "resolve_refs_requested": resolve_refs_requested,
        "workspace_ref_mode": workspace_ref_mode,
        "ref_layers_present": ref_layers_present,
        "ref_layer_count": ref_layer_count,
        "loose_workspace_ref_layers_used": loose_workspace_ref_layers_used,
        "layer_sources": layer_sources,
        "locator_kinds_present": sorted(locator_kinds),
        "legacy_gitlab_fallback_used": legacy_gitlab_fallback_used,
    }
    if result:
        payload["result"] = result
    err = _error_payload(error)
    if err is not None:
        payload["error"] = err
    return payload


def write_authority_receipt(repo_root: Path, payload: dict) -> dict[str, Path]:
    command = str(payload.get("command") or "").strip().lower()
    if not command:
        raise RocsCliError(kind="usage", message="authority receipt payload missing command")

    dist = dist_dir(repo_root)
    dist.mkdir(parents=True, exist_ok=True)

    command_out = command_authority_receipt_path(repo_root, command)
    aggregate_out = authority_receipt_path(repo_root)
    lock_path = dist / ".authority-receipt.lock"

    with _receipt_lock(lock_path):
        command_out.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", "utf-8")

        aggregate_across_commands = (os.environ.get("ROCS_AUTHORITY_AGGREGATE") or "").strip() == "1"
        existing_commands: dict[str, object] = {}
        existing_files: dict[str, str] = {}
        if aggregate_across_commands and aggregate_out.exists():
            try:
                existing = json.loads(aggregate_out.read_text("utf-8"))
            except Exception:
                existing = None
            if isinstance(existing, dict) and existing.get("schema_version") == 2:
                cmds = existing.get("commands")
                if isinstance(cmds, dict):
                    existing_commands = {str(k): v for k, v in cmds.items()}
                files = existing.get("command_files")
                if isinstance(files, dict):
                    existing_files = {str(k): str(v) for k, v in files.items()}
        else:
            for stale in dist.glob("authority-receipt.*.json"):
                if stale.name == command_out.name:
                    continue
                stale.unlink(missing_ok=True)

        existing_commands[command] = payload
        existing_files[command] = command_out.name

        aggregate_payload = {
            "schema_version": 2,
            "version": __version__,
            "repo": str(repo_root),
            "last_command": command,
            "command_files": {k: existing_files[k] for k in sorted(existing_files)},
            "commands": {k: existing_commands[k] for k in sorted(existing_commands)},
        }
        aggregate_out.write_text(json.dumps(aggregate_payload, indent=2, sort_keys=True) + "\n", "utf-8")
    return {"aggregate": aggregate_out, "command": command_out}
