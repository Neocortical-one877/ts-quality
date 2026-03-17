from __future__ import annotations

from dataclasses import dataclass


RULESET_NAMES = ("dev", "strict")
DEFAULT_RULESET = "dev"


@dataclass(frozen=True)
class RulesetBehavior:
    strict_placeholders: bool
    fail_on_warn: bool


def behavior_for_ruleset(name: str) -> RulesetBehavior:
    if name == "strict":
        return RulesetBehavior(strict_placeholders=True, fail_on_warn=True)
    return RulesetBehavior(strict_placeholders=False, fail_on_warn=False)


def ruleset_from_profile(profile_def: dict | None) -> str | None:
    if not isinstance(profile_def, dict):
        return None
    value = profile_def.get("ruleset")
    if isinstance(value, str) and value in RULESET_NAMES:
        return value
    return None


def effective_ruleset(*, cli_ruleset: str | None, profile_def: dict | None) -> str:
    if isinstance(cli_ruleset, str) and cli_ruleset in RULESET_NAMES:
        return cli_ruleset
    from_profile = ruleset_from_profile(profile_def)
    if from_profile:
        return from_profile
    return DEFAULT_RULESET
