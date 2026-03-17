from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from rocs_cli.model import OntDoc


@dataclass(frozen=True)
class GraphEdge:
    src: str
    rel: str
    dst: str


def build_edges(concepts: dict[str, OntDoc], *, rel_filter: set[str] | None) -> list[GraphEdge]:
    edges: list[GraphEdge] = []
    for cid, cdoc in concepts.items():
        rels = cdoc.ont.get("relations") or []
        if not isinstance(rels, list):
            continue
        for edge in rels:
            if not isinstance(edge, dict):
                continue
            rtype = str(edge.get("type") or "")
            target = str(edge.get("target") or "")
            if not rtype or not target:
                continue
            if rel_filter is not None and rtype not in rel_filter:
                continue
            edges.append(GraphEdge(src=cid, rel=rtype, dst=target))
    return edges


def collapse_nodes(nodes: list[str], edges: list[GraphEdge], *, prefixes: list[str]) -> tuple[list[str], list[GraphEdge]]:
    if not prefixes:
        return nodes, edges
    prefixes = [p.strip().rstrip(".") for p in prefixes if p.strip()]
    if not prefixes:
        return nodes, edges

    def map_id(cid: str) -> str:
        for p in prefixes:
            if cid == p or cid.startswith(p + "."):
                return p + ".*"
        return cid

    mapped_nodes = {map_id(n) for n in nodes}
    mapped_edges: set[tuple[str, str, str]] = set()
    for e in edges:
        mapped_edges.add((map_id(e.src), e.rel, map_id(e.dst)))
    out_edges = [GraphEdge(src=a, rel=r, dst=b) for (a, r, b) in sorted(mapped_edges)]
    return sorted(mapped_nodes), out_edges


def compute_layout(nodes: list[str], edges: list[GraphEdge], *, layout: str) -> dict[str, tuple[float, float]]:
    if layout not in ("grid", "dag"):
        raise ValueError("layout must be grid|dag")
    if layout == "grid":
        cols = 6
        dx, dy = 280.0, 140.0
        out: dict[str, tuple[float, float]] = {}
        for i, n in enumerate(nodes):
            row, col = divmod(i, cols)
            out[n] = (col * dx, row * dy)
        return out

    # dag: best-effort layering using is_a edges; fallback to grid if cyclic.
    parents: dict[str, set[str]] = {n: set() for n in nodes}
    children: dict[str, set[str]] = {n: set() for n in nodes}
    for e in edges:
        if e.rel != "is_a":
            continue
        if e.src in parents and e.dst in parents:
            parents[e.src].add(e.dst)
            children[e.dst].add(e.src)

    indeg = {n: len(parents[n]) for n in nodes}
    queue = [n for n in nodes if indeg[n] == 0]
    queue.sort()
    topo: list[str] = []
    while queue:
        n = queue.pop(0)
        topo.append(n)
        for c in sorted(children.get(n, set())):
            indeg[c] -= 1
            if indeg[c] == 0:
                queue.append(c)
                queue.sort()

    if len(topo) != len(nodes):
        return compute_layout(nodes, edges, layout="grid")

    depth: dict[str, int] = {n: 0 for n in nodes}
    for n in topo:
        if not parents[n]:
            depth[n] = 0
        else:
            depth[n] = 1 + max(depth[p] for p in parents[n])

    layers: dict[int, list[str]] = {}
    for n in nodes:
        layers.setdefault(depth[n], []).append(n)
    for k in layers:
        layers[k].sort()

    dx, dy = 320.0, 120.0
    out: dict[str, tuple[float, float]] = {}
    for d in sorted(layers.keys()):
        for i, n in enumerate(layers[d]):
            out[n] = (d * dx, i * dy)
    return out


def export_dot(nodes: list[str], edges: list[GraphEdge]) -> str:
    lines = ["digraph rocs {", "  rankdir=LR;"]
    for n in nodes:
        lines.append(f'  "{n}";')
    for e in edges:
        lines.append(f'  "{e.src}" -> "{e.dst}" [label="{e.rel}"];')
    lines.append("}")
    return "\n".join(lines) + "\n"


def export_excalidraw(nodes: list[str], edges: list[GraphEdge], *, layout: dict[str, tuple[float, float]]) -> dict:
    # Minimal Excalidraw-like JSON: deterministic ids + stable layout.
    elements: list[dict] = []
    for i, n in enumerate(nodes):
        x, y = layout.get(n, (0.0, 0.0))
        rid = f"rect_{i}"
        tid = f"text_{i}"
        w = max(160.0, min(360.0, 10.0 * len(n) + 60.0))
        h = 60.0
        elements.append(
            {
                "id": rid,
                "type": "rectangle",
                "x": x,
                "y": y,
                "width": w,
                "height": h,
                "angle": 0,
                "strokeColor": "#1e1e1e",
                "backgroundColor": "transparent",
                "fillStyle": "solid",
                "strokeWidth": 1,
                "strokeStyle": "solid",
                "roughness": 0,
                "opacity": 100,
                "groupIds": [],
                "seed": 1 + i,
                "version": 1,
                "versionNonce": 1 + i,
                "isDeleted": False,
                "boundElements": [],
                "updated": 1,
                "link": None,
                "locked": False,
            }
        )
        elements.append(
            {
                "id": tid,
                "type": "text",
                "x": x + 10,
                "y": y + 20,
                "width": w - 20,
                "height": 20,
                "angle": 0,
                "strokeColor": "#1e1e1e",
                "backgroundColor": "transparent",
                "fillStyle": "solid",
                "strokeWidth": 1,
                "strokeStyle": "solid",
                "roughness": 0,
                "opacity": 100,
                "groupIds": [],
                "seed": 10_000 + i,
                "version": 1,
                "versionNonce": 10_000 + i,
                "isDeleted": False,
                "boundElements": [],
                "updated": 1,
                "link": None,
                "locked": False,
                "text": n,
                "fontSize": 16,
                "fontFamily": 1,
                "textAlign": "left",
                "verticalAlign": "middle",
                "baseline": 18,
            }
        )

    for j, e in enumerate(edges):
        if e.src not in layout or e.dst not in layout:
            continue
        sx, sy = layout[e.src]
        tx, ty = layout[e.dst]
        start = (sx + 80.0, sy + 30.0)
        end = (tx + 80.0, ty + 30.0)
        x = min(start[0], end[0])
        y = min(start[1], end[1])
        points = [[start[0] - x, start[1] - y], [end[0] - x, end[1] - y]]
        elements.append(
            {
                "id": f"arrow_{j}",
                "type": "arrow",
                "x": x,
                "y": y,
                "width": abs(end[0] - start[0]),
                "height": abs(end[1] - start[1]),
                "angle": 0,
                "strokeColor": "#1e1e1e",
                "backgroundColor": "transparent",
                "fillStyle": "solid",
                "strokeWidth": 1,
                "strokeStyle": "solid",
                "roughness": 0,
                "opacity": 100,
                "groupIds": [],
                "seed": 20_000 + j,
                "version": 1,
                "versionNonce": 20_000 + j,
                "isDeleted": False,
                "boundElements": [],
                "updated": 1,
                "link": None,
                "locked": False,
                "points": points,
                "lastCommittedPoint": None,
                "startBinding": None,
                "endBinding": None,
                "startArrowhead": None,
                "endArrowhead": "arrow",
            }
        )

    return {"type": "excalidraw", "version": 2, "source": "rocs", "elements": elements, "appState": {}, "files": {}}


def export_excalidraw_cli_json(nodes: list[str], edges: list[GraphEdge], *, direction: str) -> dict:
    out_nodes = [{"id": n, "type": "rectangle", "label": n} for n in nodes]
    out_edges = [{"from": e.src, "to": e.dst, "label": e.rel} for e in edges]
    return {"nodes": out_nodes, "edges": out_edges, "options": {"direction": direction, "nodeSpacing": 60}}


def write_graph(
    out_path: Path,
    *,
    fmt: str,
    nodes: list[str],
    edges: list[GraphEdge],
    layout: dict[str, tuple[float, float]],
    direction: str = "LR",
) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    if fmt == "dot":
        out_path.write_text(export_dot(nodes, edges), "utf-8")
        return
    if fmt == "json":
        payload = {"nodes": nodes, "edges": [e.__dict__ for e in edges]}
        out_path.write_text(json.dumps(payload, indent=2) + "\n", "utf-8")
        return
    if fmt == "excalidraw":
        out_path.write_text(json.dumps(export_excalidraw(nodes, edges, layout=layout), indent=2) + "\n", "utf-8")
        return
    if fmt == "excalidraw-cli-json":
        out_path.write_text(json.dumps(export_excalidraw_cli_json(nodes, edges, direction=direction), indent=2) + "\n", "utf-8")
        return
    raise ValueError(f"unknown format: {fmt}")
