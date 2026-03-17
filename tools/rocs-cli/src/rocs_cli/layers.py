from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

import yaml

from rocs_cli.errors import RocsCliError
from rocs_cli.gitlab import (
    fetch_repo_archive,
    gitlab_base_url,
    gitlab_headers,
    gitlab_cache_complete_dest,
    gitlab_cache_is_complete,
)
from rocs_cli.workspace import (
    git_head_sha,
    git_rev_sha,
    workspace_repo_exists,
    pick_workspace_repo_root,
    workspace_ref_mode_from_env,
    workspace_root_from_env,
)


REF_LOCATOR_RE = re.compile(r"^<(repo|gitlab):([^@>]+)@([^>]+)>$")


@dataclass(frozen=True)
class LayerSpec:
    name: str
    src_root: Path
    origin: str  # path or ref locator
    kind: str  # path|ref
    source: str  # path|workspace|cache|gitlab


def repo_root(repo: str) -> Path:
    return Path(repo).resolve()


def ontology_root(repo_root: Path) -> Path:
    return repo_root / "ontology"


def manifest_path(repo_root: Path) -> Path:
    return ontology_root(repo_root) / "manifest.yaml"


def dist_dir(repo_root: Path) -> Path:
    return ontology_root(repo_root) / "dist"


def _require_mapping(value: object, *, where: str) -> dict:
    if not isinstance(value, dict):
        raise RocsCliError(kind="config", message=f"{where} must be a mapping")
    return value


def _require_optional_list(value: object, *, where: str) -> list:
    if value is None:
        return []
    if not isinstance(value, list):
        raise RocsCliError(kind="config", message=f"{where} must be a list")
    return value


def _require_layer_locator(cfg: dict, *, layer_name: str) -> tuple[str, str]:
    has_path = "path" in cfg
    has_ref = "ref" in cfg
    if has_path == has_ref:
        raise RocsCliError(
            kind="config",
            message=f"layer {layer_name!r} must declare exactly one of path or ref",
            details={"layer": layer_name, "layer_keys": sorted(str(k) for k in cfg.keys())},
        )
    key = "path" if has_path else "ref"
    return key, str(cfg[key])


def load_manifest(repo_root: Path) -> dict:
    p = manifest_path(repo_root)
    if not p.exists():
        raise RocsCliError(kind="config", message=f"missing ontology manifest: {p}", details={"path": str(p)})
    try:
        raw = yaml.safe_load(p.read_text("utf-8")) or {}
    except yaml.YAMLError as e:
        raise RocsCliError(kind="config", message=f"invalid ontology manifest YAML: {e}", details={"path": str(p)}) from e
    if not isinstance(raw, dict):
        raise RocsCliError(kind="config", message="ontology manifest root must be a mapping", details={"path": str(p)})
    return raw


def parse_ref_locator(locator: str) -> tuple[str, str, str] | None:
    m = REF_LOCATOR_RE.match(locator.strip())
    if not m:
        return None
    return m.group(1), m.group(2), m.group(3)


def parse_gitlab_ref(locator: str) -> tuple[str, str] | None:
    parsed = parse_ref_locator(locator)
    if not parsed or parsed[0] != "gitlab":
        return None
    return parsed[1], parsed[2]


def _repo_root_for_ref(
    locator: str,
    *,
    resolve_refs: bool,
    workspace_root: Path | None,
    workspace_ref_mode: str,
) -> tuple[Path, str, str, dict]:
    parsed = parse_ref_locator(locator)
    if not parsed:
        raise RocsCliError(
            kind="usage",
            message=f"invalid ref locator (expected <repo:...@...> or legacy <gitlab:...@...>): {locator!r}",
        )
    scheme, project_path, ref = parsed
    if not resolve_refs:
        raise RocsCliError(
            kind="offline-first",
            message=f"ref layer requires resolution: {locator} (rerun with --resolve-refs; local-first default keeps ref resolution explicit)",
        )

    notes: dict = {"scheme": scheme, "workspace": {"present": False, "used": False, "reason": None}}
    mismatch_details: dict | None = None
    require_origin_match = scheme == "gitlab"

    if workspace_root is not None:
        if workspace_repo_exists(workspace_root, project_path):
            notes["workspace"]["present"] = True
            mismatch_details = {
                "workspace_root": str(workspace_root),
                "workspace_ref_mode": workspace_ref_mode,
                "project_path": project_path,
                "requested_ref": ref,
                "require_origin_match": require_origin_match,
            }
        ws_repo_root = pick_workspace_repo_root(
            workspace_root,
            project_path,
            require_origin_match=require_origin_match,
        )
        if ws_repo_root is not None:
            if workspace_ref_mode == "loose":
                notes["workspace"]["used"] = True
                return ws_repo_root, locator, "workspace", notes

            head = git_head_sha(ws_repo_root)
            want = git_rev_sha(ws_repo_root, ref)
            mismatch_details = dict(mismatch_details or {})
            mismatch_details.update(
                {
                    "workspace_repo_root": str(ws_repo_root),
                    "head_sha": head,
                    "requested_sha": want,
                }
            )
            if head is not None and want is not None and head == want:
                notes["workspace"]["used"] = True
                return ws_repo_root, locator, "workspace", notes
            if workspace_ref_mode == "strict":
                notes["workspace"]["reason"] = "ref_mismatch"
        elif notes["workspace"]["present"]:
            notes["workspace"]["reason"] = "origin_mismatch" if require_origin_match else "not_git_repo"

    if gitlab_cache_is_complete(project_path, ref):
        repo = gitlab_cache_complete_dest(project_path, ref)
        if repo is None:
            raise RocsCliError(kind="internal", message=f"cache lookup drifted for {project_path!r}@{ref!r}")
        if notes["workspace"]["present"] and notes["workspace"]["reason"] is None:
            notes["workspace"]["reason"] = "not_used"
        return repo, locator, "cache", notes

    if scheme == "repo":
        details: dict = {
            "project_path": project_path,
            "requested_ref": ref,
        }
        if workspace_root is not None:
            details["workspace_root"] = str(workspace_root)
        message = (
            f"local ref not available in workspace/cache: {locator} "
            "(set --workspace-root / ROCS_WORKSPACE_ROOT and checkout the dependency repo locally)"
        )
        if mismatch_details and workspace_ref_mode == "strict":
            details["workspace_ref_mismatch"] = mismatch_details
            message = (
                f"local ref not available in workspace/cache: {locator} "
                f"(workspace ref mismatch in strict mode; checkout {ref!r} or use --workspace-ref-mode loose)"
            )
        raise RocsCliError(kind="not_found", message=message, details=details)

    try:
        repo = fetch_repo_archive(project_path, ref, base_url=gitlab_base_url(), headers=gitlab_headers())
        if notes["workspace"]["present"] and notes["workspace"]["reason"] is None:
            notes["workspace"]["reason"] = "not_used"
        return repo, locator, "gitlab", notes
    except RocsCliError as e:
        if mismatch_details and workspace_ref_mode == "strict":
            details = dict(e.details or {})
            details["workspace_ref_mismatch"] = mismatch_details
            raise RocsCliError(
                kind=e.kind,
                message=f"{e.message} (workspace ref mismatch in strict mode; checkout {ref!r} or use --workspace-ref-mode loose)",
                exit_code=e.exit_code,
                details=details,
            ) from None
        raise


def resolve_ref_repo_root(
    locator: str,
    *,
    resolve_refs: bool,
    workspace_root: str | Path | None = None,
    workspace_ref_mode: str | None = None,
) -> tuple[Path, str, dict]:
    if isinstance(workspace_root, str):
        ws_root = Path(workspace_root).expanduser().resolve()
    elif isinstance(workspace_root, Path):
        ws_root = workspace_root.expanduser().resolve()
    else:
        ws_root = workspace_root_from_env()

    ws_mode = (workspace_ref_mode or workspace_ref_mode_from_env() or "strict").strip().lower()
    if ws_mode not in ("strict", "loose"):
        raise RocsCliError(kind="usage", message="--workspace-ref-mode must be strict|loose")

    repo, _origin, source, notes = _repo_root_for_ref(
        locator,
        resolve_refs=resolve_refs,
        workspace_root=ws_root,
        workspace_ref_mode=ws_mode,
    )
    return repo, source, notes


def _src_root_for_ref(
    locator: str,
    *,
    resolve_refs: bool,
    workspace_root: Path | None,
    workspace_ref_mode: str,
) -> tuple[Path, str, str, dict]:
    repo, origin, source, notes = _repo_root_for_ref(
        locator,
        resolve_refs=resolve_refs,
        workspace_root=workspace_root,
        workspace_ref_mode=workspace_ref_mode,
    )
    return (repo / "ontology" / "src"), origin, source, notes


def resolve_layers(
    repo_root: Path,
    *,
    profile: str | None,
    resolve_refs: bool,
    workspace_root: str | None = None,
    workspace_ref_mode: str | None = None,
    only: str | None = None,
    layer: str | None = None,
) -> tuple[list[LayerSpec], dict]:
    manifest = load_manifest(repo_root)
    rocs_raw = manifest.get("rocs")
    rocs = _require_mapping(rocs_raw, where="manifest.rocs") if rocs_raw is not None else {}
    profiles_raw = rocs.get("profiles")
    profiles = _require_mapping(profiles_raw, where="manifest.rocs.profiles") if profiles_raw is not None else {}

    default_profile = profiles.get("default")
    if profile is None and isinstance(default_profile, str) and default_profile:
        profile = default_profile

    layer_cfgs: list[dict] = []
    layers_raw = rocs.get("layers")
    if layers_raw is not None:
        for x in _require_optional_list(layers_raw, where="manifest.rocs.layers"):
            if not isinstance(x, dict):
                raise RocsCliError(kind="config", message=f"manifest.rocs.layers entries must be mappings: {x!r}")
            layer_cfgs.append(x)
    else:
        # Back-compat: rocs.layer + depends_on list.
        deps = _require_optional_list(rocs.get("depends_on"), where="manifest.rocs.depends_on")
        for d in deps:
            if not isinstance(d, dict):
                raise RocsCliError(kind="config", message=f"manifest.rocs.depends_on entries must be mappings: {d!r}")
            if d.get("ref"):
                layer_cfgs.append({"name": str(d.get("layer") or ""), "ref": str(d.get("ref") or "")})
        self_name = str(rocs.get("layer") or "repo")
        layer_cfgs.append({"name": self_name, "path": "ontology/src"})

    include: set[str] | None = None
    exclude: set[str] = set()
    profile_def: dict | None = None
    if profile:
        profile_def = profiles.get(profile)
        if not isinstance(profile_def, dict):
            raise RocsCliError(
                kind="config",
                message=f"unknown profile {profile!r} (missing rocs.profiles.{profile})",
                details={"profile": profile},
            )
        inc = profile_def.get("include_layers")
        exc = profile_def.get("exclude_layers")
        if inc is not None:
            include = {str(x) for x in _require_optional_list(inc, where=f"manifest.rocs.profiles.{profile}.include_layers")}
        if exc is not None:
            exclude = {str(x) for x in _require_optional_list(exc, where=f"manifest.rocs.profiles.{profile}.exclude_layers")}

    if only is not None and only not in ("path", "ref"):
        raise RocsCliError(kind="usage", message="--only must be path|ref")

    declared_layer_names = {str(cfg.get("name") or "") for cfg in layer_cfgs if str(cfg.get("name") or "")}

    layers: list[LayerSpec] = []
    resolution_notes: dict[str, dict] = {}
    ws_root = Path(workspace_root).expanduser().resolve() if workspace_root else workspace_root_from_env()
    ws_mode = (workspace_ref_mode or workspace_ref_mode_from_env() or "strict").strip().lower()
    if ws_mode not in ("strict", "loose"):
        raise RocsCliError(kind="usage", message="--workspace-ref-mode must be strict|loose")
    for cfg in layer_cfgs:
        name = str(cfg.get("name") or "")
        if not name:
            raise RocsCliError(kind="config", message=f"layer missing name: {cfg!r}")
        locator_kind, locator_value = _require_layer_locator(cfg, layer_name=name)
        if layer and name != layer:
            continue
        if include is not None and name not in include:
            continue
        if name in exclude:
            continue

        if locator_kind == "path":
            if only == "ref":
                continue
            src_root = (repo_root / locator_value).resolve()
            layers.append(LayerSpec(name=name, src_root=src_root, origin=locator_value, kind="path", source="path"))
        else:
            if only == "path":
                continue
            src_root, origin, source, notes = _src_root_for_ref(
                locator_value,
                resolve_refs=resolve_refs,
                workspace_root=ws_root,
                workspace_ref_mode=ws_mode,
            )
            layers.append(LayerSpec(name=name, src_root=src_root, origin=origin, kind="ref", source=source))
            resolution_notes[name] = notes

    if layer and layer not in declared_layer_names:
        raise RocsCliError(
            kind="usage",
            message=f"unknown layer {layer!r} (declared layers: {sorted(declared_layer_names)})",
            details={"layer": layer, "declared_layers": sorted(declared_layer_names)},
        )

    if (profile is not None or only is not None or layer is not None) and not layers:
        details: dict[str, object] = {"profile": profile}
        if only is not None:
            details["only"] = only
        if layer is not None:
            details["layer"] = layer
        if include is not None:
            details["profile_include_layers"] = sorted(include)
        if exclude:
            details["profile_exclude_layers"] = sorted(exclude)
        raise RocsCliError(
            kind="not_found",
            message="layer selection matched no layers",
            details=details,
        )

    meta = {"manifest": manifest, "profile": profile, "profile_def": profile_def, "resolution_notes": resolution_notes}
    return layers, meta
