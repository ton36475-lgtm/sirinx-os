#!/usr/bin/env python3
"""
SIRINX containment loop.

This loop never approves packets, changes a restricted tier to an auto-runnable
tier, or performs git operations. Restricted and ambiguous packets are marked
fail-closed before the local dispatcher is asked to route eligible work.
"""

import json
import re
import subprocess
from pathlib import Path

WS = Path("/Users/sirinx/sirinx-os")
A2A = WS / "_A2A_QUEUE"

KNOWN_TIERS = {"A", "B", "C", "D", "X"}
AUTO_TIERS = {"A", "B"}
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


def panic_check():
    return (WS / ".hermes" / "panic.flag").exists()


def normalize_tier(value):
    """Return a known tier; missing, malformed, and unknown values become X."""
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


def restricted_action_present(data):
    """Defense in depth after the closed structured action check."""
    scan_text = packet_scan_text(data)
    return scan_text is None or bool(RESTRICTED_ACTION_RE.search(scan_text))


def hard_deny_present(data):
    scan_text = packet_scan_text(data)
    return scan_text is None or bool(HARD_DENY_RE.search(scan_text))


def effective_packet_tier(data):
    """Require explicit allow evidence and round recognized risk upward."""
    if packet_scan_text(data) is None:
        return "X"
    action_type = declared_action_type(data)
    if action_type is None or action_type in HARD_DENY_ACTION_TYPES:
        return "X"
    safety = data.get("safety")
    if not isinstance(safety, dict):
        safety = {}
    tier = normalize_tier(safety.get("tier", data.get("tier")))
    if hard_deny_present(data):
        return "X"
    if tier in AUTO_TIERS and safety.get("allowed") is not True:
        return "X"
    if tier == "X":
        return "X"
    floor = ACTION_TIER_FLOORS[action_type]
    effective = floor if TIER_ORDER[floor] > TIER_ORDER[tier] else tier
    if restricted_action_present(data) and TIER_ORDER["D"] > TIER_ORDER[effective]:
        return "D"
    return effective


def quarantine_unsafe_packets():
    """Mark restricted, ambiguous, or sensitive-action packets fail-closed."""
    inbox = A2A / "inbox"
    quarantined = 0
    for packet_path in sorted(inbox.glob("*.json")):
        try:
            data = json.loads(packet_path.read_text())
        except (OSError, json.JSONDecodeError):
            # Unparseable input cannot prove a safe tier and remains unexecuted.
            continue

        safety = data.get("safety")
        if not isinstance(safety, dict):
            safety = {}
            data["safety"] = safety

        tier = effective_packet_tier(data)
        restricted_action = restricted_action_present(data)
        if tier in AUTO_TIERS and not restricted_action:
            continue

        reasons = []
        if packet_scan_text(data) is None:
            reasons.append("invalid_or_oversized_packet")
        if declared_action_type(data) is None:
            reasons.append("missing_or_unknown_action_type")
        if tier == "X":
            reasons.append("missing_unknown_or_disallowed_tier")
        elif tier in {"C", "D"}:
            reasons.append(f"tier_{tier.lower()}_requires_external_approval")
        if restricted_action:
            reasons.append("restricted_action_requires_external_approval")
        if hard_deny_present(data):
            reasons.append("hard_deny_action")

        safety["tier"] = tier
        safety["allowed"] = False
        data["containment"] = {
            "status": "QUARANTINED" if tier == "X" else "BLOCKED_PENDING_EXACT_APPROVAL",
            "reasons": reasons,
        }
        # Deliberately do not create or interpret an approval field.
        packet_path.write_text(json.dumps(data, indent=2, ensure_ascii=False))
        quarantined += 1

    return quarantined


def dispatch_eligible():
    """Invoke the local dispatcher, which independently enforces containment."""
    return subprocess.run(
        ["python3", str(WS / "scripts/cmux-agent-dispatcher.py"), "dispatch"],
        cwd=str(WS),
        capture_output=True,
        text=True,
        timeout=120,
        check=False,
    )


def collect_results():
    """Hold success for read-back verification; move non-success to blocked."""
    for agent in ["claude", "codex", "opencode"]:
        assigned = A2A / "assigned" / agent
        blocked = A2A / "blocked"
        blocked.mkdir(parents=True, exist_ok=True)

        for packet_path in sorted(assigned.glob("*.json")):
            try:
                data = json.loads(packet_path.read_text())
                status = data.get("routing_status") or data.get("status")
                if status in {"DONE", "COMPLETED", "PASSED"}:
                    continue
                if status in {"BLOCKED", "FAILED", "ERROR"} or not status:
                    packet_path.rename(blocked / packet_path.name)
            except (OSError, json.JSONDecodeError):
                # Invalid packets remain assigned and cannot be reported complete.
                continue


def main():
    print("=== CONTAINMENT LOOP START ===")
    if panic_check():
        print("PANIC STOP - exiting")
        return

    quarantined = quarantine_unsafe_packets()
    print(f"Quarantined {quarantined} restricted or ambiguous packets")

    result = dispatch_eligible()
    print(f"Local dispatcher exit code: {result.returncode}")
    collect_results()
    print("Git checkpoint disabled; no add, commit, or push was attempted")
    print("=== CONTAINMENT LOOP COMPLETE ===")


if __name__ == "__main__":
    main()
