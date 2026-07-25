#!/usr/bin/env python3
"""
CLI Agent Dispatcher — Dispatch packets to Codex CLI and OpenCode CLI
via OmniRoute. Reads assigned packets, calls CLI, tracks results.
"""

import json, subprocess, time, os
from pathlib import Path

WORKSPACE = Path("/Users/sirinx/sirinx-os")

def dispatch_to_codex(packet_file: Path):
    """Dispatch packet to Codex CLI via OmniRoute."""
    data = json.loads(packet_file.read_text())
    ctx = data.get("context", {})
    goal = ctx.get("goal", "") if isinstance(ctx, dict) else str(ctx)
    
    # Extract readable goal
    if isinstance(goal, dict):
        goal = goal.get("title", goal.get("project", "task"))
    
    worktree = WORKSPACE / ".worktrees/codex"
    
    cmd = f'cd {worktree} && codex --model auto "{goal[:200]}" --no-stream 2>&1 | head -100'
    
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=120)
    
    # Move to done if successful
    if result.returncode == 0 or "success" in result.stdout.lower():
        done_dir = WORKSPACE / "_A2A_QUEUE/done"
        done_dir.mkdir(exist_ok=True)
        packet_file.rename(done_dir / packet_file.name)
        return {"status": "dispatched", "output": result.stdout[:200]}
    else:
        return {"status": "error", "output": result.stderr[:200]}

def dispatch_to_opencode(packet_file: Path):
    """Dispatch packet to OpenCode CLI via OmniRoute."""
    data = json.loads(packet_file.read_text())
    ctx = data.get("context", {})
    goal = ctx.get("goal", "") if isinstance(ctx, dict) else str(ctx)
    
    if isinstance(goal, dict):
        goal = goal.get("title", goal.get("project", "task"))
    
    worktree = WORKSPACE / ".worktrees/opencode"
    
    # OpenCode ask command
    cmd = f'cd {worktree} && opencode ask --model auto "{goal[:200]}" 2>&1 | head -100'
    
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=120)
    
    if result.returncode == 0 or "success" in result.stdout.lower():
        done_dir = WORKSPACE / "_A2A_QUEUE/done"
        done_dir.mkdir(exist_ok=True)
        packet_file.rename(done_dir / packet_file.name)
        return {"status": "dispatched", "output": result.stdout[:200]}
    else:
        return {"status": "error", "output": result.stderr[:200]}

def main():
    print("=== CLI AGENT DISPATCH ===")
    
    # Dispatch to Codex
    codex_dir = WORKSPACE / "_A2A_QUEUE/assigned/codex"
    codex_packets = list(codex_dir.glob("*.json"))[:3]  # Test with 3 packets first
    
    for p in codex_packets:
        result = dispatch_to_codex(p)
        print(f"Codex: {p.name} → {result['status']}")
    
    # Dispatch to OpenCode
    opencode_dir = WORKSPACE / "_A2A_QUEUE/assigned/opencode"
    opencode_packets = list(opencode_dir.glob("*.json"))[:3]  # Test with 3 packets
    
    for p in opencode_packets:
        result = dispatch_to_opencode(p)
        print(f"OpenCode: {p.name} → {result['status']}")
    
    print("Done!")

if __name__ == "__main__":
    main()