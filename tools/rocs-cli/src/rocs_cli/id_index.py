from __future__ import annotations

from rocs_cli.model import OntDoc


def _path_in_layer(doc: OntDoc) -> str:
    # Produce a stable-ish location without leaking cache absolute paths.
    parts = list(doc.path.parts)
    if "reference" in parts:
        i = len(parts) - 1 - list(reversed(parts)).index("reference")
        return "/".join(parts[i:])
    return doc.path.name


def build_id_index(*, concepts: dict[str, OntDoc], relations: dict[str, OntDoc]) -> dict:
    items: list[dict] = []
    for cid, cdoc in concepts.items():
        items.append(
            {
                "id": cid,
                "kind": "concept",
                "labels": [str(x) for x in (cdoc.ont.get("labels") or [])],
                "layer": cdoc.layer_name,
                "layer_kind": cdoc.layer_kind,
                "path_in_layer": _path_in_layer(cdoc),
            }
        )
    for rid, rdoc in relations.items():
        items.append(
            {
                "id": rid,
                "kind": "relation",
                "labels": [str(x) for x in (rdoc.ont.get("labels") or [])],
                "layer": rdoc.layer_name,
                "layer_kind": rdoc.layer_kind,
                "path_in_layer": _path_in_layer(rdoc),
            }
        )

    items.sort(key=lambda x: str(x.get("id") or ""))
    return {"schema_version": 1, "items": items}

