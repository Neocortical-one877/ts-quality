from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from rocs_cli.frontmatter import load_frontmatter, write_doc


CONCEPT_KEY_ORDER = [
    "id",
    "type",
    "labels",
    "synonyms",
    "description",
    "status",
    "deprecated",
    "lint_ignore",
    "relations",
    "examples",
    "anti_examples",
]

RELATION_KEY_ORDER = [
    "id",
    "type",
    "labels",
    "description",
    "status",
    "deprecated",
    "lint_ignore",
    "group",
    "characteristics",
    "axis_default",
    "inverse",
]


@dataclass(frozen=True)
class NormalizeChange:
    path: Path
    changed: bool


def _reorder_keys(d: dict, order: list[str]) -> dict:
    out: dict = {}
    for k in order:
        if k in d:
            out[k] = d[k]
    for k, v in d.items():
        if k not in out:
            out[k] = v
    return out


def normalize_doc(path: Path, *, apply: bool) -> bool:
    fm, body = load_frontmatter(path)
    ont = fm.get("ont") or {}
    if not isinstance(ont, dict):
        return False

    changed = False

    # Ensure relations list exists for concepts.
    if str(ont.get("type") or "") == "concept":
        if ont.get("relations") is None:
            ont["relations"] = []
            changed = True
        if "relations" not in ont:
            ont["relations"] = []
            changed = True
        if not isinstance(ont.get("relations"), list):
            # don't mutate non-list; let validate handle
            pass

        new_ont = _reorder_keys(ont, CONCEPT_KEY_ORDER)
        if new_ont != ont:
            ont = new_ont
            changed = True

    if str(ont.get("type") or "") == "relation":
        new_ont = _reorder_keys(ont, RELATION_KEY_ORDER)
        if new_ont != ont:
            ont = new_ont
            changed = True

    if changed:
        fm["ont"] = ont
        if apply:
            write_doc(path, fm, body)
    return changed


def normalize_tree(src_root: Path, *, apply: bool) -> list[NormalizeChange]:
    changes: list[NormalizeChange] = []
    if not src_root.exists():
        return changes
    for p in sorted((src_root / "reference").rglob("*.md")):
        if p.name == "README.md":
            continue
        changed = normalize_doc(p, apply=apply)
        changes.append(NormalizeChange(path=p, changed=changed))
    return changes
