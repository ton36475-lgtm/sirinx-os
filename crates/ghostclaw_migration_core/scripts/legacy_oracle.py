#!/usr/bin/env python3
"""Tiny placeholder oracle for P085 parity harness.

This script intentionally does not import live Telegram or Codex runtime code.
Future packets can replace it with a wrapper around the real frozen Python
handler once that handler accepts a raw command and returns JSON-compatible
output.
"""

from __future__ import annotations

import json
import sys


def handle(command: str) -> dict[str, object]:
    if command.strip() == "/status":
        return {"status": "ok", "command_kind": "status"}
    return {"status": "unsupported", "command_kind": "placeholder_oracle"}


if __name__ == "__main__":
    print(json.dumps(handle(" ".join(sys.argv[1:])), ensure_ascii=False))
