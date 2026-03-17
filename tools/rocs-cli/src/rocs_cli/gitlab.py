from __future__ import annotations

import base64
import contextlib
import json
import os
import shutil
import socket
import tarfile
import tempfile
import time
from collections.abc import Iterator
from pathlib import Path, PurePosixPath
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from rocs_cli.cache import cache_dir
from rocs_cli.errors import RocsCliError


_CACHE_MARKER = ".rocs_cache_ok.json"
_DEFAULT_MAX_ARCHIVE_BYTES = 200 * 1024 * 1024  # 200 MiB
_DEFAULT_MAX_FILE_BYTES = 50 * 1024 * 1024  # 50 MiB
_DEFAULT_MAX_EXTRACT_BYTES = 500 * 1024 * 1024  # 500 MiB
_DEFAULT_TIMEOUT_S = 30
_DEFAULT_RETRIES = 3
_DEFAULT_BACKOFF_S = 0.5


def load_env_file(path: Path, *, override: bool = False) -> None:
    """
    Minimal dotenv loader (KEY=VALUE). Used to support local workflows where `.env`
    is sourced without exporting variables.
    """
    if not path.exists():
        raise RocsCliError(kind="config", message=f"env file not found: {path}", details={"path": str(path)})
    for raw in path.read_text("utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        k, v = line.split("=", 1)
        k = k.strip()
        v = v.strip().strip('"').strip("'")
        if not k:
            continue
        if not override and k in os.environ:
            continue
        os.environ[k] = v


def gitlab_base_url() -> str:
    return (
        os.environ.get("ROCS_GITLAB_BASE_URL")
        or os.environ.get("GITLAB_BASE_URL")
        or os.environ.get("CI_SERVER_URL")
        or ""
    ).rstrip("/")


def gitlab_headers() -> dict[str, str]:
    tok = os.environ.get("ROCS_GITLAB_TOKEN") or os.environ.get("PAT_GITLAB") or ""
    if tok:
        return {"PRIVATE-TOKEN": tok}
    job = os.environ.get("CI_JOB_TOKEN") or ""
    if job:
        return {"JOB-TOKEN": job}
    return {}


def _int_env(name: str, default: int) -> int:
    raw = (os.environ.get(name) or "").strip()
    if not raw:
        return default
    try:
        v = int(raw)
    except ValueError:
        return default
    return v if v > 0 else default


def _float_env(name: str, default: float) -> float:
    raw = (os.environ.get(name) or "").strip()
    if not raw:
        return default
    try:
        v = float(raw)
    except ValueError:
        return default
    return v if v > 0 else default


def _cache_lock_path(dest: Path) -> Path:
    return dest.parent / f".{dest.name}.lock"


@contextlib.contextmanager
def _exclusive_lock(lock_path: Path) -> Iterator[None]:
    """
    Best-effort per-cache-key lock.

    WSL-first. If `fcntl` is unavailable, this becomes a no-op.
    """
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    with lock_path.open("a+", encoding="utf-8") as f:
        try:
            import fcntl  # noqa: PLC0415

            fcntl.flock(f.fileno(), fcntl.LOCK_EX)
        except Exception:
            pass
        yield


def _cache_is_complete(dest: Path, project_path: str, ref: str) -> bool:
    marker = dest / _CACHE_MARKER
    if not marker.exists():
        return False
    try:
        payload = json.loads(marker.read_text("utf-8"))
    except Exception:
        return False
    return payload.get("project_path") == project_path and payload.get("ref") == ref


def _write_cache_marker(dest: Path, project_path: str, ref: str) -> None:
    (dest / _CACHE_MARKER).write_text(
        json.dumps(
            {
                "project_path": project_path,
                "ref": ref,
                "schema": 1,
            },
            sort_keys=True,
        )
        + "\n",
        "utf-8",
    )


def _encode_cache_component(value: str) -> str:
    raw = value.encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=") or "_"


def _legacy_gitlab_cache_dest(project_path: str, ref: str) -> Path:
    safe_project = project_path.replace("/", "__")
    safe_ref = ref.replace("/", "__")
    return cache_dir() / "gitlab" / safe_project / safe_ref


def _gitlab_cache_dest_candidates(project_path: str, ref: str) -> list[Path]:
    primary = cache_dir() / "gitlab" / _encode_cache_component(project_path) / _encode_cache_component(ref)
    legacy = _legacy_gitlab_cache_dest(project_path, ref)
    out = [primary]
    if legacy != primary:
        out.append(legacy)
    return out


def gitlab_cache_dest(project_path: str, ref: str) -> Path:
    return _gitlab_cache_dest_candidates(project_path, ref)[0]


def gitlab_cache_complete_dest(project_path: str, ref: str) -> Path | None:
    for dest in _gitlab_cache_dest_candidates(project_path, ref):
        if dest.exists() and _cache_is_complete(dest, project_path, ref):
            return dest
    return None


def gitlab_cache_is_complete(project_path: str, ref: str) -> bool:
    return gitlab_cache_complete_dest(project_path, ref) is not None


def _validate_tar_member_name(name: str) -> PurePosixPath:
    if not name:
        raise RocsCliError(kind="security", message="unsafe GitLab archive member path: empty name")
    if "\x00" in name or "\\" in name:
        raise RocsCliError(kind="security", message=f"unsafe GitLab archive member path: {name!r}")
    p = PurePosixPath(name)
    if p.is_absolute() or any(part == ".." for part in p.parts):
        raise RocsCliError(kind="security", message=f"unsafe GitLab archive member path: {name!r}")
    return p


def _safe_extract_tar_gz(tar_path: Path, extract_root: Path) -> list[tarfile.TarInfo]:
    max_file_bytes = _int_env("ROCS_GITLAB_MAX_FILE_BYTES", _DEFAULT_MAX_FILE_BYTES)
    max_extract_bytes = _int_env("ROCS_GITLAB_MAX_EXTRACT_BYTES", _DEFAULT_MAX_EXTRACT_BYTES)
    extracted_total = 0

    extract_root.mkdir(parents=True, exist_ok=True)
    extract_root_resolved = extract_root.resolve()

    with tarfile.open(tar_path, "r:gz") as tf:
        members = tf.getmembers()
        for m in members:
            p = _validate_tar_member_name(m.name or "")

            if m.issym() or m.islnk():
                raise RocsCliError(kind="security", message=f"unsafe GitLab archive member (link): {m.name!r}")
            if not (m.isdir() or m.isfile()):
                raise RocsCliError(kind="security", message=f"unsafe GitLab archive member (type): {m.name!r}")
            if m.isfile():
                if m.size < 0 or m.size > max_file_bytes:
                    raise RocsCliError(
                        kind="security",
                        message=f"unsafe GitLab archive member (too large): {m.name!r} ({m.size} bytes)",
                    )
                extracted_total += m.size
                if extracted_total > max_extract_bytes:
                    raise RocsCliError(kind="security", message="GitLab archive extraction exceeds size limit")

            out_path = (extract_root / Path(*p.parts)).resolve()
            if not out_path.is_relative_to(extract_root_resolved):
                raise RocsCliError(kind="security", message=f"unsafe GitLab archive member path: {m.name!r}")

        # Second pass: extract after full validation so member order can't matter.
        for m in members:
            p = PurePosixPath(m.name)
            out_path = extract_root / Path(*p.parts)

            if m.isdir():
                out_path.mkdir(parents=True, exist_ok=True)
                continue

            out_path.parent.mkdir(parents=True, exist_ok=True)
            if out_path.exists():
                raise RocsCliError(kind="security", message=f"GitLab archive contains duplicate member: {m.name!r}")

            src = tf.extractfile(m)
            if src is None:
                raise RocsCliError(kind="security", message=f"failed to read GitLab archive member: {m.name!r}")
            with src, out_path.open("wb") as dst:
                shutil.copyfileobj(src, dst)

    return members


def _download_to_path(req: Request, dest: Path) -> None:
    timeout_s = _int_env("ROCS_GITLAB_TIMEOUT_S", _DEFAULT_TIMEOUT_S)
    retries = _int_env("ROCS_GITLAB_RETRIES", _DEFAULT_RETRIES)
    max_bytes = _int_env("ROCS_GITLAB_MAX_ARCHIVE_BYTES", _DEFAULT_MAX_ARCHIVE_BYTES)
    backoff_s = _float_env("ROCS_GITLAB_BACKOFF_S", _DEFAULT_BACKOFF_S)
    chunk = 64 * 1024

    last_http: int | None = None
    for attempt in range(1, retries + 1):
        try:
            with urlopen(req, timeout=timeout_s) as r:
                cl = (r.headers.get("Content-Length") or "").strip()
                if cl:
                    try:
                        n = int(cl)
                    except ValueError:
                        n = 0
                    if n > max_bytes:
                        raise RocsCliError(kind="network", message="GitLab archive exceeds download size limit")

                total = 0
                with dest.open("wb") as f:
                    while True:
                        buf = r.read(chunk)
                        if not buf:
                            break
                        total += len(buf)
                        if total > max_bytes:
                            raise RocsCliError(kind="network", message="GitLab archive exceeds download size limit")
                        f.write(buf)
            return
        except HTTPError as e:
            last_http = int(getattr(e, "code", 0) or 0)
            if last_http in (401, 403):
                raise RocsCliError(
                    kind="auth",
                    message=f"GitLab auth failed (HTTP {last_http}); set ROCS_GITLAB_TOKEN/PAT_GITLAB or CI_JOB_TOKEN",
                ) from None
            if last_http == 404:
                raise RocsCliError(
                    kind="not_found",
                    message="GitLab archive not found (HTTP 404); check project path/ref and permissions",
                ) from None
            if 400 <= last_http < 500:
                raise RocsCliError(kind="network", message=f"GitLab request failed (HTTP {last_http})") from None
        except (URLError, TimeoutError, socket.timeout):
            pass

        if attempt < retries:
            time.sleep(backoff_s * (2 ** (attempt - 1)))

    if last_http is not None:
        raise RocsCliError(kind="network", message=f"GitLab request failed (HTTP {last_http})") from None
    raise RocsCliError(kind="network", message=f"GitLab request failed (timeout after {timeout_s}s)") from None


def fetch_repo_archive(project_path: str, ref: str, *, base_url: str, headers: dict[str, str]) -> Path:
    if not base_url:
        raise RocsCliError(kind="config", message="missing GitLab base url (set ROCS_GITLAB_BASE_URL or GITLAB_BASE_URL)")

    dest = gitlab_cache_dest(project_path, ref)
    dest.parent.mkdir(parents=True, exist_ok=True)

    lock_path = _cache_lock_path(dest)
    with _exclusive_lock(lock_path):
        complete_dest = gitlab_cache_complete_dest(project_path, ref)
        if complete_dest is not None:
            return complete_dest
        if dest.exists():
            shutil.rmtree(dest, ignore_errors=True)

        archive_url = f"{base_url}/api/v4/projects/{quote(project_path, safe='')}/repository/archive.tar.gz?sha={quote(ref, safe='')}"

        with tempfile.TemporaryDirectory(prefix="rocs-gitlab-") as td:
            td_path = Path(td)
            tar_path = td_path / "repo.tar.gz"
            req = Request(archive_url, headers=headers)
            _download_to_path(req, tar_path)

            extract_root = td_path / "extract"
            members = _safe_extract_tar_gz(tar_path, extract_root)

            top_dirs = {Path(m.name).parts[0] for m in members if m.name and not m.name.startswith(".")}
            if len(top_dirs) != 1:
                raise RocsCliError(
                    kind="network",
                    message=f"unexpected GitLab archive layout for {project_path}@{ref}: {sorted(top_dirs)}",
                )
            repo_root = extract_root / next(iter(top_dirs))
            if not repo_root.exists():
                raise RocsCliError(kind="network", message=f"failed to extract GitLab archive for {project_path}@{ref}")

            tmp_dest = dest.with_name(dest.name + ".tmp")
            if tmp_dest.exists():
                shutil.rmtree(tmp_dest, ignore_errors=True)
            shutil.move(str(repo_root), str(tmp_dest))
            _write_cache_marker(tmp_dest, project_path, ref)
            tmp_dest.replace(dest)
            return dest
