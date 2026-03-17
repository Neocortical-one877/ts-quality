from __future__ import annotations

import re

from rocs_cli.model import OntDoc
from rocs_cli.rules import Finding


PLACEHOLDER_RE = re.compile(r"<[^>]+>")


def _ignored(doc: OntDoc) -> set[str]:
    ig = doc.ont.get("lint_ignore") or []
    if isinstance(ig, list):
        return {str(x) for x in ig}
    return set()


def lint_docs(concepts: dict[str, OntDoc], relations: dict[str, OntDoc], *, strict_placeholders: bool) -> list[Finding]:
    findings: list[Finding] = []

    def has_placeholder(val: object) -> bool:
        if isinstance(val, str):
            return bool(PLACEHOLDER_RE.search(val))
        if isinstance(val, list):
            return any(has_placeholder(x) for x in val)
        if isinstance(val, dict):
            return any(has_placeholder(v) for v in val.values())
        return False

    for _cid, cdoc in concepts.items():
        ignore = _ignored(cdoc)
        ont = cdoc.ont
        if "LINT001" not in ignore and not ont.get("examples"):
            findings.append(Finding(rule_id="LINT001", severity="warn", message="missing ont.examples", path=str(cdoc.path), layer=cdoc.layer_name))
        if "LINT002" not in ignore and (has_placeholder(ont.get("examples")) or has_placeholder(ont.get("anti_examples"))):
            findings.append(
                Finding(
                    rule_id="LINT002",
                    severity="warn",
                    message="placeholder token in examples/anti_examples",
                    path=str(cdoc.path),
                    layer=cdoc.layer_name,
                )
            )
        if "LINT010" not in ignore:
            body = cdoc.body or ""
            if "## Definition" not in body:
                findings.append(Finding(rule_id="LINT010", severity="warn", message="missing '## Definition' section", path=str(cdoc.path), layer=cdoc.layer_name))
        if "LINT011" not in ignore:
            body = cdoc.body or ""
            if re.search(r"(?m)^#+\s*$", body):
                findings.append(Finding(rule_id="LINT011", severity="warn", message="empty markdown heading", path=str(cdoc.path), layer=cdoc.layer_name))
        if strict_placeholders and "LINT012" not in ignore:
            body = cdoc.body or ""
            if PLACEHOLDER_RE.search(body):
                findings.append(Finding(rule_id="LINT012", severity="warn", message="placeholder token in markdown body under strict mode", path=str(cdoc.path), layer=cdoc.layer_name))

    for _rid, rdoc in relations.items():
        ignore = _ignored(rdoc)
        ont = rdoc.ont
        if "LINT101" not in ignore and not ont.get("group"):
            findings.append(Finding(rule_id="LINT101", severity="warn", message="relation missing ont.group", path=str(rdoc.path), layer=rdoc.layer_name))
        if "LINT102" not in ignore and not ont.get("characteristics"):
            findings.append(Finding(rule_id="LINT102", severity="warn", message="relation missing ont.characteristics", path=str(rdoc.path), layer=rdoc.layer_name))
        if "LINT103" not in ignore:
            body = rdoc.body or ""
            if "Domain" not in body or "Range" not in body:
                findings.append(Finding(rule_id="LINT103", severity="warn", message="relation body missing Domain/Range guidance", path=str(rdoc.path), layer=rdoc.layer_name))
        if "LINT110" not in ignore:
            body = rdoc.body or ""
            if "## Definition" not in body:
                findings.append(Finding(rule_id="LINT110", severity="warn", message="missing '## Definition' section", path=str(rdoc.path), layer=rdoc.layer_name))
        if "LINT111" not in ignore:
            body = rdoc.body or ""
            if re.search(r"(?m)^#+\s*$", body):
                findings.append(Finding(rule_id="LINT111", severity="warn", message="empty markdown heading", path=str(rdoc.path), layer=rdoc.layer_name))
        if strict_placeholders and "LINT112" not in ignore:
            body = rdoc.body or ""
            if PLACEHOLDER_RE.search(body):
                findings.append(Finding(rule_id="LINT112", severity="warn", message="placeholder token in markdown body under strict mode", path=str(rdoc.path), layer=rdoc.layer_name))

    return findings
