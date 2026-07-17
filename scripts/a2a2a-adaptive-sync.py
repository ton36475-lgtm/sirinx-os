#!/usr/bin/env python3
"""
A2A2A Adaptive Sync - Control all terminal CLI agents in CMUX
Hermes orchestrates: Cline(GLM) > Codex(Kimi3) > OpenCode(Fable5) > Cline backup
All agents report via A2A packets, sync to single execution queue
"""

import json, subprocess, time, os
from pathlib import Path
from datetime import datetime, timezone

WS = Path("/Users/sirinx/sirinx-os")
A2A = WS / "_A2A_QUEUE"

# Agent priority: Fable5 first, then Kimi3, then GLM backup
AGENT_PRIORITY = [
    {"name": "opencode-reviewer", "model": "fable-v5-codestral", "cli": "/opt/homebrew/bin/opencode"},
    {"name": "codex-captain", "model": "moonshot-kimi-2.7", "cli": "/Users/sirinx/.local/bin/codex"},
    {"name": "cline-backup", "model": "glm-5.2", "cli": "cline"},
]

def sync_status():
    """Get current status of all agents."""
    status = {"timestamp": datetime.now(timezone.utc).isoformat(), "agents": {}}
    
    for agent in AGENT_PRIORITY:
        cli_name = agent["cli"].split("/")[-1] if "/" in agent["cli"] else agent["cli"]
        try:
            result = subprocess.run(
                ["which", cli_name], capture_output=True, text=True, timeout=5
            )
            available = result.returncode == 0
            status["agents"][agent["name"]] = {
                "available": available,
                "model": agent["model"],
                "cli_path": agent["cli"] if available else None
            }
        except:
            status["agents"][agent["name"]] = {"available": False, "model": agent["model"]}
    
    return status

def adaptive_dispatch(packet_file: Path):
    """Dispatch packet to next available agent based on priority."""
    data = json.loads(packet_file.read_text())
    ctx = data.get("context", {})
    goal = ctx.get("goal", "task") if isinstance(ctx, dict) else str(ctx)[:200]
    
    if isinstance(goal, dict):
        goal = goal.get("title", str(goal))[:100]
    
    # Find first available agent
    for agent in AGENT_PRIORITY:
        if Path(agent["cli"]).exists() or agent["cli"] == "cline":
            # Dispatch to this agent
            if agent["name"] == "opencode-reviewer":
                cmd = f"cd {WS}/.worktrees/opencode && opencode ask --model {agent['model']} '{goal}'"
            elif agent["name"] == "codex-captain":
                cmd = f"cd {WS}/.worktrees/codex && codex --model {agent['model']} '{goal}' --no-stream"
            else:
                cmd = f"cline '{goal}'"  # Uses ~/.cline/config.json (OmniRoute)
            
            # Run in background
            subprocess.Popen(cmd, shell=True)
            
            # Log dispatch
            print(f"A2A2A: Dispatched to {agent['name']} via {agent['model']}")
            return agent["name"]
    
    return None

def main():
    print("=== A2A2A ADAPTIVE SYNC START ===")
    
    # Show agent status
    status = sync_status()
    agents = status.get("agents", {})
    for name, info in agents.items():
        flag = "✅" if info.get("available") else "❌"
        print(f"  {flag} {name}: {info.get('model', 'unknown')}")
    
    # Process assigned packets
    for agent in ["opencode", "codex"]:
        assigned = A2A / "assigned" / agent
        for pkt in list(assigned.glob("*.json")):
            adaptive_dispatch(pkt)
            break  # One packet per sync cycle
    
    print("A2A2A: Sync complete - agents dispatched")

if __name__ == "__main__":
    main()