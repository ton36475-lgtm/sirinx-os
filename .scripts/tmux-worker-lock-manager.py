#!/usr/bin/env python3
"""Generate a Phase 5C lock-and-worker dispatch preview.

This preparation artifact intentionally performs no network or tmux action.
"""

from __future__ import annotations

import argparse
import json


COMMANDS: dict[str, tuple[str, ...]] = {
    "queue-status": ("scripts/a2a2a-sync", "status"),
    "rust-check": (
        "cargo",
        "check",
        "--manifest-path",
        "crates/ghostclaw_migration_core/Cargo.toml",
        "--offline",
        "--locked",
    ),
    "phase5a-validate": (
        "python3",
        "WORKSPACE_SCAFFOLD/scripts/validate_phase_5a_orchestrator.py",
    ),
}
WORKERS = frozenset({"claude-worker", "opencode-worker", "codex-worker"})


def build_preview(worker: str, command_id: str, ttl_ms: int) -> dict[str, object]:
    if worker not in WORKERS:
        raise ValueError("worker is not allow-listed")
    if command_id not in COMMANDS:
        raise ValueError("command_id is not allow-listed")
    if not 1_000 <= ttl_ms <= 300_000:
        raise ValueError("ttl_ms is outside the supported range")
    return {
        "schema": "sirinx.tmux-worker.preview.v1",
        "status": "DRY_RUN",
        "worker": worker,
        "command_id": command_id,
        "argv": list(COMMANDS[command_id]),
        "ttl_ms": ttl_ms,
        "network_allowed": False,
        "tmux_allowed": False,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="SIRINX tmux worker preview")
    parser.add_argument("--worker", choices=sorted(WORKERS), required=True)
    parser.add_argument("--command-id", choices=sorted(COMMANDS), required=True)
    parser.add_argument("--ttl-ms", type=int, default=45_000)
    args = parser.parse_args()
    print(
        json.dumps(
            build_preview(args.worker, args.command_id, args.ttl_ms),
            indent=2,
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
