#!/usr/bin/env python3
"""
CMUX CLI Dispatcher - Execute assigned packets via Codex/OpenCode CLI
"""

import json, subprocess, time
from pathlib import Path

WS = Path("/Users/sirinx/sirinx-os")

def run_codex(goal):
    """Call Codex CLI via OmniRoute."""
    wt = WS / ".worktrees/codex"
    try:
        result = subprocess.run(
            f"cd {wt} && codex --model auto \"{goal}\" --no-stream 2>&1",
            shell=True, capture_output=True, text=True, timeout=180
        )
        return result.returncode == 0, result.stdout[:300]
    except Exception as e:
        return False, str(e)

def run_opencode(goal):
    """Call OpenCode CLI via OmniRoute."""
    wt = WS / ".worktrees/opencode"
    try:
        result = subprocess.run(
            f"cd {wt} && opencode ask --model auto \"{goal}\" 2>&1",
            shell=True, capture_output=True, text=True, timeout=180
        )
        return result.returncode == 0, result.stdout[:300]
    except Exception as e:
        return False, str(e)

def main():
    # Dispatch ALL assigned packets
    for agent in ["codex", "opencode"]:
        assigned = WS / f"_A2A_QUEUE/assigned/{agent}"
        done = WS / "_A2A_QUEUE/done"
        blocked = WS / "_A2A_QUEUE/blocked"
        done.mkdir(exist_ok=True)
        blocked.mkdir(exist_ok=True)
        
        packets = list(assigned.glob("*.json"))
        print(f"=== {agent.upper()}: {len(packets)} packets ===")
        
        for p in packets:
            data = json.loads(p.read_text())
            ctx = data.get("context", {})
            goal = ctx.get("goal", "") if isinstance(ctx, dict) else str(ctx)
            
            # Make goal readable
            if isinstance(goal, dict):
                goal = goal.get("title", goal.get("project", "task"))[:200]
            
            if agent == "codex":
                success, output = run_codex(goal)
            else:
                success, output = run_opencode(goal)
            
            if success:
                p.rename(done / p.name)
                print(f"  ✅ {p.name[:40]}")
            else:
                # Keep in assigned for retry
                p.write_text(json.dumps({**data, "dispatch_error": output[:200]}, indent=2))
                print(f"  ❌ {p.name[:40]} - retrying")
                # Retry once
                if agent == "codex":
                    success2, _ = run_codex(goal)
                else:
                    success2, _ = run_opencode(goal)
                if success2:
                    # Move from original location (p was overwritten)
                    assigned_packets = list(WS.glob(f"_A2A_QUEUE/assigned/{agent}/*.json"))
                    for ap in assigned_packets:
                        if ap.stat().st_mtime > time.time() - 60:
                            ap.rename(done / ap.name)
                            print(f"  ✅ (retry) {ap.name[:40]}")
    
    print("Dispatch complete. Check _A2A_QUEUE/done/")

if __name__ == "__main__":
    main()