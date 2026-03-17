from __future__ import annotations

from rocs_cli.frontmatter import write_doc
from rocs_cli.model import OntDoc, relation_label_index
from rocs_cli.rules import Finding


def check_inverses(
    relations: dict[str, OntDoc],
    *,
    fix: bool,
) -> list[Finding]:
    findings: list[Finding] = []
    rel_label_to_ids = relation_label_index(relations)

    def first_label(doc: OntDoc) -> str | None:
        labels = doc.ont.get("labels") or []
        if isinstance(labels, list) and labels:
            v = str(labels[0]).strip()
            return v or None
        return None

    for rid, rdoc in relations.items():
        inv = rdoc.ont.get("inverse")
        if inv is None:
            continue
        inv = str(inv)
        labels = [str(x) for x in (rdoc.ont.get("labels") or [])]
        if inv in labels:
            continue
        ids = sorted(rel_label_to_ids.get(inv) or [])
        if not ids:
            findings.append(
                Finding(
                    rule_id="INV001",
                    severity="error",
                    message=f"inverse label not found: {inv!r}",
                    path=str(rdoc.path),
                    layer=rdoc.layer_name,
                )
            )
            continue
        if len(ids) != 1:
            findings.append(
                Finding(
                    rule_id="INV002",
                    severity="error",
                    message=f"inverse label ambiguous: {inv!r} -> {ids}",
                    path=str(rdoc.path),
                    layer=rdoc.layer_name,
                )
            )
            continue
        inv_id = ids[0]
        inv_doc = relations.get(inv_id)
        if not inv_doc:
            findings.append(
                Finding(
                    rule_id="INV003",
                    severity="error",
                    message=f"inverse target missing doc: {inv_id!r}",
                    path=str(rdoc.path),
                    layer=rdoc.layer_name,
                )
            )
            continue
        back = inv_doc.ont.get("inverse")
        if back is not None and str(back) in labels:
            continue

        if not fix:
            findings.append(
                Finding(
                    rule_id="INV010",
                    severity="warn",
                    message=f"inverse not reciprocal: {inv_id!r} missing inverse back",
                    path=str(rdoc.path),
                    layer=rdoc.layer_name,
                )
            )
            continue

        if inv_doc.layer_kind != "path":
            findings.append(
                Finding(
                    rule_id="INV011",
                    severity="error",
                    message=f"cannot fix inverse in non-path layer: {inv_doc.path}",
                    path=str(rdoc.path),
                    layer=rdoc.layer_name,
                )
            )
            continue

        back_label = first_label(rdoc)
        if not back_label:
            findings.append(
                Finding(
                    rule_id="INV012",
                    severity="error",
                    message="cannot fix inverse; missing labels",
                    path=str(rdoc.path),
                    layer=rdoc.layer_name,
                )
            )
            continue

        fm = inv_doc.fm
        ont = fm.get("ont") or {}
        if not isinstance(ont, dict):
            findings.append(
                Finding(
                    rule_id="INV013",
                    severity="error",
                    message="ont must be mapping to fix inverse",
                    path=str(inv_doc.path),
                    layer=inv_doc.layer_name,
                )
            )
            continue
        ont["inverse"] = back_label
        fm["ont"] = ont
        write_doc(inv_doc.path, fm, inv_doc.body)
        findings.append(
            Finding(
                rule_id="INV900",
                severity="info",
                message=f"fixed: set inverse to {back_label!r}",
                path=str(inv_doc.path),
                layer=inv_doc.layer_name,
            )
        )

    return findings
