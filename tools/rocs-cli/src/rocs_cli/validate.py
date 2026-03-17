from __future__ import annotations

from pathlib import Path

from rocs_cli.layers import LayerSpec, manifest_path
from rocs_cli.model import collect_docs, iter_md, relation_label_index
from rocs_cli.rules import Finding


import re


PLACEHOLDER_RE = re.compile(r"<[^>]+>")
REF_LOCATOR_RE = re.compile(r"^<(repo|gitlab):([^@>]+)@([^>]+)>$")

_ALLOWED_CONCEPT_KEYS = {
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
}
_ALLOWED_RELATION_KEYS = {
    "id",
    "type",
    "labels",
    "description",
    "status",
    "deprecated",
    "group",
    "characteristics",
    "axis_default",
    "inverse",
    "lint_ignore",
}


def _ignored(ont: dict) -> set[str]:
    ig = ont.get("lint_ignore") or []
    if isinstance(ig, list):
        return {str(x) for x in ig}
    return set()


def _id_ok(ont_id: str) -> bool:
    return bool(re.fullmatch(r"[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)+", ont_id))


def validate_repo_structure(repo_root: Path) -> list[Finding]:
    findings: list[Finding] = []
    if not manifest_path(repo_root).exists():
        findings.append(Finding(rule_id="STRUCT001", severity="error", message="missing ontology/manifest.yaml"))
    return findings


def validate_layers_exist(layers: list[LayerSpec]) -> list[Finding]:
    findings: list[Finding] = []
    for layer in layers:
        if not layer.src_root.exists():
            findings.append(
                Finding(
                    rule_id="STRUCT010",
                    severity="error",
                    message=f"layer {layer.name!r} missing src_root: {layer.src_root} (from {layer.origin})",
                    path=str(layer.src_root),
                    layer=layer.name,
                )
            )
            continue
        if not (layer.src_root / "system4d.yaml").exists():
            findings.append(
                Finding(
                    rule_id="STRUCT011",
                    severity="error",
                    message=f"layer missing system4d.yaml: {layer.src_root/'system4d.yaml'}",
                    path=str(layer.src_root / "system4d.yaml"),
                    layer=layer.name,
                )
            )
    return findings


def validate_manifest_placeholders(repo_root: Path, strict_placeholders: bool) -> list[Finding]:
    if not strict_placeholders:
        return []
    mp = manifest_path(repo_root)
    if not mp.exists():
        return []
    text = mp.read_text("utf-8")
    findings: list[Finding] = []
    for m in PLACEHOLDER_RE.finditer(text):
        token = m.group(0)
        if REF_LOCATOR_RE.match(token):
            continue
        findings.append(
            Finding(
                rule_id="PLACE001",
                severity="error",
                message=f"manifest placeholder token found: {token!r}",
                path=str(mp),
            )
        )
    return findings


def validate_reference_schema(
    layers: list[LayerSpec],
    *,
    strict_placeholders: bool,
    validate_deps: bool,
    concepts: dict | None = None,
    relations: dict | None = None,
) -> tuple[list[Finding], dict]:
    findings: list[Finding] = []
    if concepts is None or relations is None:
        concepts, relations = collect_docs(layers)

    def add_doc_finding(ignore: set[str], finding: Finding) -> None:
        if finding.rule_id in ignore:
            return
        findings.append(finding)

    rel_label_to_ids = relation_label_index(relations)
    for lbl, ids in rel_label_to_ids.items():
        if len(ids) > 1:
            findings.append(
                Finding(
                    rule_id="REL001",
                    severity="error",
                    message=f"relation label collision: {lbl!r} defined by {sorted(ids)}",
                )
            )

    if strict_placeholders:
        for layer in layers:
            for p in iter_md(layer.src_root):
                try:
                    text = p.read_text("utf-8")
                except OSError:
                    continue
                if PLACEHOLDER_RE.search(text):
                    findings.append(
                        Finding(
                            rule_id="PLACE010",
                            severity="error",
                            message="placeholder token found in ontology content (e.g. <...>)",
                            path=str(p),
                            layer=layer.name,
                        )
                    )

    for cid, cdoc in concepts.items():
        ignore = _ignored(cdoc.ont)
        if not _id_ok(cid):
            add_doc_finding(
                ignore,
                Finding(
                    rule_id="ONT001",
                    severity="error",
                    message=f"invalid ont.id: {cid!r}",
                    path=str(cdoc.path),
                    layer=cdoc.layer_name,
                )
            )
        ont = cdoc.ont
        if validate_deps or cdoc.layer_kind == "path":
            extra = set(ont.keys()) - _ALLOWED_CONCEPT_KEYS
            if extra:
                add_doc_finding(
                    ignore,
                    Finding(
                        rule_id="ONT002",
                        severity="error",
                        message=f"unknown ont keys: {sorted(extra)}",
                        path=str(cdoc.path),
                        layer=cdoc.layer_name,
                    )
                )
            labels = ont.get("labels")
            if not isinstance(labels, list) or not labels or not all(str(x).strip() for x in labels):
                add_doc_finding(
                    ignore,
                    Finding(
                        rule_id="ONT003",
                        severity="error",
                        message="ont.labels must be a non-empty list of strings",
                        path=str(cdoc.path),
                        layer=cdoc.layer_name,
                    )
                )
            desc = str(ont.get("description") or "").strip()
            if not desc:
                add_doc_finding(
                    ignore,
                    Finding(
                        rule_id="ONT004",
                        severity="error",
                        message="ont.description must be non-empty",
                        path=str(cdoc.path),
                        layer=cdoc.layer_name,
                    )
                )
        rels = ont.get("relations")
        if rels is None and cdoc.layer_kind != "path" and not validate_deps:
            rels = []
        if not isinstance(rels, list):
            add_doc_finding(
                ignore,
                Finding(
                    rule_id="ONT005",
                    severity="error",
                    message="ont.relations must be a list (use [])",
                    path=str(cdoc.path),
                    layer=cdoc.layer_name,
                )
            )
            continue

        for edge in rels:
            if not isinstance(edge, dict):
                add_doc_finding(
                    ignore,
                    Finding(
                        rule_id="ONT006",
                        severity="error",
                        message=f"relation edge must be mapping: {edge!r}",
                        path=str(cdoc.path),
                        layer=cdoc.layer_name,
                    )
                )
                continue
            rtype = str(edge.get("type") or "")
            target = str(edge.get("target") or "")
            if rtype and rtype not in rel_label_to_ids:
                add_doc_finding(
                    ignore,
                    Finding(
                        rule_id="ONT007",
                        severity="error",
                        message=f"unknown relation type label: {rtype!r}",
                        path=str(cdoc.path),
                        layer=cdoc.layer_name,
                    )
                )
            if target and target not in concepts:
                add_doc_finding(
                    ignore,
                    Finding(
                        rule_id="ONT008",
                        severity="error",
                        message=f"missing relation target concept: {target!r}",
                        path=str(cdoc.path),
                        layer=cdoc.layer_name,
                    )
                )

        status = str(ont.get("status") or "active")
        if status not in ("active", "deprecated"):
            add_doc_finding(
                ignore,
                Finding(
                    rule_id="ONT009",
                    severity="error",
                    message="ont.status must be active|deprecated",
                    path=str(cdoc.path),
                    layer=cdoc.layer_name,
                )
            )
        if status == "deprecated":
            dep = ont.get("deprecated") or {}
            if not isinstance(dep, dict):
                add_doc_finding(
                    ignore,
                    Finding(
                        rule_id="ONT010",
                        severity="error",
                        message="ont.deprecated must be mapping",
                        path=str(cdoc.path),
                        layer=cdoc.layer_name,
                    )
                )
            else:
                for k in ("since", "replaced_by", "decision"):
                    if not dep.get(k):
                        add_doc_finding(
                            ignore,
                            Finding(
                                rule_id="ONT011",
                                severity="error",
                                message=f"deprecated requires ont.deprecated.{k}",
                                path=str(cdoc.path),
                                layer=cdoc.layer_name,
                            )
                        )
                rb = str(dep.get("replaced_by") or "")
                if rb and rb not in concepts:
                    add_doc_finding(
                        ignore,
                        Finding(
                            rule_id="ONT012",
                            severity="error",
                            message=f"deprecated replaced_by missing: {rb!r}",
                            path=str(cdoc.path),
                            layer=cdoc.layer_name,
                        )
                    )

    for rid, rdoc in relations.items():
        ignore = _ignored(rdoc.ont)
        if not _id_ok(rid):
            add_doc_finding(
                ignore,
                Finding(
                    rule_id="REL010",
                    severity="error",
                    message=f"invalid ont.id: {rid!r}",
                    path=str(rdoc.path),
                    layer=rdoc.layer_name,
                )
            )
        ont = rdoc.ont
        if validate_deps or rdoc.layer_kind == "path":
            extra = set(ont.keys()) - _ALLOWED_RELATION_KEYS
            if extra:
                add_doc_finding(
                    ignore,
                    Finding(
                        rule_id="REL011",
                        severity="error",
                        message=f"unknown ont keys: {sorted(extra)}",
                        path=str(rdoc.path),
                        layer=rdoc.layer_name,
                    )
                )
            labels = ont.get("labels")
            if not isinstance(labels, list) or not labels or not all(str(x).strip() for x in labels):
                add_doc_finding(
                    ignore,
                    Finding(
                        rule_id="REL012",
                        severity="error",
                        message="ont.labels must be a non-empty list of strings",
                        path=str(rdoc.path),
                        layer=rdoc.layer_name,
                    )
                )
            desc = str(ont.get("description") or "").strip()
            if not desc:
                add_doc_finding(
                    ignore,
                    Finding(
                        rule_id="REL013",
                        severity="error",
                        message="ont.description must be non-empty",
                        path=str(rdoc.path),
                        layer=rdoc.layer_name,
                    )
                )

        inv = ont.get("inverse")
        if inv is not None:
            inv = str(inv)
            labels = [str(x) for x in (ont.get("labels") or [])]
            if inv in labels:
                continue
            if inv not in rel_label_to_ids:
                add_doc_finding(
                    ignore,
                    Finding(
                        rule_id="REL020",
                        severity="error",
                        message=f"inverse label not defined: {inv!r}",
                        path=str(rdoc.path),
                        layer=rdoc.layer_name,
                    )
                )
            else:
                inv_ids = sorted(rel_label_to_ids.get(inv) or [])
                if len(inv_ids) != 1:
                    add_doc_finding(
                        ignore,
                        Finding(
                            rule_id="REL021",
                            severity="error",
                            message=f"inverse label ambiguous: {inv!r} -> {inv_ids}",
                            path=str(rdoc.path),
                            layer=rdoc.layer_name,
                        )
                    )
                else:
                    inv_doc = relations.get(inv_ids[0])
                    if inv_doc:
                        back = inv_doc.ont.get("inverse")
                        if back is None or str(back) not in labels:
                            add_doc_finding(
                                ignore,
                                Finding(
                                    rule_id="REL022",
                                    severity="error",
                                    message=f"inverse not reciprocal: {inv_ids[0]!r} missing inverse back to {labels}",
                                    path=str(rdoc.path),
                                    layer=rdoc.layer_name,
                                )
                            )

    # taxonomy cycles on is_a
    is_a_edges: list[tuple[str, str]] = []
    for cid, cdoc in concepts.items():
        rels = cdoc.ont.get("relations") or []
        if isinstance(rels, list):
            for edge in rels:
                if isinstance(edge, dict) and str(edge.get("type") or "") == "is_a":
                    is_a_edges.append((cid, str(edge.get("target") or "")))

    graph: dict[str, list[str]] = {}
    for a, b in is_a_edges:
        if a and b:
            graph.setdefault(a, []).append(b)

    state: dict[str, int] = {}
    stack: list[str] = []

    def dfs(n: str) -> None:
        state[n] = 1
        stack.append(n)
        for nxt in graph.get(n, []):
            st = state.get(nxt, 0)
            if st == 0:
                dfs(nxt)
            elif st == 1 and nxt in stack:
                i = stack.index(nxt)
                cycle = " -> ".join(stack[i:] + [nxt])
                findings.append(Finding(rule_id="TAX001", severity="error", message=f"taxonomy cycle: {cycle}"))
        stack.pop()
        state[n] = 2

    for n in graph:
        if state.get(n, 0) == 0:
            dfs(n)

    meta = {
        "counts": {"concepts": len(concepts), "relations": len(relations)},
    }
    return findings, meta


def enforce_budget(concepts: dict, relations: dict, *, budget: int | None) -> tuple[bool, dict]:
    edges = 0
    for cdoc in concepts.values():
        rels = cdoc.ont.get("relations") or []
        if isinstance(rels, list):
            edges += len([x for x in rels if isinstance(x, dict)])
    units = int(len(concepts) + len(relations) + edges)
    payload = {"budget": budget, "units": units, "counts": {"concepts": len(concepts), "relations": len(relations), "edges": edges}}
    if budget is None:
        return True, payload
    return units <= int(budget), payload
