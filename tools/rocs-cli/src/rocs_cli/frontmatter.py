from __future__ import annotations

import re
from pathlib import Path

import yaml


FRONT_RE = re.compile(r"^---\n(.*?)\n---\n", re.S)


def split_frontmatter(text: str) -> tuple[dict | None, str]:
    m = FRONT_RE.match(text)
    if not m:
        return None, text
    fm = yaml.safe_load(m.group(1)) or {}
    return fm, text[m.end() :]


def load_frontmatter(path: Path) -> tuple[dict, str]:
    text = path.read_text("utf-8")
    try:
        fm, body = split_frontmatter(text)
    except yaml.YAMLError as e:
        raise ValueError(f"invalid front matter YAML: {path}: {e}") from e
    if fm is None:
        raise ValueError(f"missing front matter: {path}")
    return fm, body


def dump_frontmatter(fm: dict) -> str:
    y = yaml.safe_dump(fm, sort_keys=False, allow_unicode=True)
    if not y.endswith("\n"):
        y += "\n"
    return f"---\n{y}---\n"


def write_doc(path: Path, fm: dict, body: str) -> None:
    front = dump_frontmatter(fm)
    if body and not body.startswith("\n"):
        body = "\n" + body
    path.write_text(front + body, "utf-8")

