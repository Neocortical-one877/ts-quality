from __future__ import annotations

import contextlib
import hashlib
import json
import os
import sys
from collections.abc import Iterator
from datetime import date, datetime
from pathlib import Path
from typing import Any, cast

from rocs_cli import __version__
from rocs_cli.cache import cache_dir
from rocs_cli.layers import LayerSpec
from rocs_cli.model import OntDoc, iter_reference_md, load_doc


_INDEX_SCHEMA = 1


def _truthy_env(name: str, default: bool) -> bool:
    raw = (os.environ.get(name) or "").strip().lower()
    if not raw:
        return default
    if raw in ("0", "false", "no", "off"):
        return False
    if raw in ("1", "true", "yes", "on"):
        return True
    return default


def index_cache_enabled() -> bool:
    return _truthy_env("ROCS_INDEX_CACHE", True)


def index_cache_debug() -> bool:
    return _truthy_env("ROCS_INDEX_CACHE_DEBUG", False)


def _json_safe(val: object) -> object:
    if val is None or isinstance(val, (str, int, float, bool)):
        return val
    if isinstance(val, (datetime, date)):
        return val.isoformat()
    if isinstance(val, dict):
        return {str(k): _json_safe(v) for k, v in val.items()}
    if isinstance(val, (list, tuple)):
        return [_json_safe(x) for x in val]
    if isinstance(val, set):
        return sorted((_json_safe(x) for x in val), key=lambda x: str(x))
    return str(val)


def _sha256_bytes(b: bytes) -> str:
    h = hashlib.sha256()
    h.update(b)
    return h.hexdigest()


def _sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def _layer_desc(layer_spec: LayerSpec) -> dict:
    return {
        "name": layer_spec.name,
        "kind": layer_spec.kind,
        "origin": layer_spec.origin,
        "src_root": str(layer_spec.src_root),
    }


def _cache_key(layers: list[LayerSpec]) -> str:
    payload = {
        "schema": _INDEX_SCHEMA,
        "rocs_version": __version__,
        "python": f"{sys.version_info.major}.{sys.version_info.minor}",
        "layers": [_layer_desc(layer_spec) for layer_spec in layers],
    }
    return _sha256_bytes(json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8"))[:24]


def _cache_root(key: str) -> Path:
    return cache_dir() / "index" / f"v{_INDEX_SCHEMA}" / key


def _lock_path(root: Path) -> Path:
    return root.parent / f".{root.name}.lock"


@contextlib.contextmanager
def _exclusive_lock(lock_path: Path) -> Iterator[None]:
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    with lock_path.open("a+", encoding="utf-8") as f:
        try:
            import fcntl  # noqa: PLC0415

            fcntl.flock(f.fileno(), fcntl.LOCK_EX)
        except Exception:
            pass
        yield


def _load_cache_json(path: Path) -> dict | None:
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text("utf-8"))
    except Exception:
        return None
    if not isinstance(data, dict) or data.get("schema_version") != _INDEX_SCHEMA:
        return None
    return data


def _atomic_write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    tmp.write_text(json.dumps(data, sort_keys=True) + "\n", "utf-8")
    tmp.replace(path)


def _relpath(layer: LayerSpec, path: Path) -> str:
    return path.relative_to(layer.src_root).as_posix()


def _fingerprint(path: Path) -> dict:
    st = path.stat()
    mtime_ns = int(getattr(st, "st_mtime_ns", int(st.st_mtime * 1e9)))
    ctime_ns = int(getattr(st, "st_ctime_ns", int(st.st_ctime * 1e9)))
    ino = int(getattr(st, "st_ino", 0) or 0)
    return {"mtime_ns": mtime_ns, "ctime_ns": ctime_ns, "size": int(st.st_size), "ino": ino}


def _layer_filename(layer: LayerSpec, idx: int) -> str:
    digest = _sha256_bytes(
        json.dumps(_layer_desc(layer), sort_keys=True, separators=(",", ":")).encode("utf-8")
    )[:10]
    safe = "".join(ch if ch.isalnum() or ch in ("-", "_") else "_" for ch in layer.name)[:40]
    return f"{idx:02d}_{safe}_{digest}.json"


def collect_docs_cached(layers: list[LayerSpec]) -> tuple[dict[str, OntDoc], dict[str, OntDoc]]:
    if not layers:
        return {}, {}

    key = _cache_key(layers)
    root = _cache_root(key)
    lock = _lock_path(root)
    meta_file = root / "meta.json"
    layer_dir = root / "layers"

    hits = 0
    misses = 0
    verified = 0
    reparsed = 0
    dirty_meta = False
    dirty_layers: set[str] = set()

    with _exclusive_lock(lock):
        root.mkdir(parents=True, exist_ok=True)
        layer_dir.mkdir(parents=True, exist_ok=True)

        want_layers = [_layer_desc(layer_spec) for layer_spec in layers]
        want_layer_files = [_layer_filename(layer_spec, i) for i, layer_spec in enumerate(layers)]

        meta = _load_cache_json(meta_file)
        if meta is None:
            meta = {
                "schema_version": _INDEX_SCHEMA,
                "rocs_version": __version__,
                "layers": want_layers,
                "layer_files": want_layer_files,
            }
            dirty_meta = True
        if meta.get("rocs_version") != __version__:
            meta = {
                "schema_version": _INDEX_SCHEMA,
                "rocs_version": __version__,
                "layers": want_layers,
                "layer_files": want_layer_files,
            }
            dirty_meta = True
        if meta.get("layers") != want_layers or meta.get("layer_files") != want_layer_files:
            meta = {
                "schema_version": _INDEX_SCHEMA,
                "rocs_version": __version__,
                "layers": want_layers,
                "layer_files": want_layer_files,
            }
            dirty_meta = True

        concepts: dict[str, OntDoc] = {}
        relations: dict[str, OntDoc] = {}

        layer_maps: dict[str, dict[str, dict[str, Any]]] = {}
        for layer, fname in zip(layers, want_layer_files, strict=True):
            p = layer_dir / fname
            data: dict[str, Any] = _load_cache_json(p) or {}
            raw_files = data.get("files")
            if isinstance(raw_files, dict):
                layer_maps[fname] = cast(dict[str, dict[str, Any]], raw_files)
            else:
                layer_maps[fname] = {}

        for layer, fname in zip(layers, want_layer_files, strict=True):
            layer_files = layer_maps[fname]
            seen_rel: set[str] = set()
            for p in iter_reference_md(layer.src_root):
                rel = _relpath(layer, p)
                seen_rel.add(rel)
                fp = _fingerprint(p)
                entry = layer_files.get(rel)
                cached_doc: OntDoc | None = None

                if isinstance(entry, dict):
                    if entry.get("fingerprint") == fp:
                        fm = entry.get("fm")
                        if not isinstance(fm, dict):
                            fm = {}
                        body = str(entry.get("body") or "")
                        cached_doc = OntDoc(
                            path=p,
                            fm=fm,
                            body=body,
                            layer_name=layer.name,
                            layer_kind=layer.kind,
                        )
                        hits += 1

                if cached_doc is None and isinstance(entry, dict) and isinstance(entry.get("sha256"), str):
                    if isinstance(entry.get("fingerprint"), dict) and entry["fingerprint"].get("size") == fp.get("size"):
                        digest = _sha256_file(p)
                        if digest and digest == entry.get("sha256"):
                            fm = entry.get("fm")
                            if not isinstance(fm, dict):
                                fm = {}
                            body = str(entry.get("body") or "")
                            cached_doc = OntDoc(
                                path=p,
                                fm=fm,
                                body=body,
                                layer_name=layer.name,
                                layer_kind=layer.kind,
                            )
                            entry["fingerprint"] = fp
                            hits += 1
                            verified += 1
                            dirty_layers.add(fname)

                if cached_doc is None:
                    misses += 1
                    d = load_doc(p, layer=layer)
                    digest = ""
                    try:
                        digest = _sha256_file(p)
                    except OSError:
                        pass
                    layer_files[rel] = {
                        "fingerprint": fp,
                        "sha256": digest,
                        "fm": _json_safe(d.fm),
                        "body": d.body,
                        "ont_id": d.ont_id,
                        "ont_type": d.ont_type,
                    }
                    cached_doc = d
                    reparsed += 1
                    dirty_layers.add(fname)

                if cached_doc.ont_type == "concept":
                    if cached_doc.ont_id in concepts:
                        raise SystemExit(
                            f"duplicate concept id {cached_doc.ont_id!r} in {p} (already in {concepts[cached_doc.ont_id].path})"
                        )
                    concepts[cached_doc.ont_id] = cached_doc
                elif cached_doc.ont_type == "relation":
                    if cached_doc.ont_id in relations:
                        raise SystemExit(
                            f"duplicate relation id {cached_doc.ont_id!r} in {p} (already in {relations[cached_doc.ont_id].path})"
                        )
                    relations[cached_doc.ont_id] = cached_doc
                else:
                    raise SystemExit(f"unknown ont.type in {p}: {cached_doc.ont_type!r}")

            # prune removed files
            for rel in list(layer_files.keys()):
                if rel not in seen_rel:
                    layer_files.pop(rel, None)
                    dirty_layers.add(fname)

        if dirty_meta:
            _atomic_write_json(meta_file, meta)
        for fname in sorted(dirty_layers):
            _atomic_write_json(layer_dir / fname, {"schema_version": _INDEX_SCHEMA, "files": layer_maps[fname]})

    if index_cache_debug():
        print(
            f"rocs index-cache: key={key} hits={hits} misses={misses} verified={verified} reparsed={reparsed}",
            file=sys.stderr,
        )

    return concepts, relations
