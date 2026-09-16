#!/usr/bin/env python3
from pathlib import Path
import json, sys

ROOT = Path(__file__).resolve().parents[1]

REQUIRED = [
    "AGENTS_MODEL_ROUTER_ADDENDUM.md",
    "CLAUDE_MODEL_ROUTER_ADDENDUM.md",
    "configs/model_router.registry.yaml",
    "configs/hermes_model_router.config.yaml",
    "docs/model-routing/MODEL_REGISTRY.md",
    "docs/model-routing/ROUTING_MATRIX.md",
    "docs/model-routing/PROVIDER_POLICY.md",
    "docs/model-routing/OPENROUTER_SETUP.md",
    "docs/receipts/model_router_receipt.schema.json",
    "skills/coding-model-router/SKILL.md",
]

def main():
    missing = [p for p in REQUIRED if not (ROOT / p).exists()]
    if missing:
        print("INVALID missing files:")
        for p in missing:
            print(" -", p)
        return 2
    schema = json.loads((ROOT / "docs/receipts/model_router_receipt.schema.json").read_text())
    assert schema["title"] == "GhostClaw Model Router Receipt"
    print("OK: GhostClaw coding model router pack validated.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
