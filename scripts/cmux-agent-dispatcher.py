#!/usr/bin/env python3
"""
SIRINX OS — CMUX Agent Dispatcher v2
สั่งงาน A2A packets → 47 Ronin worktrees (claude/codex/opencode)
พร้อม brainstorm analysis ก่อน dispatch และ feedback loop

Architecture: V4 LOCKED
Node: local_mac_m2_core

Flow:
  1. Read A2A inbox packets
  2. Brainstorm: classify + prioritize + route to a local lane
  3. Quarantine unknown/restricted packets
  4. Move eligible A/B packets and write a local task manifest
  5. Collect only packets with an explicit terminal status

This script does not start provider-backed agents, install, send, push, deploy,
or authorize restricted work.
"""

from __future__ import annotations
import json, re, time
from datetime import datetime, timezone
from pathlib import Path
from collections import defaultdict

WORKSPACE = Path("/Users/sirinx/sirinx-os")
A2A_QUEUE = WORKSPACE / "_A2A_QUEUE"
WORKTREES = {
    "claude": WORKSPACE / ".worktrees" / "claude",
    "codex": WORKSPACE / ".worktrees" / "codex",
    "opencode": WORKSPACE / ".worktrees" / "opencode",
}
TASKS_DIR = WORKSPACE / "storage" / "agent-tasks"
RESULTS_DIR = WORKSPACE / "storage" / "agent-results"

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

def now_iso():
    return datetime.now(timezone.utc).isoformat()


def ts():
    return datetime.now().strftime("%H:%M:%S")


def log(level, msg):
    print(f"[{ts()}] [{level}] {msg}")


def normalize_tier(value) -> str:
    """Fail closed: missing, malformed, and unknown tiers are Tier X."""
    if not isinstance(value, str):
        return "X"
    tier = value.strip().upper()
    return tier if tier in KNOWN_TIERS else "X"


def packet_scan_text(value) -> str | None:
    """Return bounded serialized text; oversized or invalid input is inadmissible."""
    if isinstance(value, str):
        scan_text = value
    else:
        try:
            scan_text = json.dumps(value, ensure_ascii=False, sort_keys=True)
        except (TypeError, ValueError):
            return None
    if len(scan_text.encode("utf-8")) > MAX_PACKET_BYTES:
        return None
    return scan_text


def declared_action_type(data: dict) -> str | None:
    """Require exactly one closed action type across supported envelope locations."""
    candidates = []
    for container in (
        data,
        data.get("payload"),
        data.get("manifest"),
        data.get("action"),
    ):
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


def restricted_action_present(value) -> bool:
    """Defense in depth after the closed structured action check."""
    scan_text = packet_scan_text(value)
    return scan_text is None or bool(RESTRICTED_ACTION_RE.search(scan_text))


def hard_deny_present(value) -> bool:
    scan_text = packet_scan_text(value)
    return scan_text is None or bool(HARD_DENY_RE.search(scan_text))


def effective_packet_tier(data: dict) -> str:
    """Require an explicit allow decision and round recognized risk upward."""
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


def containment_reasons(tier: str, packet_or_text) -> list[str]:
    reasons = []
    if isinstance(packet_or_text, dict):
        if packet_scan_text(packet_or_text) is None:
            reasons.append("invalid_or_oversized_packet")
        if declared_action_type(packet_or_text) is None:
            reasons.append("missing_or_unknown_action_type")
    if tier == "X":
        reasons.append("missing_unknown_or_disallowed_tier")
    elif tier in {"C", "D"}:
        reasons.append(f"tier_{tier.lower()}_requires_external_approval")
    if restricted_action_present(packet_or_text):
        reasons.append("restricted_action_requires_external_approval")
    if hard_deny_present(packet_or_text):
        reasons.append("hard_deny_action")
    return reasons


def mark_contained(data: dict, tier: str, reasons: list[str]) -> dict:
    """Persist a deterministic fail-closed marker without interpreting approval."""
    safety = data.get("safety")
    if not isinstance(safety, dict):
        safety = {}
        data["safety"] = safety
    safety["tier"] = tier
    safety["allowed"] = False
    data["containment"] = {
        "status": "QUARANTINED" if tier == "X" else "BLOCKED_PENDING_EXACT_APPROVAL",
        "reasons": list(reasons),
    }
    return data


# ─── LANE ROUTING MATRIX ──────────────────────────────────────────
# Model/provider routing is intentionally outside this local file dispatcher.
# No unverified model ID or direct-provider fallback is authorized here.

LANE_MAP = {
    # Lane → (worktree, agent_name, capabilities)
    "architecture":    ("claude",   "claude-architect",   ["read-only analysis", "system design", "docs"]),
    "backend":         ("codex",    "codex-captain",      ["write code", "fix bugs", "run tests"]),
    "frontend":        ("codex",    "codex-captain",      ["UI components", "CSS", "React"]),
    "review":          ("opencode", "opencode-reviewer",  ["code review", "security scan", "diff analysis"]),
    "infra":           ("codex",    "codex-captain",      ["deploy scripts", "config", "CI/CD"]),
    "docs":            ("claude",   "claude-architect",   ["documentation", "README", "guides"]),
    "qa":              ("opencode", "opencode-reviewer",  ["test writing", "lint", "validation"]),
    "security":        ("opencode", "opencode-reviewer",  ["security scan", "vulnerability check"]),
    "integration":     ("codex",    "codex-captain",      ["API wiring", "MCP setup", "bridge"]),
    "line-bot":        ("codex",    "codex-captain",      ["LINE webhook", "intent classifier"]),
    "agent-sync":      ("claude",   "claude-architect",   ["A2A protocol", "agent coordination"]),
    "mutation":        ("codex",    "codex-captain",      ["fix errors", "auto-repair"]),
    "dispatch":        ("claude",   "claude-architect",   ["work distribution"]),
    "other":           ("codex",    "codex-captain",      ["general tasks"]),
}

# Keywords → lane classification
KEYWORD_MAP = [
    (r"architecture|design|blueprint|schema|plan", "architecture"),
    (r"backend|api|database|sql|redis|queue", "backend"),
    (r"frontend|react|css|ui|component|dashboard", "frontend"),
    (r"review|audit|scan|diff", "review"),
    (r"deploy|cloudflare|docker|infra|ci|cd", "infra"),
    (r"docs?|readme|guide|wiki", "docs"),
    (r"test|lint|validate|verify", "qa"),
    (r"security|vulnerab|secret|credential", "security"),
    (r"wire|mcp|bridge|connect|integrate", "integration"),
    (r"line|webhook|flex|intent", "line-bot"),
    (r"agent|a2a|sync|coordinate|dispatch", "agent-sync"),
    (r"error|fix|bug|fail|mutation|broken", "mutation"),
    (r"creature|hatchery|durable", "other"),
]


def classify_lane(packet_name: str, goal_text: str) -> str:
    """Classify packet into the correct lane."""
    text = f"{packet_name} {goal_text}".lower()
    for pattern, lane in KEYWORD_MAP:
        if re.search(pattern, text):
            return lane
    return "other"


# ─── BRAINSTORM ANALYSIS ──────────────────────────────────────────

def brainstorm_packets(packets: list) -> dict:
    """
    Pre-dispatch analysis: group by lane, check dependencies,
    identify blockers, estimate complexity.
    """
    analysis = {
        "total": len(packets),
        "by_lane": defaultdict(list),
        "by_tier": defaultdict(int),
        "by_worktree": defaultdict(int),
        "tier_c_pending": [],
        "approval_pending": [],
        "quarantined": [],
        "dependencies": [],
        "recommendations": [],
    }

    for p in packets:
        fname = p["file"]
        data = p["data"]
        lane = classify_lane(fname, p.get("goal_text", ""))
        worktree, agent, _ = LANE_MAP.get(lane, ("codex", "codex-captain", []))
        tier = normalize_tier(p.get("tier"))
        blocked_reasons = list(p.get("blocked_reasons", []))

        entry = {
            "file": fname,
            "lane": lane,
            "worktree": worktree,
            "agent": agent,
            "tier": tier,
            "blocked_reasons": blocked_reasons,
            "goal": p.get("goal_text", "")[:100],
        }

        analysis["by_lane"][lane].append(entry)
        analysis["by_worktree"][worktree] += 1
        analysis["by_tier"][tier] += 1

        if tier == "C":
            analysis["tier_c_pending"].append(fname)
        if tier == "X":
            analysis["quarantined"].append(fname)
        elif tier in {"C", "D"} or blocked_reasons:
            analysis["approval_pending"].append(fname)

    # Recommendations
    approval_count = len(analysis["approval_pending"])
    quarantine_count = len(analysis["quarantined"])
    if approval_count:
        analysis["recommendations"].append(
            f"⚠️ {approval_count} packets blocked pending exact external approval"
        )
    if quarantine_count:
        analysis["recommendations"].append(
            f"⛔ {quarantine_count} packets quarantined and not approvable"
        )
    if analysis["by_worktree"].get("codex", 0) > 10:
        analysis["recommendations"].append(
            f"📦 Codex lane overloaded ({analysis['by_worktree']['codex']} tasks) — consider splitting"
        )
    total_a_b = analysis["by_tier"].get("A", 0) + analysis["by_tier"].get("B", 0)
    analysis["recommendations"].append(
        f"✅ {total_a_b} Tier A/B packets eligible before restricted-action checks"
    )

    # Sort lanes by priority
    priority_order = ["mutation", "qa", "security", "backend", "integration",
                      "infra", "frontend", "line-bot", "architecture", "review",
                      "agent-sync", "docs", "dispatch", "other"]
    sorted_lanes = {}
    for lane in priority_order:
        if lane in analysis["by_lane"]:
            sorted_lanes[lane] = analysis["by_lane"].pop(lane)
    analysis["by_lane"] = sorted_lanes

    return analysis


# ─── DISPATCH TO WORKTREES ────────────────────────────────────────

def dispatch_to_worktree(worktree_name: str, agent_name: str, task_entries: list) -> dict:
    """Write task manifest to worktree + optionally start agent."""
    wt_path = WORKTREES.get(worktree_name)
    if not wt_path or not wt_path.exists():
        return {"error": f"worktree {worktree_name} not found"}

    TASKS_DIR.mkdir(parents=True, exist_ok=True)
    manifest = {
        "agent": agent_name,
        "worktree": worktree_name,
        "path": str(wt_path),
        "timestamp": now_iso(),
        "task_count": len(task_entries),
        "tasks": [],
    }

    for entry in task_entries:
        task = {
            "id": entry["file"],
            "lane": entry["lane"],
            "tier": entry["tier"],
            "goal": entry["goal"],
            "status": "ASSIGNED",
            "assigned_at": now_iso(),
        }
        manifest["tasks"].append(task)

        # Move packet from inbox → assigned
        src = A2A_QUEUE / "inbox" / entry["file"]
        dst_dir = A2A_QUEUE / "assigned" / worktree_name
        dst_dir.mkdir(parents=True, exist_ok=True)
        dst = dst_dir / entry["file"]
        if src.exists():
            packet_data = json.loads(src.read_text())
            packet_data["routing_status"] = "ASSIGNED"
            packet_data["dispatch_control"] = {
                "provider_invocation": False,
                "execution_authorized": False,
                "receipt_required": True,
                "next_state": "WAITING_FOR_LEASED_WORKER",
            }
            src.write_text(json.dumps(packet_data, indent=2, ensure_ascii=False))
            src.rename(dst)

    # Write manifest
    manifest_file = TASKS_DIR / f"{worktree_name}_{int(time.time())}.json"
    manifest_file.write_text(json.dumps(manifest, indent=2, ensure_ascii=False))

    log("DISPATCH", f"→ {worktree_name}/{agent_name}: {len(task_entries)} tasks")
    return {"dispatched": len(task_entries), "manifest": str(manifest_file)}


# ─── COLLECT RESULTS ──────────────────────────────────────────────

def collect_results() -> dict:
    """Collect explicit failures; success waits for independent verification."""
    collected = {"done": 0, "errors": 0, "results": []}

    for wt_name, wt_path in WORKTREES.items():
        assigned_dir = A2A_QUEUE / "assigned" / wt_name
        if not assigned_dir.exists():
            continue

        for pkt in list(assigned_dir.glob("*.json")):
            try:
                data = json.loads(pkt.read_text())
                status = data.get("routing_status", data.get("status", ""))

                if status in ("DONE", "COMPLETED", "PASSED"):
                    collected["results"].append({
                        "file": pkt.name,
                        "status": "verification_pending",
                    })
                elif status in ("BLOCKED", "FAILED", "ERROR"):
                    dst = A2A_QUEUE / "blocked" / pkt.name
                    (A2A_QUEUE / "blocked").mkdir(exist_ok=True)
                    pkt.rename(dst)
                    collected["errors"] += 1
                    collected["results"].append({"file": pkt.name, "status": "blocked"})
                elif not status:
                    dst = A2A_QUEUE / "blocked" / pkt.name
                    (A2A_QUEUE / "blocked").mkdir(exist_ok=True)
                    pkt.rename(dst)
                    collected["errors"] += 1
                    collected["results"].append({
                        "file": pkt.name,
                        "status": "blocked_missing_status",
                    })
            except Exception as e:
                log("COLLECT", f"Error processing {pkt.name}: {e}")

    if collected["done"] or collected["errors"]:
        log("COLLECT", f"Done: {collected['done']}, Blocked: {collected['errors']}")
    return collected


# ─── MAIN DISPATCH CYCLE ──────────────────────────────────────────

def run_dispatch_cycle() -> dict:
    """Full cycle: read → brainstorm → dispatch → collect."""
    # Emergency stop check
    panic_flag = WORKSPACE / ".hermes" / "panic.flag"
    if panic_flag.exists():
        log("PANIC", "Emergency stop triggered - all dispatch halted")
        return {"phase": "panic_stop", "dispatched": 0}

    log("DISPATCHER", "═══ Starting CMUX Agent Dispatch Cycle ═══")

    # Step 1: Read inbox
    inbox_dir = A2A_QUEUE / "inbox"
    packets = []
    for f in sorted(inbox_dir.glob("*.json")):
        try:
            data = json.loads(f.read_text())
            goal = ""
            ctx = data.get("context", {})
            if isinstance(ctx, dict):
                goal = str(ctx.get("goal", ""))
            elif isinstance(ctx, str):
                goal = ctx
            # Also check payload for goal info
            payload = data.get("payload", {})
            if not goal and isinstance(payload, dict):
                goal = str(payload.get("goal", payload.get("title", "")))[:100]

            safety = data.get("safety", {})
            if not isinstance(safety, dict):
                safety = {}
            tier = effective_packet_tier(data)
            blocked_reasons = containment_reasons(tier, data)
            if blocked_reasons:
                mark_contained(data, tier, blocked_reasons)
                f.write_text(json.dumps(data, indent=2, ensure_ascii=False))

            packets.append({
                "file": f.name,
                "data": data,
                "goal_text": goal,
                "tier": tier,
                "blocked_reasons": blocked_reasons,
            })
        except Exception as e:
            log("ERROR", f"Failed to parse {f.name}: {e}")

    log("DISPATCHER", f"Found {len(packets)} packets in inbox")

    if not packets:
        # Collect any finished work
        results = collect_results()
        return {"phase": "collect_only", "inbox": 0, **results}

    # Step 2: Brainstorm
    log("BRAINSTORM", "Analyzing packets for lane routing...")
    analysis = brainstorm_packets(packets)

    log("BRAINSTORM", f"Lanes: {len(analysis['by_lane'])}")
    for lane, items in analysis["by_lane"].items():
        log("BRAINSTORM", f"  {lane}: {len(items)} packets → {items[0]['worktree']}/{items[0]['agent']}")

    for rec in analysis["recommendations"]:
        log("BRAINSTORM", rec)

    # Step 3: Dispatch only non-sensitive Tier A/B packets.
    dispatch_results = {}
    for lane, items in analysis["by_lane"].items():
        auto_items = [
            item for item in items
            if item["tier"] in AUTO_TIERS and not item["blocked_reasons"]
        ]
        held_items = [item for item in items if item not in auto_items]

        if auto_items:
            wt = auto_items[0]["worktree"]
            agent = auto_items[0]["agent"]
            result = dispatch_to_worktree(wt, agent, auto_items)
            dispatch_results[lane] = result

        if held_items:
            log("DISPATCH", f"⏸️ Lane {lane}: {len(held_items)} packets held or quarantined")
            for held in held_items:
                reason = ",".join(held["blocked_reasons"]) or f"tier_{held['tier'].lower()}"
                disposition = "quarantined" if held["tier"] == "X" else "approval_required"
                log("DISPATCH", f"   {held['file']}: {disposition}:{reason}")

    # Step 4: Collect finished work
    collect = collect_results()

    # Summary
    total_dispatched = sum(r.get("dispatched", 0) for r in dispatch_results.values())
    total_held = len(analysis["approval_pending"])
    total_quarantined = len(analysis["quarantined"])
    total_tier_c = analysis["by_tier"].get("C", 0)
    remaining = len(packets) - total_dispatched

    summary = {
        "timestamp": now_iso(),
        "node": "local_mac_m2_core",
        "total_packets": len(packets),
        "dispatched": total_dispatched,
        "tier_c_held": total_tier_c,
        "approval_held": total_held,
        "quarantined": total_quarantined,
        "remaining": remaining,
        "collected_done": collect["done"],
        "collected_errors": collect["errors"],
        "by_lane": {k: len(v) for k, v in analysis["by_lane"].items()},
        "by_worktree": dict(analysis["by_worktree"]),
        "recommendations": analysis["recommendations"],
    }

    log("DISPATCHER", f"═══ Dispatch Complete ═══")
    log("DISPATCHER", f"  Dispatched: {total_dispatched}")
    log("DISPATCHER", f"  Approval held: {total_held}")
    log("DISPATCHER", f"  Quarantined: {total_quarantined}")
    log("DISPATCHER", f"  Collected done: {collect['done']}")
    log("DISPATCHER", f"  Collected errors: {collect['errors']}")

    # Save report
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    report_file = RESULTS_DIR / f"dispatch_{int(time.time())}.json"
    report_file.write_text(json.dumps(summary, indent=2, ensure_ascii=False))

    return summary


if __name__ == "__main__":
    import sys
    mode = sys.argv[1] if len(sys.argv) > 1 else "dispatch"

    if mode == "brainstorm":
        # Just analyze, don't dispatch
        inbox_dir = A2A_QUEUE / "inbox"
        packets = []
        for f in sorted(inbox_dir.glob("*.json")):
            try:
                data = json.loads(f.read_text())
                ctx = data.get("context", {})
                goal = str(ctx.get("goal", "")) if isinstance(ctx, dict) else str(ctx)
                safety = data.get("safety", {})
                if not isinstance(safety, dict):
                    safety = {}
                tier = effective_packet_tier(data)
                packets.append({
                    "file": f.name,
                    "data": data,
                    "goal_text": goal,
                    "tier": tier,
                    "blocked_reasons": containment_reasons(tier, data),
                })
            except:
                pass
        analysis = brainstorm_packets(packets)
        print(json.dumps({k: (dict(v) if isinstance(v, defaultdict) else v)
                         for k, v in analysis.items()}, indent=2, ensure_ascii=False))
    elif mode == "collect":
        result = collect_results()
        print(json.dumps(result, indent=2))
    else:
        result = run_dispatch_cycle()
        print(json.dumps(result, indent=2, ensure_ascii=False))
