from __future__ import annotations

import os
import re
import subprocess
from pathlib import Path
from urllib.parse import urlparse

from rocs_cli.errors import RocsCliError


def workspace_root_from_env() -> Path | None:
    raw = (os.environ.get("ROCS_WORKSPACE_ROOT") or "").strip()
    if not raw:
        return None
    return Path(raw).expanduser().resolve()


def workspace_ref_mode_from_env() -> str | None:
    raw = (os.environ.get("ROCS_WORKSPACE_REF_MODE") or "").strip().lower()
    if raw in ("strict", "loose"):
        return raw
    return None


def workspace_repo_candidates(workspace_root: Path, project_path: str) -> list[Path]:
    pp = project_path.strip().strip("/")
    if not pp:
        return []

    parts = [p for p in pp.split("/") if p]
    candidates: list[Path] = []

    candidates.append((workspace_root / Path(*parts)).resolve())
    if len(parts) >= 2:
        candidates.append((workspace_root / Path(*parts[1:])).resolve())

    out: list[Path] = []
    seen: set[Path] = set()
    for c in candidates:
        if c in seen:
            continue
        seen.add(c)
        out.append(c)
    return out


_SCP_LIKE_RE = re.compile(r"^(?P<user>[^@]+)@(?P<host>[^:]+):(?P<path>.+)$")


def _project_path_from_remote_url(remote_url: str) -> str | None:
    """
    Extract a GitLab-style `<group>/<subgroup>/<repo>` from common Git remote URL forms:
    - https://host/group/subgroup/repo(.git)
    - http://host/group/subgroup/repo(.git)
    - ssh://git@host/group/subgroup/repo(.git)
    - git@host:group/subgroup/repo(.git)
    """
    raw = (remote_url or "").strip()
    if not raw:
        return None

    try:
        u = urlparse(raw)
    except Exception:
        return None

    if u.scheme in ("http", "https", "ssh"):
        path = (u.path or "").lstrip("/")
        if path.endswith(".git"):
            path = path[: -len(".git")]
        return path or None

    # SCP-like form, e.g. git@host:group/subgroup/repo.git
    # Only attempt this when no URL scheme is present.
    if "://" not in raw:
        m = _SCP_LIKE_RE.match(raw)
        if m:
            path = m.group("path").lstrip("/")
            if path.endswith(".git"):
                path = path[: -len(".git")]
            return path or None

    return None


def _origin_project_path(repo_root: Path) -> str | None:
    url = _git(repo_root, ["config", "--get", "remote.origin.url"])
    return _project_path_from_remote_url(url or "")


def pick_workspace_repo_root(
    workspace_root: Path,
    project_path: str,
    *,
    require_origin_match: bool = True,
) -> Path | None:
    existing = [p for p in workspace_repo_candidates(workspace_root, project_path) if p.exists() and p.is_dir()]
    if not existing:
        return None

    git_repos: list[Path] = []
    for repo in existing:
        if not (repo / ".git").exists():
            continue
        git_repos.append(repo)

    if not git_repos:
        return None

    if not require_origin_match:
        for candidate in workspace_repo_candidates(workspace_root, project_path):
            if candidate in git_repos:
                return candidate
        return None

    matching: list[Path] = []
    for repo in git_repos:
        origin_pp = _origin_project_path(repo)
        if origin_pp == project_path:
            matching.append(repo)

    if not matching:
        return None
    if len(matching) == 1:
        return matching[0]

    raise RocsCliError(
        kind="config",
        message=f"workspace mapping is ambiguous for {project_path!r} under {workspace_root}",
        details={"workspace_root": str(workspace_root), "project_path": project_path, "candidates": [str(p) for p in matching]},
    )


def origin_matches_project_path(repo_root: Path, project_path: str) -> bool:
    """Test helper: true if `remote.origin.url` parses to `project_path`."""
    return _origin_project_path(repo_root) == project_path


def workspace_repo_exists(workspace_root: Path, project_path: str) -> bool:
    """Test helper: true if a workspace repo directory exists (git or not)."""
    return any(p.exists() and p.is_dir() for p in workspace_repo_candidates(workspace_root, project_path))



def _git(repo_root: Path, args: list[str]) -> str | None:
    try:
        r = subprocess.run(
            ["git", "-C", str(repo_root), *args],
            check=False,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
        )
    except FileNotFoundError as e:
        raise RocsCliError(kind="config", message="git is required for workspace ref checks but was not found") from e
    if r.returncode != 0:
        return None
    return (r.stdout or "").strip()


def git_head_sha(repo_root: Path) -> str | None:
    return _git(repo_root, ["rev-parse", "--verify", "HEAD^{commit}"])


def git_rev_sha(repo_root: Path, ref: str) -> str | None:
    ref = ref.strip()
    if not ref:
        return None
    # Harden: never treat dash-prefixed strings as revisions.
    if ref.startswith("-"):
        return None
    return _git(repo_root, ["rev-parse", "--verify", f"{ref}^{{commit}}"])
