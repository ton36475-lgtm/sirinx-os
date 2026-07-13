#!/usr/bin/env python3
"""Generate a local-only P101 architecture map, Canvas, and receipt."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
from hashlib import sha256
import json
from pathlib import Path
import sys
from typing import Any


SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from repo_inventory import build_repo_inventory  # noqa: E402


def _read_config(repo_root: Path) -> dict[str, Any]:
    path = repo_root / "GHOSTCLAW" / "P101" / "p101-config.json"
    parsed = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(parsed, dict):
        raise ValueError("P101 config must be a JSON object")
    return parsed


def build_architecture_map(
    repo_root: Path,
    *,
    phase: str = "BASELINE",
    tmux_snapshot: str | None = None,
    canvas_requested: bool = False,
) -> dict[str, Any]:
    normalized_phase = phase.strip().upper()
    if normalized_phase != "BASELINE":
        raise ValueError("only BASELINE is supported by the read-only initializer")

    config = _read_config(repo_root)
    inventory = build_repo_inventory(repo_root, tmux_snapshot)
    configured_teams = config.get("teams", [])
    if not isinstance(configured_teams, list) or not all(
        isinstance(team, str) for team in configured_teams
    ):
        raise ValueError("P101 teams must be a list of strings")
    observed_sessions = inventory["tmux"]["sessions"]
    observed_workers = sorted(set(configured_teams).intersection(observed_sessions))

    return {
        "schema": "sirinx.p101.architecture-map.v2",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "phase": normalized_phase,
        "mission_id": config.get("mission_id"),
        "mode": config.get("mode"),
        "inventory": inventory,
        "worker_plane": {
            "configured": configured_teams,
            "sessions_observed": observed_workers,
            "execution_verified": False,
            "reason": "session_presence_does_not_prove_task_execution",
        },
        "memory_plane": {
            "canonical_sync_helper": config.get("canonical_obsidian_sync"),
            "direct_note_append_allowed": False,
            "canvas_requested": canvas_requested,
        },
        "lock_plane": {
            "cloudflare_durable_object_configured": False,
            "distributed_lock_verified": False,
            "local_preview_only": True,
        },
        "safety": {
            "tmux_dispatch": False,
            "provider_call": False,
            "network_write": False,
            "cloud_mutation": False,
            "secret_access": False,
            "direct_obsidian_append": False,
        },
    }


def build_canvas(architecture: dict[str, Any]) -> dict[str, Any]:
    rust_crates = architecture["inventory"]["manifests"]["cargo"]
    sessions = architecture["worker_plane"]["sessions_observed"]
    nodes: list[dict[str, Any]] = [
        {
            "id": "p101",
            "type": "text",
            "text": "P101 BASELINE\nLocal evidence only",
            "x": 0,
            "y": 0,
            "width": 300,
            "height": 120,
        },
        {
            "id": "memory",
            "type": "text",
            "text": "Obsidian Brain\nCanonical helper only",
            "x": 420,
            "y": -180,
            "width": 300,
            "height": 120,
        },
        {
            "id": "locks",
            "type": "text",
            "text": "Lock Plane\nPreview only; remote lock unverified",
            "x": 420,
            "y": 180,
            "width": 320,
            "height": 120,
        },
    ]
    edges = [
        {"id": "p101-memory", "fromNode": "p101", "toNode": "memory"},
        {"id": "p101-locks", "fromNode": "p101", "toNode": "locks"},
    ]
    for index, session in enumerate(sessions):
        node_id = f"worker-{index}"
        nodes.append(
            {
                "id": node_id,
                "type": "text",
                "text": f"{session}\nSession observed; execution unverified",
                "x": -440,
                "y": -180 + index * 160,
                "width": 320,
                "height": 110,
            }
        )
        edges.append({"id": f"{node_id}-p101", "fromNode": node_id, "toNode": "p101"})
    for index, crate in enumerate(rust_crates):
        node_id = f"rust-{index}"
        nodes.append(
            {
                "id": node_id,
                "type": "text",
                "text": f"Rust crate\n{crate['name']}\n{crate['path']}",
                "x": 820,
                "y": index * 170,
                "width": 340,
                "height": 130,
            }
        )
        edges.append({"id": f"p101-{node_id}", "fromNode": "p101", "toNode": node_id})
    return {"nodes": nodes, "edges": edges}


def _write_json(path: Path, value: Any) -> bytes:
    encoded = (json.dumps(value, indent=2, sort_keys=True) + "\n").encode("utf-8")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(encoded)
    return encoded


def generate_artifacts(
    repo_root: Path,
    output: Path,
    receipt: Path,
    *,
    phase: str = "BASELINE",
    tmux_snapshot: str | None = None,
    canvas_output: Path | None = None,
    inventory_output: Path | None = None,
) -> dict[str, Any]:
    architecture = build_architecture_map(
        repo_root,
        phase=phase,
        tmux_snapshot=tmux_snapshot,
        canvas_requested=canvas_output is not None,
    )
    encoded = _write_json(output, architecture)
    inventory_sha256 = None
    if inventory_output is not None:
        inventory_sha256 = sha256(
            _write_json(inventory_output, architecture["inventory"])
        ).hexdigest()
    canvas_sha256 = None
    if canvas_output is not None:
        canvas_sha256 = sha256(_write_json(canvas_output, build_canvas(architecture))).hexdigest()
    receipt_value = {
        "schema": "sirinx.p101.baseline-receipt.v2",
        "generated_at": architecture["generated_at"],
        "phase": architecture["phase"],
        "status": "local_evidence_generated",
        "architecture_map": str(output),
        "architecture_map_sha256": sha256(encoded).hexdigest(),
        "inventory": str(inventory_output) if inventory_output else None,
        "inventory_sha256": inventory_sha256,
        "canvas": str(canvas_output) if canvas_output else None,
        "canvas_sha256": canvas_sha256,
        "live_actions": {
            "tmux_dispatch": False,
            "provider_call": False,
            "network_write": False,
            "cloud_mutation": False,
            "secret_access": False,
        },
    }
    _write_json(receipt, receipt_value)
    return receipt_value


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, required=True)
    parser.add_argument("--phase", default="BASELINE")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--receipt", type=Path, required=True)
    parser.add_argument("--canvas-output", type=Path)
    parser.add_argument("--inventory-output", type=Path)
    parser.add_argument("--tmux-snapshot-file", type=Path)
    args = parser.parse_args()
    snapshot = (
        args.tmux_snapshot_file.read_text(encoding="utf-8")
        if args.tmux_snapshot_file
        else None
    )
    result = generate_artifacts(
        args.repo.resolve(),
        args.output.resolve(),
        args.receipt.resolve(),
        phase=args.phase,
        tmux_snapshot=snapshot,
        canvas_output=args.canvas_output.resolve() if args.canvas_output else None,
        inventory_output=(
            args.inventory_output.resolve() if args.inventory_output else None
        ),
    )
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
