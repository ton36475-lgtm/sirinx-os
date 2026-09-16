#!/usr/bin/env python3
"""Fail-closed compatibility shim for the retired Python Telegram handler."""

import json


STATUS = {
    "status": "blocked_duplicate_telegram_handler",
    "network_listener_started": False,
    "approval_written": False,
    "dispatch_started": False,
    "canonical_router": (
        "services/dev-control-api/src/telegram-command-router.mjs"
    ),
    "reason": "Telegram commands must pass through the canonical Hermes router.",
}


def main() -> int:
    print(json.dumps(STATUS, sort_keys=True))
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
