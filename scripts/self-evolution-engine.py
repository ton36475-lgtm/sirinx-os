#!/usr/bin/env python3
"""
SIRINX OS Self-Evolution Engine — Dream Mode

Runs on cron (every 30 min) or triggered by error.
Performs autonomous system health check, error detection, and self-repair.

Evolution Levels:
  Level 1: Health check + log (always)
  Level 2: Auto-repair known error patterns (Tier A safe)
  Level 3: Skill gap detection + propose new skill
  Level 4: Performance optimization proposal (human review)
  Level 5: Architecture mutation proposal (human gate required)

Never touches:
  - Secrets or .env
  - External APIs or customer messaging
  - Git push or deploy
  - Cloud mutations
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path("/Users/sirinx/sirinx-os")
LOG_DIR = REPO_ROOT / "docs" / "evolution-log"
LOG_DIR.mkdir(parents=True, exist_ok=True)

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def log(level: str, msg: str) -> None:
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] [{level}] {msg}")

def run_cmd(cmd: str, timeout: int = 30) -> tuple[int, str]:
    try:
        r = subprocess.run(
            cmd, shell=True, capture_output=True, text=True, timeout=timeout,
            cwd=str(REPO_ROOT)
        )
        return r.returncode, r.stdout.strip()
    except Exception as e:
        return -1, str(e)

def check_disk() -> dict:
    """Check disk space"""
    rc, out = run_cmd("df -h / | tail -1")
    parts = out.split()
    if len(parts) >= 8:
        free_str = parts[3]
        # Convert to GB
        if "Gi" in free_str:
            free_gb = float(free_str.replace("Gi", ""))
        elif "Mi" in free_str:
            free_gb = float(free_str.replace("Mi", "")) / 1024
        else:
            free_gb = 0
        return {"free_gb": free_gb, "critical": free_gb < 5.0, "warning": free_gb < 10.0}
    return {"free_gb": 0, "critical": True, "warning": True}

def check_tests() -> dict:
    """Run HQ test suite"""
    rc, out = run_cmd("pnpm hq:test 2>&1", timeout=120)
    passed = rc == 0
    return {"passed": passed, "returncode": rc, "output_tail": out[-200:] if out else ""}

def check_git_status() -> dict:
    """Check uncommitted files"""
    rc, out = run_cmd("git status --short | wc -l")
    count = int(out.strip()) if out.strip().isdigit() else 999
    return {"uncommitted": count, "warning": count > 20}

def check_services() -> dict:
    """Check running services"""
    services = {}
    for port, name in [(3800, "skills-api"), (8711, "dev-control"), (20128, "omniroute"), (8644, "hermes-gateway")]:
        rc, _ = run_cmd(f"curl -s -o /dev/null -w '%{{http_code}}' http://localhost:{port}/ 2>/dev/null || echo 'down'")
        services[name] = "up" if rc == 0 else "unknown"
    return services

def check_a2a_queue() -> dict:
    """Check A2A queue health"""
    queue_dir = REPO_ROOT / "_A2A_QUEUE"
    counts = {}
    for d in ["inbox", "outbox", "done", "blocked", "approvals"]:
        p = queue_dir / d
        if p.exists():
            counts[d] = len(list(p.glob("*.json")))
        else:
            counts[d] = 0
    return counts

def auto_repair_disk() -> list[str]:
    """Auto-repair: clean caches if disk low"""
    actions = []
    disk = check_disk()
    if disk.get("warning", True):
        # Clean safe targets
        targets = [
            "apps/centerbrain-shell/.next",
            ".cache",
        ]
        for t in targets:
            p = REPO_ROOT / t
            if p.exists():
                run_cmd(f"rm -rf {p}")
                actions.append(f"Cleaned: {t}")
        # Clean pycache
        run_cmd("find . -name '__pycache__' -type d -exec rm -rf {} + 2>/dev/null")
        actions.append("Cleaned: __pycache__")
    return actions

def auto_repair_services() -> list[str]:
    """Auto-repair: restart down services"""
    actions = []
    services = check_services()
    # Don't auto-start OmniRoute (too heavy for 8GB)
    # Just log status
    for name, status in services.items():
        if status != "up":
            actions.append(f"WARNING: {name} is down (not auto-started)")
    return actions

def detect_error_patterns() -> list[dict]:
    """Scan recent logs for error patterns"""
    errors = []
    # Check A2A blocked queue
    blocked_dir = REPO_ROOT / "_A2A_QUEUE" / "blocked"
    if blocked_dir.exists():
        for f in blocked_dir.glob("*.json"):
            try:
                data = json.loads(f.read_text())
                reason = data.get("receipt", {}).get("reason", "")[:100]
                errors.append({
                    "source": "a2a-blocked",
                    "file": f.name,
                    "reason": reason
                })
            except:
                pass
    # Check Hermes logs
    hermes_logs = Path.home() / ".hermes" / "logs"
    if hermes_logs.exists():
        rc, out = run_cmd(f"grep -i 'error\\|failed\\|traceback' {hermes_logs}/gateway.log 2>/dev/null | tail -5")
        if out:
            for line in out.split("\n"):
                if line.strip():
                    errors.append({"source": "hermes-gateway", "message": line.strip()[:120]})
    return errors

def evolution_cycle() -> dict:
    """Run one evolution cycle"""
    cycle_id = f"evo-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
    log("INFO", f"Starting evolution cycle: {cycle_id}")

    report = {
        "cycle_id": cycle_id,
        "timestamp": now_iso(),
        "checks": {},
        "repairs": [],
        "errors_found": [],
        "proposals": [],
        "mutations": [],
    }

    # Level 1: Health Check
    log("INFO", "Level 1: Health check...")
    report["checks"]["disk"] = check_disk()
    report["checks"]["git"] = check_git_status()
    report["checks"]["services"] = check_services()
    report["checks"]["a2a_queue"] = check_a2a_queue()

    if report["checks"]["disk"].get("critical"):
        log("WARN", "DISK CRITICAL — auto-repairing")
        report["repairs"].extend(auto_repair_disk())

    report["checks"]["disk_after"] = check_disk()

    # Level 2: Error Detection
    log("INFO", "Level 2: Error detection...")
    report["errors_found"] = detect_error_patterns()

    # Level 3: Auto-Repair Services
    log("INFO", "Level 3: Service check...")
    report["repairs"].extend(auto_repair_services())

    # Level 4: Test Suite (only if no critical issues)
    if not report["checks"]["disk"].get("critical"):
        log("INFO", "Level 4: Test suite...")
        report["checks"]["tests"] = check_tests()
        if not report["checks"]["tests"]["passed"]:
            log("WARN", "Tests FAILED — proposing investigation")
            report["proposals"].append({
                "type": "test_failure",
                "action": "investigate test failures",
                "priority": "high",
                "requires": "codex-captain"
            })

    # Summary
    total_errors = len(report["errors_found"])
    total_repairs = len(report["repairs"])
    total_proposals = len(report["proposals"])

    log("INFO", f"Cycle complete: {total_errors} errors, {total_repairs} repairs, {total_proposals} proposals")

    # Save report
    report_path = LOG_DIR / f"{cycle_id}.json"
    report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False))

    return report

if __name__ == "__main__":
    report = evolution_cycle()
    # Print summary for cron delivery
    disk = report["checks"].get("disk", {})
    disk_after = report["checks"].get("disk_after", {})
    print(f"\n{'='*50}")
    print(f"EVOLUTION CYCLE: {report['cycle_id']}")
    print(f"{'='*50}")
    print(f"Disk: {disk.get('free_gb', '?')}GB → {disk_after.get('free_gb', '?')}GB free")
    print(f"Services: {json.dumps(report['checks'].get('services', {}))}")
    print(f"A2A: {json.dumps(report['checks'].get('a2a_queue', {}))}")
    print(f"Errors: {len(report['errors_found'])}")
    print(f"Repairs: {len(report['repairs'])}")
    print(f"Proposals: {len(report['proposals'])}")
    if report['errors_found']:
        print(f"\nTop errors:")
        for e in report['errors_found'][:3]:
            print(f"  ⚠️ {e.get('source')}: {e.get('reason', e.get('message', ''))[:80]}")
    if report['proposals']:
        print(f"\nProposals:")
        for p in report['proposals']:
            print(f"  📋 {p['action']} → {p.get('requires', 'human')}")
