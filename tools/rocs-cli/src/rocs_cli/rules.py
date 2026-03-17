from __future__ import annotations

from dataclasses import asdict, dataclass


Severity = str  # "error" | "warn" | "info"


@dataclass(frozen=True)
class Rule:
    rule_id: str
    default_severity: Severity
    summary: str


RULES: dict[str, Rule] = {}


def register_rule(rule_id: str, *, default_severity: Severity, summary: str) -> None:
    if default_severity not in ("error", "warn", "info"):
        raise ValueError(f"invalid severity: {default_severity}")
    RULES[rule_id] = Rule(rule_id=rule_id, default_severity=default_severity, summary=summary)


@dataclass(frozen=True)
class Finding:
    rule_id: str
    severity: Severity
    message: str
    path: str | None = None
    layer: str | None = None

    def to_dict(self) -> dict:
        return asdict(self)


def is_severity(value: str) -> bool:
    return value in ("error", "warn", "info")


# Core registry (kept intentionally small + boring; add as checks grow).
register_rule("STRUCT001", default_severity="error", summary="missing ontology/manifest.yaml")
register_rule("STRUCT010", default_severity="error", summary="missing layer src_root")
register_rule("STRUCT011", default_severity="error", summary="missing layer system4d.yaml")

register_rule("PLACE001", default_severity="error", summary="manifest placeholder token (non-gitlab locator)")
register_rule("PLACE010", default_severity="error", summary="placeholder token found in ontology content")

register_rule("REL001", default_severity="error", summary="relation label collision")
register_rule("REL010", default_severity="error", summary="invalid relation ont.id")
register_rule("REL011", default_severity="error", summary="unknown relation ont keys")
register_rule("REL012", default_severity="error", summary="relation labels invalid")
register_rule("REL013", default_severity="error", summary="relation description missing")
register_rule("REL020", default_severity="error", summary="inverse label not defined")
register_rule("REL021", default_severity="error", summary="inverse label ambiguous")
register_rule("REL022", default_severity="error", summary="inverse not reciprocal")

register_rule("ONT001", default_severity="error", summary="invalid concept ont.id")
register_rule("ONT002", default_severity="error", summary="unknown concept ont keys")
register_rule("ONT003", default_severity="error", summary="concept labels invalid")
register_rule("ONT004", default_severity="error", summary="concept description missing")
register_rule("ONT005", default_severity="error", summary="concept relations not a list")
register_rule("ONT006", default_severity="error", summary="relation edge not a mapping")
register_rule("ONT007", default_severity="error", summary="unknown relation type label")
register_rule("ONT008", default_severity="error", summary="missing relation target concept")
register_rule("ONT009", default_severity="error", summary="invalid concept status")
register_rule("ONT010", default_severity="error", summary="deprecated must be mapping")
register_rule("ONT011", default_severity="error", summary="deprecated field missing")
register_rule("ONT012", default_severity="error", summary="deprecated replaced_by missing")

register_rule("TAX001", default_severity="error", summary="taxonomy cycle detected")
register_rule("BUD001", default_severity="error", summary="invalid profile budget")
register_rule("BUD010", default_severity="error", summary="profile budget exceeded")

register_rule("LINT001", default_severity="warn", summary="concept missing examples")
register_rule("LINT002", default_severity="warn", summary="placeholder token in examples/anti_examples")
register_rule("LINT010", default_severity="warn", summary="concept missing Definition section")
register_rule("LINT011", default_severity="warn", summary="empty markdown heading")
register_rule("LINT012", default_severity="warn", summary="placeholder token in body under strict lint mode")

register_rule("LINT101", default_severity="warn", summary="relation missing group")
register_rule("LINT102", default_severity="warn", summary="relation missing characteristics")
register_rule("LINT103", default_severity="warn", summary="relation missing Domain/Range guidance")
register_rule("LINT110", default_severity="warn", summary="relation missing Definition section")
register_rule("LINT111", default_severity="warn", summary="empty markdown heading")
register_rule("LINT112", default_severity="warn", summary="placeholder token in body under strict lint mode")

register_rule("INV001", default_severity="error", summary="inverse label not found")
register_rule("INV002", default_severity="error", summary="inverse label ambiguous")
register_rule("INV003", default_severity="error", summary="inverse target missing doc")
register_rule("INV010", default_severity="warn", summary="inverse not reciprocal")
register_rule("INV011", default_severity="error", summary="cannot fix inverse in non-path layer")
register_rule("INV012", default_severity="error", summary="cannot fix inverse; missing labels")
register_rule("INV013", default_severity="error", summary="cannot fix inverse; ont not mapping")
register_rule("INV900", default_severity="info", summary="inverse fix applied")
