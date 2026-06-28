#!/usr/bin/env python3
"""Queue router for Pocket Hatchery Agent Factory v4."""
import json
import sys
from pathlib import Path


def main() -> int:
    root = Path(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[1] == "--root" else Path.cwd()
    inbox = root / "_A2A_QUEUE" / "inbox"
    safe_agents = {"hermes", "codex", "opus", "kob"}
    for path in sorted(inbox.glob("packet_*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        if data.get("risk") in ("safe", "medium") and data.get("agent") in safe_agents and not data.get("approval_required"):
            target = root / "_A2A_QUEUE" / "working" / path.name
            path.rename(target)
            print(f"routed: {path.name} -> working/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
