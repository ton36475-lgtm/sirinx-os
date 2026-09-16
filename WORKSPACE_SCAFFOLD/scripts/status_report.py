#!/usr/bin/env python3
"""Status report generator for Pocket Hatchery Agent Factory v4."""
import json
import sys
from pathlib import Path


def main() -> int:
    root = Path(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[1] == "--root" else Path.cwd()
    queue = root / "_A2A_QUEUE"
    counts = {
        "inbox": len(list((queue / "inbox").glob("*.json"))),
        "working": len(list((queue / "working").glob("*.json"))),
        "outbox": len(list((queue / "outbox").glob("*.json"))),
        "done": len(list((queue / "done").glob("*.json"))),
        "blocked": len(list((queue / "blocked").glob("*.json"))),
        "leases": len(list((queue / "working").glob("*.lease"))),
    }
    report = {
        "root": str(root),
        "queue": str(queue),
        "counts": counts,
        "release_gate": json.loads((root / "WORKSPACE_SCAFFOLD" / "config" / "pocket_hatchery_release_gate.json").read_text()),
    }
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
