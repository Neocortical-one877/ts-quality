from __future__ import annotations

import os
import shutil
import time
from dataclasses import dataclass
from pathlib import Path


def cache_dir() -> Path:
    p = os.environ.get("ROCS_CACHE_DIR") or ""
    if p:
        return Path(p).expanduser().resolve()
    xdg = os.environ.get("XDG_CACHE_HOME") or ""
    if xdg:
        return Path(xdg).expanduser().resolve() / "rocs"
    return Path.home().resolve() / ".cache" / "rocs"


@dataclass(frozen=True)
class CacheEntry:
    path: Path
    bytes: int


def _dir_size_bytes(root: Path) -> int:
    total = 0
    for p in root.rglob("*"):
        if p.is_file():
            try:
                total += p.stat().st_size
            except OSError:
                pass
    return total


def list_cache_entries() -> list[CacheEntry]:
    root = cache_dir()
    if not root.exists():
        return []
    entries: list[CacheEntry] = []
    gitlab_root = root / "gitlab"
    if not gitlab_root.exists():
        return []
    for p in sorted(gitlab_root.glob("*/*")):
        if p.is_dir():
            entries.append(CacheEntry(path=p, bytes=_dir_size_bytes(p)))
    return entries


def clear_cache() -> None:
    root = cache_dir()
    if root.exists():
        shutil.rmtree(root)


def prune_cache(*, max_age_days: int) -> int:
    root = cache_dir()
    if not root.exists():
        return 0
    cutoff = (max_age_days * 24 * 60 * 60)
    removed = 0
    now = int(time.time())
    gitlab_root = root / "gitlab"
    if not gitlab_root.exists():
        return 0
    for p in sorted(gitlab_root.glob("*/*")):
        if not p.is_dir():
            continue
        try:
            age = now - int(p.stat().st_mtime)
        except OSError:
            continue
        if age >= cutoff:
            try:
                shutil.rmtree(p)
                removed += 1
            except OSError:
                pass
    return removed
