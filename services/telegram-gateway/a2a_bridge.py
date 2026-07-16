#!/usr/bin/env python3
"""Fail-closed compatibility shim for the retired direct A2A dispatcher."""

import json


STATUS = {
    "status": "blocked_direct_a2a_dispatch",
    "packet_written": False,
    "worker_dispatched": False,
    "coordination_policy": "configs/ghostclaw_agent_coordination.config.json",
    "reason": "Hermes must issue a validated task envelope and path lease.",
}


def main() -> int:
    print(json.dumps(STATUS, sort_keys=True))
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
