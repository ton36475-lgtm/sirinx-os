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

# Agent priority: MOA Frontier Model chain
AGENT_PRIORITY = [
    # Kimi K3 - Chinese long context
    {"name": "opencode-reviewer", "model": "moonshot-v1-256k-kimi3", "cli": "/opt/homebrew/bin/opencode", "role": "chinese_long_context"},
    
    # Fable5 - Code generation
    {"name": "claudecode-architect", "model": "fable-v5-codestral", "cli": None, "role": "code_generation"},  # Not installed
    
    # GPT 5.6Sol Ultra - DeepSeek fallback for code
    {"name": "codex-captain", "model": "deepseek-v4-pro", "cli": "/Users/sirinx/.local/bin/codex", "role": "backend_code"},
    
    # GLM-5.2 - Planning + fallback
    {"name": "cline-planner", "model": "glm-5.2", "cli": "cline", "role": "planning"},
    
    # AGY Gemini 3.5 Flash - Research + extension
    {"name": "agy-researcher", "model": "gemini-3.5-flash", "cli": "agy", "role": "research"},
]

# Map actual CLI agents
CLI_AGENTS = {
    "opencode-reviewer": {"cli": "/opt/homebrew/bin/opencode", "model": "moonshot-v1-256k-kimi3"},
    "codex-captain": {"cli": "/Users/sirinx/.local/bin/codex", "model": "deepseek-v4-pro"},
    "cline-planner": {"cli": "cline", "model": "glm-5.2"},
}

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
    
    # Use CLI_AGENTS mapping (only agents with real CLI)
    for name, cfg in CLI_AGENTS.items():
        cli = cfg["cli"]
        model = cfg["model"]
        
        if cli == "cline" or Path(cli).exists():
            if name == "opencode-reviewer":
                cmd = f"cd {WS}/.worktrees/opencode && opencode ask --model {model} '{goal}'"
            elif name == "codex-captain":
                cmd = f"cd {WS}/.worktrees/codex && codex --model {model} '{goal}' --no-stream"
            else:
                cmd = f"cline '{goal}'"
            
            subprocess.Popen(cmd, shell=True)
            print(f"A2A2A: Dispatched to {name} via {model}")
            return name
    
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