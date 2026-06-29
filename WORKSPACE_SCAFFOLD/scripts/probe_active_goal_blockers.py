#!/usr/bin/env python3
"""Run read-only probes for active-goal blocker evidence."""
from __future__ import annotations

import argparse
import json
import socket
import sys
from pathlib import Path
from typing import Any, Callable, Iterable

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_ROOTS = [
    Path("/Users/sirinx/Downloads"),
    ROOT,
    Path("/Users/sirinx/project-hermes"),
]
EXPECTED_V3_ARTIFACT = "ghostclaw_repo_merge_kit_v3_3.zip"

BLOCKED_ACTIONS = {
    "deploy": False,
    "push": False,
    "cloud_mutation": False,
    "customer_send": False,
    "secret_read": False,
    "paid_provider_call": False,
    "runtime_queue_execution": False,
    "merge_script_execution": False,
    "install": False,
    "migration": False,
    "wallet_action": False,
    "live_send": False,
}

SECRET_LIKE_NAMES = {".env", ".env.local", ".env.production", ".npmrc"}
SECRET_LIKE_SUFFIXES = (".pem", ".key", ".p12")


class TcpProbeResult:
    def __init__(self, available: bool, error: str | None, host: str, port: int):
        self.available = available
        self.error = error
        self.host = host
        self.port = port

    def to_dict(self) -> dict[str, Any]:
        return {
            "available": self.available,
            "error": self.error,
            "host": self.host,
            "port": self.port,
        }


def is_secret_like(path: Path) -> bool:
    if path.name in SECRET_LIKE_NAMES:
        return True
    if path.name.endswith(SECRET_LIKE_SUFFIXES):
        return True
    return any(part in SECRET_LIKE_NAMES for part in path.parts)


def candidate_kind(path: Path) -> str | None:
    name = path.name
    lower_name = name.lower()
    if name == EXPECTED_V3_ARTIFACT:
        return "exact_v3_3_artifact"
    if lower_name.startswith("chatgpt-export") and lower_name.endswith((".json", ".zip", ".html")):
        return "chat_export_candidate"
    if lower_name in {"conversations.json", "chat.html"}:
        return "chat_export_candidate"
    return None


def iter_candidate_files(roots: Iterable[Path], max_candidates: int = 50) -> list[dict[str, str]]:
    candidates: list[dict[str, str]] = []
    for root in roots:
        if not root.exists():
            continue
        try:
            paths = root.rglob("*") if root.is_dir() else [root]
            for path in paths:
                if len(candidates) >= max_candidates:
                    return candidates
                if not path.is_file():
                    continue
                kind = candidate_kind(path)
                if not kind:
                    continue
                candidates.append(
                    {
                        "kind": kind,
                        "basename": path.name,
                        "path": str(path),
                    }
                )
        except (OSError, PermissionError) as exc:
            candidates.append(
                {
                    "kind": "scan_error",
                    "basename": root.name,
                    "path": str(root),
                    "error": exc.__class__.__name__,
                }
            )
    return candidates


def tcp_probe(host: str, port: int, timeout: float = 1.0) -> TcpProbeResult:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return TcpProbeResult(available=True, error=None, host=host, port=port)
    except OSError as exc:
        return TcpProbeResult(available=False, error=exc.__class__.__name__, host=host, port=port)


def completion_blockers(
    *,
    hermes_gateway_available: bool,
    artifact_candidates: list[dict[str, str]],
    chat_export_candidates: list[dict[str, str]],
) -> list[dict[str, str]]:
    return [
        {
            "id": "BLOCK-CHAT-EXPORT",
            "status": "open" if not chat_export_candidates else "candidate_found_requires_intake_validation",
            "required_evidence": "Connector-backed export or metadata-only intake map from an operator-supplied export.",
        },
        {
            "id": "BLOCK-LANE1-OPUS-PACKET",
            "status": "open",
            "required_evidence": "Final Opus architecture packet plus validated Hermes decision record.",
        },
        {
            "id": "BLOCK-HERMES-GATEWAY",
            "status": "open" if not hermes_gateway_available else "candidate_found_requires_status_doc_update",
            "required_evidence": "Read-only Hermes gateway health/status proof or approved local-only alternative.",
        },
        {
            "id": "BLOCK-V3-3-ARTIFACT",
            "status": "open" if not artifact_candidates else "candidate_found_requires_artifact_gate_validation",
            "required_evidence": "Exact v3.3 zip and bundled policy test pass evidence.",
        },
        {
            "id": "BLOCK-R0-APPROVALS",
            "status": "open",
            "required_evidence": "One valid gate-specific approval packet per R0 action.",
        },
    ]


def build_probe_snapshot(
    roots: Iterable[Path] | None = None,
    gateway_host: str = "127.0.0.1",
    gateway_port: int = 9000,
    timeout: float = 1.0,
    gateway_probe: Callable[[str, int, float], TcpProbeResult] = tcp_probe,
) -> dict[str, Any]:
    roots = list(roots or DEFAULT_ROOTS)
    candidates = iter_candidate_files(roots)
    artifact_candidates = [item for item in candidates if item["kind"] == "exact_v3_3_artifact"]
    chat_export_candidates = [item for item in candidates if item["kind"] == "chat_export_candidate"]
    gateway = gateway_probe(gateway_host, gateway_port, timeout)

    return {
        "schema": "sirinx.active_goal.read_only_probe.v1",
        "status": "probe_completed_local_only",
        "local_read_only": True,
        "claims_goal_complete": False,
        "claims_all_chats_read": False,
        "external_action_authorized": False,
        "merge_script_execution": False,
        "install_or_migration": False,
        "secret_like_files_read": [],
        "scanned_roots": [str(root) for root in roots],
        "hermes_gateway_probe": gateway.to_dict(),
        "hermes_gateway_available": gateway.available,
        "exact_v3_3_artifact_found": bool(artifact_candidates),
        "chat_export_candidate_found": bool(chat_export_candidates),
        "artifact_candidates": artifact_candidates,
        "chat_export_candidates": chat_export_candidates,
        "completion_blockers": completion_blockers(
            hermes_gateway_available=gateway.available,
            artifact_candidates=artifact_candidates,
            chat_export_candidates=chat_export_candidates,
        ),
        "blocked_actions": dict(BLOCKED_ACTIONS),
        "notes": "Read-only filename/TCP probe only. Candidate discovery does not clear blockers or authorize actions.",
    }


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", action="append", dest="roots", help="Root to scan by filename only.")
    parser.add_argument("--gateway-host", default="127.0.0.1")
    parser.add_argument("--gateway-port", type=int, default=9000)
    parser.add_argument("--timeout", type=float, default=1.0)
    parser.add_argument("--output", help="Optional JSON output path.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    roots = [Path(root) for root in args.roots] if args.roots else DEFAULT_ROOTS
    snapshot = build_probe_snapshot(
        roots=roots,
        gateway_host=args.gateway_host,
        gateway_port=args.gateway_port,
        timeout=args.timeout,
    )
    rendered = json.dumps(snapshot, indent=2, sort_keys=True)
    if args.output:
        output = Path(args.output)
        if not output.is_absolute():
            output = ROOT / output
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(rendered + "\n", encoding="utf-8")
    print(rendered)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
