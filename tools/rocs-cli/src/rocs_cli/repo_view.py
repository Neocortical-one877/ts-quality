from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from rocs_cli.errors import RocsCliError
from rocs_cli.layers import LayerSpec, repo_root as _repo_root, resolve_layers
from rocs_cli.model import OntDoc, collect_docs


@dataclass(frozen=True)
class RepoView:
    repo: Path
    layers: list[LayerSpec]
    meta: dict[str, Any]
    concepts: dict[str, OntDoc]
    relations: dict[str, OntDoc]


def _system_exit_message(exc: SystemExit) -> str | None:
    code = exc.code
    if isinstance(code, str):
        msg = code.strip()
        return msg or None
    return None


def load_repo_view(
    repo: str | Path,
    *,
    profile: str | None,
    resolve_refs: bool,
    workspace_root: str | None = None,
    workspace_ref_mode: str | None = None,
    only: str | None = None,
    layer: str | None = None,
    load_docs: bool = True,
) -> RepoView:
    repo_path = _repo_root(str(repo))
    layers, meta = resolve_layers(
        repo_path,
        profile=profile,
        resolve_refs=resolve_refs,
        workspace_root=workspace_root,
        workspace_ref_mode=workspace_ref_mode,
        only=only,
        layer=layer,
    )

    concepts: dict[str, OntDoc] = {}
    relations: dict[str, OntDoc] = {}
    if load_docs:
        try:
            concepts, relations = collect_docs(layers)
        except RocsCliError:
            raise
        except ValueError as e:
            raise RocsCliError(kind="content", message=str(e)) from e
        except SystemExit as e:
            message = _system_exit_message(e) or "invalid ontology content"
            raise RocsCliError(kind="content", message=message) from None

    return RepoView(repo=repo_path, layers=layers, meta=meta, concepts=concepts, relations=relations)
