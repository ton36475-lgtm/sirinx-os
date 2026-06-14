#!/usr/bin/env python3
"""Optional local turbovec probe for SIRINX Local RAG.

This worker is intentionally local-only. It never calls network services,
never reads secrets by itself, and expects the Node safe-corpus scanner to
provide already-sanitized documents before any future indexing path uses it.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from typing import Any


def turbovec_status() -> dict[str, Any]:
    available = importlib.util.find_spec("turbovec") is not None
    return {
        "status": "available" if available else "missing",
        "package": "turbovec",
        "optional": True,
        "canCallPaidApi": False,
        "canRunMcp": False,
        "canReadSecrets": False,
        "externalWrites": False,
        "installHint": None if available else "pip install turbovec",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="SIRINX local-only turbovec probe")
    parser.add_argument("--status", action="store_true", help="Report optional turbovec dependency status.")
    args = parser.parse_args()

    if args.status:
        print(json.dumps(turbovec_status(), indent=2, sort_keys=True))
        return 0

    print(
        json.dumps(
            {
                "status": "no_action_selected",
                "externalWrites": False,
                "canCallPaidApi": False,
                "canRunMcp": False,
                "canReadSecrets": False,
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
