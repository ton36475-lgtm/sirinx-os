#!/usr/bin/env python3
"""
SIRINX OS Task DAG Resolver

Takes a goal, decomposes into tasks with dependencies,
resolves execution order via topological sort,
and dispatches to A2A bridge.

Usage:
  python3.12 scripts/task-dag-resolver.py "fix all failing tests"
  python3.12 scripts/task-dag-resolver.py --json goal_packet.json
"""

from __future__ import annotations
import json, os, re, sys, time, hashlib
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path("/Users/sirinx/sirinx-os")
INBOX_DIR = REPO_ROOT / "_A2A_QUEUE" / "inbox"
AGENT_CARDS = REPO_ROOT / "config" / "ronin-47-agent-cards.json"

def now_iso(): return datetime.now(timezone.utc).isoformat()
def mission_id(text): return f"M-{datetime.now().strftime('%Y%m%d')}-{hashlib.md5(text.encode()).hexdigest()[:6]}"

# Intent → Agent routing
INTENT_MAP = {
    r"fix|bug|broken|error|fail": {"intent":"bug_fix","agent":"codex-captain","tier":"A"},
    r"test|verify|check|lint": {"intent":"test_run","agent":"codex-captain","tier":"A"},
    r"deploy|push|release|cloud": {"intent":"deploy","agent":"devops-engineer","tier":"C"},
    r"design|architect|plan": {"intent":"design","agent":"claude-architect","tier":"A"},
    r"review|audit|security|scan": {"intent":"review","agent":"opencode-reviewer","tier":"A"},
    r"create|build|feature|add": {"intent":"feature","agent":"codex-captain","tier":"A"},
    r"optimize|performance|speed": {"intent":"optimize","agent":"backend-eng-1","tier":"A"},
    r"document|docs|readme": {"intent":"document","agent":"content-writer","tier":"A"},
    r"research|analyz|study": {"intent":"research","agent":"ml-researcher","tier":"A"},
    r"integrat|wire|connect|hook": {"intent":"integrate","agent":"integration-lead","tier":"A"},
    r"clean|disk|space|cache": {"intent":"cleanup","agent":"auto-healer","tier":"A"},
    r"monitor|watch|alert": {"intent":"monitor","agent":"sentinel","tier":"A"},
}

def classify_goal(text):
    text_lower = text.lower()
    for pattern, info in INTENT_MAP.items():
        if re.search(pattern, text_lower):
            return info
    return {"intent":"general","agent":"codex-captain","tier":"A"}

def decompose_goal(text):
    """Decompose goal into task DAG"""
    info = classify_goal(text)
    mid = mission_id(text)
    intent = info["intent"]
    agent = info["agent"]
    tier = info["tier"]

    # Build task list based on intent
    tasks = []
    if intent == "bug_fix":
        tasks = [
            {"id":"T1","agent":agent,"action":f"Identify the root cause of: {text}","tier":"A","depends_on":[],"timeout":300},
            {"id":"T2","agent":agent,"action":f"Fix the issue: {text}","tier":"A","depends_on":["T1"],"timeout":600},
            {"id":"T3","agent":"codex-captain","action":"Run pnpm hq:test to verify fix","tier":"A","depends_on":["T2"],"timeout":120},
            {"id":"T4","agent":"opencode-reviewer","action":f"Review the fix for: {text}","tier":"A","depends_on":["T3"],"timeout":180},
        ]
    elif intent == "test_run":
        tasks = [
            {"id":"T1","agent":agent,"action":f"Run tests: {text}","tier":"A","depends_on":[],"timeout":120},
            {"id":"T2","agent":"opencode-reviewer","action":"Review test results","tier":"A","depends_on":["T1"],"timeout":60},
        ]
    elif intent == "deploy":
        tasks = [
            {"id":"T1","agent":agent,"action":f"Pre-deploy checklist: {text}","tier":"A","depends_on":[],"timeout":120},
            {"id":"T2","agent":"audit-agent","action":"Security scan before deploy","tier":"A","depends_on":["T1"],"timeout":120},
            {"id":"T3","agent":agent,"action":f"HUMAN APPROVAL REQUIRED: {text}","tier":"C","depends_on":["T2"],"timeout":0},
        ]
    elif intent == "review":
        tasks = [
            {"id":"T1","agent":agent,"action":f"Analyze: {text}","tier":"A","depends_on":[],"timeout":300},
            {"id":"T2","agent":"claude-architect","action":"Architecture review","tier":"A","depends_on":["T1"],"timeout":180},
        ]
    elif intent == "feature":
        tasks = [
            {"id":"T1","agent":"claude-architect","action":f"Design approach for: {text}","tier":"A","depends_on":[],"timeout":300},
            {"id":"T2","agent":agent,"action":f"Implement: {text}","tier":"A","depends_on":["T1"],"timeout":600},
            {"id":"T3","agent":"codex-captain","action":"Run tests","tier":"A","depends_on":["T2"],"timeout":120},
            {"id":"T4","agent":"opencode-reviewer","action":"Code review","tier":"A","depends_on":["T3"],"timeout":180},
        ]
    else:
        # Generic
        tasks = [
            {"id":"T1","agent":agent,"action":f"Execute: {text}","tier":tier,"depends_on":[],"timeout":300},
            {"id":"T2","agent":"opencode-reviewer","action":"Verify result","tier":"A","depends_on":["T1"],"timeout":120},
        ]

    dag = {
        "mission_id": mid,
        "goal": text,
        "intent": intent,
        "tier": tier,
        "assigned_agent": agent,
        "tasks": tasks,
        "success_criteria": "All tasks completed without error",
        "rollback": "git checkout -- .",
        "estimated_cost": 0 if tier == "A" else 5,
        "estimated_time_min": sum(t.get("timeout",300) for t in tasks) // 60,
        "timestamp": now_iso(),
    }
    return dag

def topological_sort(tasks):
    """Sort tasks by dependencies"""
    task_map = {t["id"]: t for t in tasks}
    visited = set()
    result = []
    def visit(tid):
        if tid in visited: return
        visited.add(tid)
        for dep in task_map.get(tid, {}).get("depends_on", []):
            visit(dep)
        result.append(task_map.get(tid))
    for t in tasks:
        visit(t["id"])
    return [t for t in result if t]

def dispatch_to_inbox(dag):
    """Create A2A packets for each task"""
    INBOX_DIR.mkdir(parents=True, exist_ok=True)
    packets = []
    for task in dag["tasks"]:
        packet = {
            "mission_id": dag["mission_id"],
            "task_id": task["id"],
            "to": {"agent": task["agent"]},
            "context": {"goal": task["action"], "tier": task["tier"], "mission": dag["goal"]},
            "depends_on": task.get("depends_on", []),
            "timeout": task.get("timeout", 300),
            "timestamp": now_iso(),
        }
        fname = f"packet_{dag['mission_id']}_{task['id']}.json"
        (INBOX_DIR / fname).write_text(json.dumps(packet, indent=2, ensure_ascii=False))
        packets.append(fname)
    return packets

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: task-dag-resolver.py \"goal text\"")
        sys.exit(1)

    goal_text = " ".join(sys.argv[1:])
    print(f"🎯 Goal: {goal_text}")
    print(f"{'='*50}")

    dag = decompose_goal(goal_text)
    print(f"Mission: {dag['mission_id']}")
    print(f"Intent: {dag['intent']}")
    print(f"Agent: {dag['assigned_agent']}")
    print(f"Tier: {dag['tier']}")
    print(f"Tasks: {len(dag['tasks'])}")

    sorted_tasks = topological_sort(dag["tasks"])
    print(f"\n📋 Execution Order:")
    for i, t in enumerate(sorted_tasks, 1):
        deps = f" (after {','.join(t.get('depends_on',[]))})" if t.get("depends_on") else ""
        print(f"  {i}. [{t['id']}] {t['agent']:20} | Tier {t['tier']} | {t['action'][:60]}{deps}")

    if dag["tier"] == "C":
        print(f"\n⚠️  TIER C — requires human approval before dispatch!")

    packets = dispatch_to_inbox(dag)
    print(f"\n✅ Dispatched {len(packets)} packets to inbox:")
    for p in packets:
        print(f"  → {p}")
