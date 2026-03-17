from __future__ import annotations

import hashlib
import json
from pathlib import Path


CORE_VENDORED_FILES: tuple[Path, ...] = (
    Path("pyproject.toml"),
    Path("README.md"),
)


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def validate_vendor_source_layout(repo_root: Path) -> tuple[Path, Path, Path]:
    pyproject = repo_root / "pyproject.toml"
    readme = repo_root / "README.md"
    src_pkg = repo_root / "src" / "rocs_cli"

    if not pyproject.is_file():
        raise ValueError(f"missing source file: {pyproject}")
    if not readme.is_file():
        raise ValueError(f"missing source file: {readme}")
    if not src_pkg.is_dir():
        raise ValueError(f"missing source package dir: {src_pkg}")

    return pyproject, readme, src_pkg


def validate_vendor_target(*, repo_root: Path, target: Path) -> None:
    resolved_repo_root = repo_root.resolve()
    resolved_target = target.resolve()
    resolved_source_pkg = (resolved_repo_root / "src" / "rocs_cli").resolve()

    if resolved_target == resolved_repo_root:
        raise ValueError("refusing to vendor into source repo root")
    if resolved_target == resolved_source_pkg or resolved_target.is_relative_to(resolved_source_pkg):
        raise ValueError(f"refusing to vendor into source package tree: {resolved_target}")
    if resolved_target.exists() and not resolved_target.is_dir():
        raise ValueError(f"target exists and is not a directory: {resolved_target}")

    src_dir = resolved_target / "src"
    if src_dir.exists() and not src_dir.is_dir():
        raise ValueError(f"target src path is not a directory: {src_dir}")


def iter_vendored_relpaths(vendored_dir: Path) -> list[Path]:
    relpaths: list[Path] = list(CORE_VENDORED_FILES)
    src_root = vendored_dir / "src" / "rocs_cli"
    if src_root.exists():
        for p in sorted(src_root.rglob("*")):
            if "__pycache__" in p.parts:
                continue
            if p.is_file():
                relpaths.append(p.relative_to(vendored_dir))
    return relpaths


def compute_expected_hashes(vendored_dir: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    for rel in iter_vendored_relpaths(vendored_dir):
        out[str(rel)] = sha256_file(vendored_dir / rel)
    return out


def read_vendored_hashes(vendored_dir: Path) -> dict:
    p = vendored_dir / "VENDORED_HASHES.json"
    if not p.exists():
        raise FileNotFoundError(str(p))
    return json.loads(p.read_text("utf-8"))


def verify_vendored_hashes(vendored_dir: Path) -> tuple[bool, list[str]]:
    data = read_vendored_hashes(vendored_dir)
    if data.get("schema_version") != 1:
        return False, [f"unsupported schema_version: {data.get('schema_version')!r}"]
    expected = data.get("files")
    if not isinstance(expected, dict):
        return False, ["invalid VENDORED_HASHES.json: missing 'files' mapping"]

    ok = True
    lines: list[str] = []

    expected_paths = {str(k) for k in expected.keys()}
    actual_paths = {str(rel) for rel in iter_vendored_relpaths(vendored_dir) if (vendored_dir / rel).exists()}

    for rel in sorted(actual_paths - expected_paths):
        ok = False
        lines.append(f"unexpected: {rel}")

    for rel, want in sorted(expected.items(), key=lambda kv: kv[0]):
        p = vendored_dir / rel
        if not p.exists():
            ok = False
            lines.append(f"missing: {rel}")
            continue
        got = sha256_file(p)
        if got != str(want):
            ok = False
            lines.append(f"mismatch: {rel} expected={want} got={got}")
        else:
            lines.append(f"ok: {rel} {got}")
    return ok, lines
