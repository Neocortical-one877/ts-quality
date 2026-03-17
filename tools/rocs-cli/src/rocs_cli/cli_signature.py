from __future__ import annotations

from dataclasses import dataclass

from rocs_cli.cli import build_parser


@dataclass(frozen=True)
class CliCommandSig:
    name: str
    option_strings: tuple[str, ...]


def _sorted_unique(xs: list[str]) -> tuple[str, ...]:
    seen: set[str] = set()
    out: list[str] = []
    for x in xs:
        if x in seen:
            continue
        seen.add(x)
        out.append(x)
    return tuple(sorted(out))


def cli_signature() -> dict:
    """Deterministic, machine-readable CLI signature for doc/tests.

    Intent:
    - validate docs against *actual* argparse wiring
    - avoid parsing terminal output (too platform/version fragile)
    """

    parser = build_parser()

    global_opts: list[str] = []
    subcommands: dict[str, CliCommandSig] = {}

    subparsers_action = None
    for a in getattr(parser, "_actions", []):
        if getattr(a, "dest", None) == "cmd" and getattr(a, "choices", None) is not None:
            subparsers_action = a
            continue
        if getattr(a, "option_strings", None):
            global_opts.extend([str(s) for s in a.option_strings])

    if subparsers_action is not None:
        for name, subp in sorted(subparsers_action.choices.items()):
            opts: list[str] = []
            for a in getattr(subp, "_actions", []):
                if getattr(a, "option_strings", None):
                    opts.extend([str(s) for s in a.option_strings])
            subcommands[name] = CliCommandSig(name=name, option_strings=_sorted_unique(opts))

    return {
        "global_options": _sorted_unique(global_opts),
        "commands": {k: {"option_strings": list(v.option_strings)} for k, v in sorted(subcommands.items())},
    }
