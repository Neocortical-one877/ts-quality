from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from rocs_cli.frontmatter import load_frontmatter
from rocs_cli.layers import LayerSpec


@dataclass(frozen=True)
class OntDoc:
    path: Path
    fm: dict
    body: str
    layer_name: str
    layer_kind: str  # path|ref

    @property
    def ont(self) -> dict:
        return self.fm.get("ont") or {}

    @property
    def ont_id(self) -> str:
        return str(self.ont.get("id") or "")

    @property
    def ont_type(self) -> str:
        return str(self.ont.get("type") or "")


def iter_reference_md(src_root: Path) -> list[Path]:
    ref = src_root / "reference"
    out: list[Path] = []
    if not ref.exists():
        return out
    for p in sorted(ref.rglob("*.md")):
        if p.name == "README.md":
            continue
        out.append(p)
    return out


def iter_md(src_root: Path) -> list[Path]:
    out: list[Path] = []
    if not src_root.exists():
        return out
    for p in sorted(src_root.rglob("*.md")):
        out.append(p)
    return out


def load_doc(path: Path, *, layer: LayerSpec) -> OntDoc:
    fm, body = load_frontmatter(path)
    return OntDoc(path=path, fm=fm, body=body, layer_name=layer.name, layer_kind=layer.kind)


def collect_docs(layers: list[LayerSpec]) -> tuple[dict[str, OntDoc], dict[str, OntDoc]]:
    # Optional incremental cache (offline-first; local-only; deterministic outputs).
    from rocs_cli.index_cache import collect_docs_cached, index_cache_enabled  # noqa: PLC0415

    if index_cache_enabled():
        return collect_docs_cached(layers)

    concepts: dict[str, OntDoc] = {}
    relations: dict[str, OntDoc] = {}
    for layer in layers:
        for p in iter_reference_md(layer.src_root):
            d = load_doc(p, layer=layer)
            if d.ont_type == "concept":
                if d.ont_id in concepts:
                    raise SystemExit(f"duplicate concept id {d.ont_id!r} in {p} (already in {concepts[d.ont_id].path})")
                concepts[d.ont_id] = d
            elif d.ont_type == "relation":
                if d.ont_id in relations:
                    raise SystemExit(
                        f"duplicate relation id {d.ont_id!r} in {p} (already in {relations[d.ont_id].path})"
                    )
                relations[d.ont_id] = d
            else:
                raise SystemExit(f"unknown ont.type in {p}: {d.ont_type!r}")
    return concepts, relations


def relation_label_index(relations: dict[str, OntDoc]) -> dict[str, set[str]]:
    rel_label_to_ids: dict[str, set[str]] = {}
    for rid, rdoc in relations.items():
        labels = (rdoc.ont.get("labels") or [])
        for lbl in labels:
            rel_label_to_ids.setdefault(str(lbl), set()).add(rid)
    return rel_label_to_ids
