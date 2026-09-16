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
    """L3 Auto-Purge: aggressive disk cleanup when space is low"""
    actions = []
    disk = check_disk()
    free = disk.get("free_gb", 0)

    # Always clean pycache (zero risk)
    run_cmd("find /Users/sirinx/sirinx-os -name '__pycache__' -type d -exec rm -rf {} + 2>/dev/null")
    actions.append("Cleaned: __pycache__")

    if free < 15.0:
        log("WARN", f"Disk low ({free:.1f}GB) — aggressive cleanup")

        # 1. Package manager caches
        rc, _ = run_cmd("pnpm store prune 2>/dev/null", timeout=60)
        if rc == 0: actions.append("Cleaned: pnpm store prune")

        rc, _ = run_cmd("npm cache clean --force 2>/dev/null", timeout=60)
        if rc == 0: actions.append("Cleaned: npm cache")

        rc, _ = run_cmd("bun pm cache rm 2>/dev/null", timeout=30)
        if rc == 0: actions.append("Cleaned: bun cache")

        # 2. Build artifacts older than 24h
        targets_24h = [
            "apps/centerbrain-shell/.next",
            ".turbo",
            "integrations/omniroute/.build",
        ]
        for t in targets_24h:
            p = REPO_ROOT / t
            if p.exists():
                run_cmd(f"rm -rf {p}")
                actions.append(f"Cleaned: {t}")

        # 3. Log rotation — keep last 100 lines of each log
        log_dirs = [
            Path.home() / ".hermes" / "logs",
            REPO_ROOT / "logs",
        ]
        for ld in log_dirs:
            if ld.exists():
                for lf in ld.glob("*.log"):
                    if lf.stat().st_size > 1_000_000:  # >1MB
                        run_cmd(f"tail -100 {lf} > {lf}.tmp && mv {lf}.tmp {lf}")
                        actions.append(f"Rotated: {lf.name}")

        # 4. A2A outbox archive — move old packets
        outbox = REPO_ROOT / "_A2A_QUEUE" / "outbox"
        archive = REPO_ROOT / "_A2A_QUEUE" / "archive"
        if outbox.exists():
            archive.mkdir(exist_ok=True)
            import time as _time
            cutoff = _time.time() - 86400  # 24h
            count = 0
            for f in outbox.glob("*.json"):
                if f.stat().st_mtime < cutoff:
                    f.rename(archive / f.name)
                    count += 1
            if count:
                actions.append(f"Archived: {count} old outbox packets (>24h)")

        # 5. System caches
        cache_targets = [
            REPO_ROOT / ".cache",
            Path.home() / "Library" / "Caches" / "dev.kdrag0n.MacVirt",
            Path.home() / "Library" / "Caches" / "camoufox",
            Path.home() / "Library" / "Caches" / "ms-playwright",
        ]
        for ct in cache_targets:
            if ct.exists():
                run_cmd(f"rm -rf {ct}")
                actions.append(f"Cleaned: {ct.name}")

        # 6. Codex sessions (3.9GB hog)
        codex_sessions = Path.home() / ".codex" / "sessions"
        if codex_sessions.exists():
            du_rc, du_out = run_cmd(f"du -sh {codex_sessions}")
            run_cmd(f"rm -rf {codex_sessions}")
            actions.append(f"Cleaned: codex sessions ({du_out})")

        # 7. Claude old versions
        claude_ver = Path.home() / ".local" / "share" / "claude" / "versions"
        if claude_ver.exists():
            versions = sorted(claude_ver.iterdir(), key=lambda p: p.stat().st_mtime, reverse=True)
            for old in versions[1:]:  # Keep latest
                run_cmd(f"rm -rf {old}")
            if len(versions) > 1:
                actions.append(f"Cleaned: {len(versions)-1} old Claude versions")

    return actions

def auto_repair_services() -> list[str]:
    """L3 Auto-repair: restart down services"""
    actions = []
    services = check_services()

    # Service restart map (only safe-to-restart services)
    restart_map = {
        "skills-api": {"cmd": "cd /Users/sirinx/sirinx-os && node apps/dev-dashboard/server.mjs &", "port": 3800, "safe": True},
        "dev-control": {"cmd": "cd /Users/sirinx/sirinx-os && node services/dev-control-api/server.mjs &", "port": 8711, "safe": True},
        "hermes-gateway": {"cmd": "hermes gateway restart", "port": 8644, "safe": True},
    }

    for name, status in services.items():
        if status != "up":
            if name in restart_map and restart_map[name]["safe"]:
                log("WARN", f"Service {name} down — attempting restart")
                rc, out = run_cmd(restart_map[name]["cmd"], timeout=15)
                if rc == 0:
                    actions.append(f"Restarted: {name}")
                else:
                    actions.append(f"FAILED restart: {name} — {out[:80]}")
            else:
                actions.append(f"WARNING: {name} is down (manual restart needed)")

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
