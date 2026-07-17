#!/usr/bin/env python3
"""
SIRINX OS — CMUX Agent Dispatcher v2
สั่งงาน A2A packets → 47 Ronin worktrees (claude/codex/opencode)
พร้อม brainstorm analysis ก่อน dispatch และ feedback loop

Architecture: V4 LOCKED
Node: local_mac_m2_core

Flow:
  1. Read A2A inbox packets
  2. Brainstorm: classify + prioritize + route to correct lane
  3. Write task manifest to worktree
  4. Start agent in worktree (if not already running)
  5. Collect results → move to done
"""

from __future__ import annotations
import json, os, re, time, hashlib, subprocess
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

for d in [TASKS_DIR, RESULTS_DIR]:
    d.mkdir(parents=True, exist_ok=True)


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def ts():
    return datetime.now().strftime("%H:%M:%S")


def log(level, msg):
    print(f"[{ts()}] [{level}] {msg}")


# ─── LANE ROUTING MATRIX ──────────────────────────────────────────

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
        "dependencies": [],
        "recommendations": [],
    }

    for p in packets:
        fname = p["file"]
        data = p["data"]
        lane = classify_lane(fname, p.get("goal_text", ""))
        worktree, agent, _ = LANE_MAP.get(lane, ("codex", "codex-captain", []))
        tier = p.get("tier", "A")

        entry = {
            "file": fname,
            "lane": lane,
            "worktree": worktree,
            "agent": agent,
            "tier": tier,
            "goal": p.get("goal_text", "")[:100],
        }

        analysis["by_lane"][lane].append(entry)
        analysis["by_worktree"][worktree] += 1
        analysis["by_tier"][tier] += 1

        if tier == "C":
            analysis["tier_c_pending"].append(fname)

    # Recommendations
    if analysis["by_tier"].get("C", 0) > 0:
        analysis["recommendations"].append(
            f"⚠️ {analysis['by_tier']['C']} Tier C packets need human approval before dispatch"
        )
    if analysis["by_worktree"].get("codex", 0) > 10:
        analysis["recommendations"].append(
            f"📦 Codex lane overloaded ({analysis['by_worktree']['codex']} tasks) — consider splitting"
        )
    total_a_b = analysis["by_tier"].get("A", 0) + analysis["by_tier"].get("B", 0)
    analysis["recommendations"].append(
        f"✅ {total_a_b} Tier A/B packets ready for auto-dispatch"
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
            src.rename(dst)

    # Write manifest
    manifest_file = TASKS_DIR / f"{worktree_name}_{int(time.time())}.json"
    manifest_file.write_text(json.dumps(manifest, indent=2, ensure_ascii=False))

    log("DISPATCH", f"→ {worktree_name}/{agent_name}: {len(task_entries)} tasks")
    return {"dispatched": len(task_entries), "manifest": str(manifest_file)}


# ─── COLLECT RESULTS ──────────────────────────────────────────────

def collect_results() -> dict:
    """Scan worktrees for completed work + move packets to done."""
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
                    dst = A2A_QUEUE / "done" / pkt.name
                    (A2A_QUEUE / "done").mkdir(exist_ok=True)
                    pkt.rename(dst)
                    collected["done"] += 1
                    collected["results"].append({"file": pkt.name, "status": "done"})
                elif status in ("BLOCKED", "FAILED", "ERROR"):
                    dst = A2A_QUEUE / "blocked" / pkt.name
                    (A2A_QUEUE / "blocked").mkdir(exist_ok=True)
                    pkt.rename(dst)
                    collected["errors"] += 1
                    collected["results"].append({"file": pkt.name, "status": "blocked"})
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
            tier = safety.get("tier", data.get("tier", "A"))

            packets.append({
                "file": f.name,
                "data": data,
                "goal_text": goal,
                "tier": tier,
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

    # Step 3: Dispatch (Tier A/B only — Tier C needs approval)
    dispatch_results = {}
    for lane, items in analysis["by_lane"].items():
        # Filter to Tier A/B only
        auto_items = [i for i in items if i["tier"] in ("A", "B")]
        tier_c = [i for i in items if i["tier"] == "C"]

        if auto_items:
            wt = auto_items[0]["worktree"]
            agent = auto_items[0]["agent"]
            result = dispatch_to_worktree(wt, agent, auto_items)
            dispatch_results[lane] = result

        if tier_c:
            log("DISPATCH", f"⏸️ Lane {lane}: {len(tier_c)} Tier C packets held for approval")
            for tc in tier_c:
                log("DISPATCH", f"   {tc['file']}: {tc['goal'][:60]}")

    # Step 4: Collect finished work
    collect = collect_results()

    # Summary
    total_dispatched = sum(r.get("dispatched", 0) for r in dispatch_results.values())
    total_tier_c = len(analysis["tier_c_pending"])
    remaining = len(packets) - total_dispatched

    summary = {
        "timestamp": now_iso(),
        "node": "local_mac_m2_core",
        "total_packets": len(packets),
        "dispatched": total_dispatched,
        "tier_c_held": total_tier_c,
        "remaining": remaining,
        "collected_done": collect["done"],
        "collected_errors": collect["errors"],
        "by_lane": {k: len(v) for k, v in analysis["by_lane"].items()},
        "by_worktree": dict(analysis["by_worktree"]),
        "recommendations": analysis["recommendations"],
    }

    log("DISPATCHER", f"═══ Dispatch Complete ═══")
    log("DISPATCHER", f"  Dispatched: {total_dispatched}")
    log("DISPATCHER", f"  Tier C held: {total_tier_c}")
    log("DISPATCHER", f"  Collected done: {collect['done']}")
    log("DISPATCHER", f"  Collected errors: {collect['errors']}")

    # Save report
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
                tier = safety.get("tier", "A")
                packets.append({"file": f.name, "data": data, "goal_text": goal, "tier": tier})
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
