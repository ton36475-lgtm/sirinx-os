#!/usr/bin/env python3
"""CMUX CLI packet previewer.

The former dispatcher interpolated packet goals into shell commands and called
provider-backed CLIs. This containment version is deliberately read-only: it
previews assigned packets and has no execution mode or approval bypass.
"""

import json
import re
from pathlib import Path

WS = Path("/Users/sirinx/sirinx-os")
KNOWN_TIERS = {"A", "B", "C", "D", "X"}
MAX_PACKET_BYTES = 65_536
ACTION_TIER_FLOORS = {
    "read_local": "A",
    "validate_local": "B",
    "write_local_scoped": "C",
    "install": "D",
    "provider_call": "D",
    "live_send": "D",
    "git_push": "D",
    "deploy": "D",
    "cloud_mutation": "D",
    "production_db_mutation": "D",
}
HARD_DENY_ACTION_TYPES = {"secret_access"}
TIER_ORDER = {"A": 0, "B": 1, "C": 2, "D": 3, "X": 4}
RESTRICTED_ACTION_RE = re.compile(
    r"(?:\b(?:install|provider|omniroute|send|message|telegram|publish|push|commit|"
    r"deploy|cloud|dns|database|migration|price|promo|shipment|refund|claim|"
    r"purchase|payment|financial|customer|secret|credential|token|cookie)\w*\b|"
    r"\.env\b|auth\.json\b|config\.yaml\b|"
    r"\bgit\s+add\b)",
    re.IGNORECASE,
)
HARD_DENY_RE = re.compile(
    r"(?:\b(?:uncensored|jailbreak|bypass|captcha|mfa|secret|credential|token|cookie)\w*\b|"
    r"\.env\b|auth\.json\b|config\.yaml\b|\bforce\s+push\b|\brm\s+-rf\b)",
    re.IGNORECASE,
)


def normalize_tier(value):
    if not isinstance(value, str):
        return "X"
    tier = value.strip().upper()
    return tier if tier in KNOWN_TIERS else "X"


def packet_scan_text(data):
    try:
        scan_text = json.dumps(data, ensure_ascii=False, sort_keys=True)
    except (TypeError, ValueError):
        return None
    if len(scan_text.encode("utf-8")) > MAX_PACKET_BYTES:
        return None
    return scan_text


def declared_action_type(data):
    candidates = []
    for container in (data, data.get("payload"), data.get("manifest"), data.get("action")):
        if not isinstance(container, dict):
            continue
        for key in ("action_type", "actionType"):
            value = container.get(key)
            if isinstance(value, str) and value.strip():
                candidates.append(value.strip().lower())
    unique = set(candidates)
    if len(unique) != 1:
        return None
    action_type = unique.pop()
    if action_type not in ACTION_TIER_FLOORS and action_type not in HARD_DENY_ACTION_TYPES:
        return None
    return action_type


def packet_preview(data):
    context = data.get("context", {})
    goal = context.get("goal", "") if isinstance(context, dict) else context
    if isinstance(goal, dict):
        goal = goal.get("title", goal.get("project", "task"))
    goal = str(goal)[:200]

    safety = data.get("safety", {})
    if not isinstance(safety, dict):
        safety = {}
    tier = normalize_tier(safety.get("tier", data.get("tier")))
    scan_text = packet_scan_text(data)
    action_type = declared_action_type(data)
    restricted_action = scan_text is None or bool(RESTRICTED_ACTION_RE.search(scan_text))
    hard_deny = scan_text is None or bool(HARD_DENY_RE.search(scan_text))
    if hard_deny or action_type is None or action_type in HARD_DENY_ACTION_TYPES:
        tier = "X"
    elif tier in {"A", "B"} and safety.get("allowed") is not True:
        tier = "X"
    elif tier != "X":
        floor = ACTION_TIER_FLOORS[action_type]
        if TIER_ORDER[floor] > TIER_ORDER[tier]:
            tier = floor
        if restricted_action and TIER_ORDER["D"] > TIER_ORDER[tier]:
            tier = "D"
    blocked = tier in {"C", "D", "X"} or restricted_action
    return {
        "tier": tier,
        "goal": goal,
        "status": (
            "QUARANTINED_NOT_APPROVABLE"
            if tier == "X"
            else "BLOCKED_PENDING_EXTERNAL_APPROVAL"
            if blocked
            else "PREVIEW_ONLY"
        ),
    }


def run_codex(goal):
    """Compatibility shim: external CLI execution is disabled."""
    return False, "BLOCKED: Codex/provider execution disabled; preview only"


def run_opencode(goal):
    """Compatibility shim: external CLI execution is disabled."""
    return False, "BLOCKED: OpenCode/provider execution disabled; preview only"


def main():
    print("CMUX CLI preview only; no packets will execute or move")
    for agent in ["codex", "opencode"]:
        assigned = WS / "_A2A_QUEUE" / "assigned" / agent
        packets = sorted(assigned.glob("*.json"))
        print(f"=== {agent.upper()}: {len(packets)} packets ===")

        for packet_path in packets:
            try:
                data = json.loads(packet_path.read_text())
                preview = packet_preview(data)
                print(
                    f"  {packet_path.name[:40]} "
                    f"tier={preview['tier']} status={preview['status']}"
                )
            except (OSError, json.JSONDecodeError) as exc:
                print(f"  {packet_path.name[:40]} tier=X status=BLOCKED_INVALID_PACKET ({exc})")


if __name__ == "__main__":
    main()
