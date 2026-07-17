#!/usr/bin/env python3
"""
SIRINX OS — Production Deploy Pipeline
Auto commit → push → review → deploy via Cloudflare

Usage:
  python3 scripts/deploy-pipeline.py commit   # auto-commit safe changes
  python3 scripts/deploy-pipeline.py push      # push to GitHub (needs --confirm)
  python3 scripts/deploy-pipeline.py deploy    # deploy to Cloudflare (needs --confirm)
  python3 scripts/deploy-pipeline.py review    # run OpenCode review on last commit
  python3 scripts/deploy-pipeline.py status    # show pipeline status
"""

from __future__ import annotations
import json, os, subprocess, sys, time
from datetime import datetime, timezone
from pathlib import Path

REPO = Path("/Users/sirinx/sirinx-os")
LOG_DIR = REPO / "docs" / "deploy-log"
LOG_DIR.mkdir(parents=True, exist_ok=True)

def run(cmd, timeout=120, cwd=None):
    try:
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True,
                           timeout=timeout, cwd=cwd or str(REPO))
        return r.returncode, r.stdout.strip(), r.stderr.strip()
    except Exception as e:
        return -1, "", str(e)

def log(level, msg):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] [{level}] {msg}")

# ─── COMMIT ─────────────────────────────────────────────────────

def auto_commit():
    """Auto-commit safe changes (Tier A/B only, never secrets)."""
    log("COMMIT", "Scanning for safe changes...")

    rc, status, _ = run("git status --porcelain")
    if not status.strip():
        log("COMMIT", "No changes to commit")
        return {"committed": False, "reason": "clean"}

    # Categorize files
    safe = []
    unsafe = []
    for line in status.strip().split("\n"):
        if not line.strip():
            continue
        parts = line.strip().split(None, 1)
        if len(parts) < 2:
            continue
        status_code, filepath = parts[0], parts[1]

        # Block secrets
        if any(s in filepath.lower() for s in [".env", "secret", "credential", ".pem", ".key"]):
            unsafe.append(filepath)
            continue
        # Block submodule refs
        if status_code.startswith("M ") and filepath in ["integrations/omniroute", "openwiki", "integrations/cynative", "integrations/markdownify-mcp"]:
            continue
        safe.append(filepath)

    if unsafe:
        log("COMMIT", f"BLOCKED unsafe files: {unsafe}")
    if not safe:
        log("COMMIT", "No safe files to commit")
        return {"committed": False, "blocked": unsafe}

    # Stage safe files
    for f in safe:
        run(f"git add '{f}'")

    # Generate commit message
    rc, diff_stat, _ = run("git diff --cached --stat")
    file_count = len(safe)

    commit_msg = f"auto: {file_count} files updated by self-evolution engine\n\nFiles: {', '.join(safe[:10])}\nGenerated: {datetime.now(timezone.utc).isoformat()}"

    rc, out, err = run(f"git commit -m \"{commit_msg}\"")
    if rc == 0:
        rc, sha, _ = run("git rev-parse HEAD")
        log("COMMIT", f"✅ Committed {file_count} files → {sha[:12]}")
        return {"committed": True, "sha": sha[:12], "files": file_count, "blocked": unsafe}
    else:
        log("COMMIT", f"❌ Commit failed: {err}")
        return {"committed": False, "error": err}

# ─── PUSH ────────────────────────────────────────────────────────

def push_to_github(confirm=False):
    """Push to GitHub remote (requires confirm)."""
    if not confirm:
        log("PUSH", "⚠️ Push requires --confirm (Tier C: external write)")
        return {"pushed": False, "reason": "needs --confirm"}

    rc, branch, _ = run("git branch --show-current")
    rc, sha, _ = run("git rev-parse HEAD")
    rc, ahead, _ = run("git rev-list --count origin..HEAD 2>/dev/null || echo 0")

    log("PUSH", f"Branch: {branch}, Commits ahead: {ahead}")

    if int(ahead) == 0:
        log("PUSH", "Nothing to push (up to date)")
        return {"pushed": False, "reason": "up-to-date"}

    rc, out, err = run(f"git push origin {branch}", timeout=60)
    if rc == 0:
        log("PUSH", f"✅ Pushed {ahead} commits to origin/{branch}")
        return {"pushed": True, "commits": int(ahead), "sha": sha[:12]}
    else:
        log("PUSH", f"❌ Push failed: {err}")
        return {"pushed": False, "error": err}

# ─── REVIEW ──────────────────────────────────────────────────────

def review_last_commit():
    """Run automated review on last commit diff."""
    log("REVIEW", "Scanning last commit diff...")
    rc, sha, _ = run("git rev-parse HEAD")
    rc, diff, _ = run("git diff HEAD~1 HEAD --stat")

    issues = []

    # Check for secrets in diff
    rc, secret_check, _ = run("git diff HEAD~1 HEAD | grep -iE '(api_key|password|secret|token)\\s*=' | head -5")
    if secret_check.strip():
        issues.append({"severity": "CRITICAL", "type": "secret_leak", "detail": secret_check[:200]})

    # Check for large files
    for line in diff.strip().split("\n"):
        if "|" in line:
            parts = line.split("|")
            if len(parts) >= 2:
                insertions = parts[1].strip()
                if "+" in insertions:
                    count = insertions.count("+")
                    if count > 500:
                        fname = parts[0].strip()
                        issues.append({"severity": "WARN", "type": "large_file", "detail": f"{fname}: {count}+ lines"})

    # Check .env modifications
    rc, env_check, _ = run("git diff HEAD~1 HEAD --name-only | grep -i '\\.env'")
    if env_check.strip():
        issues.append({"severity": "CRITICAL", "type": "env_file", "detail": ".env modified"})

    verdict = "PASS" if not issues else "ISSUES_FOUND"
    log("REVIEW", f"Verdict: {verdict} ({len(issues)} issues)")

    result = {"sha": sha[:12], "verdict": verdict, "issues": issues}
    log_file = LOG_DIR / f"review_{sha[:12]}.json"
    log_file.write_text(json.dumps(result, indent=2, ensure_ascii=False))
    return result

# ─── DEPLOY ──────────────────────────────────────────────────────

def deploy_cloudflare(confirm=False):
    """Deploy to Cloudflare Workers + Pages (requires confirm)."""
    if not confirm:
        log("DEPLOY", "⚠️ Deploy requires --confirm (Tier C: production)")
        return {"deployed": False, "reason": "needs --confirm"}

    results = {}

    # 1. Deploy main-router worker
    log("DEPLOY", "Deploying main-router worker to Cloudflare...")
    rc, out, err = run(
        "npx wrangler deploy --config infra/cloudflare/main-router/wrangler.jsonc 2>&1",
        timeout=120, cwd=str(REPO)
    )
    if rc == 0:
        log("DEPLOY", "✅ Worker deployed")
        results["worker"] = "deployed"
    else:
        log("DEPLOY", f"❌ Worker deploy failed: {err[:200]}")
        results["worker"] = f"failed: {err[:200]}"

    # 2. Deploy edge worker (if separate)
    log("DEPLOY", "Deploying edge worker...")
    edge_path = REPO / "infra" / "cloudflare" / "sirinx-edge-worker.js"
    if edge_path.exists():
        results["edge"] = "ready (manual deploy needed - needs wrangler.toml)"
    else:
        results["edge"] = "not found"

    results["deployed_at"] = datetime.now(timezone.utc).isoformat()
    log_file = LOG_DIR / f"deploy_{int(time.time())}.json"
    log_file.write_text(json.dumps(results, indent=2, ensure_ascii=False))

    return results

# ─── STATUS ──────────────────────────────────────────────────────

def pipeline_status():
    """Show full pipeline status."""
    rc, branch, _ = run("git branch --show-current")
    rc, sha, _ = run("git rev-parse HEAD")
    rc, dirty, _ = run("git status --porcelain | wc -l")
    rc, ahead, _ = run("git rev-list --count origin..HEAD 2>/dev/null || echo 0")
    rc, remote_url, _ = run("git remote get-url origin")

    print(f"\n{'='*50}")
    print(f"SIRINX OS — DEPLOY PIPELINE STATUS")
    print(f"{'='*50}")
    print(f"Branch:  {branch}")
    print(f"HEAD:    {sha[:12]}")
    print(f"Dirty:   {dirty.strip()} files")
    print(f"Ahead:   {ahead} commits")
    print(f"Remote:  {remote_url}")
    print(f"{'='*50}")

    return {"branch": branch, "sha": sha[:12], "dirty": int(dirty),
            "ahead": int(ahead), "remote": remote_url}

# ─── CLI ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    if len(sys.argv) < 2:
        pipeline_status()
        sys.exit(0)

    cmd = sys.argv[1]
    confirm = "--confirm" in sys.argv

    if cmd == "commit":
        result = auto_commit()
    elif cmd == "push":
        result = push_to_github(confirm)
    elif cmd == "review":
        result = review_last_commit()
    elif cmd == "deploy":
        result = deploy_cloudflare(confirm)
    elif cmd == "status":
        result = pipeline_status()
    else:
        print(f"Unknown command: {cmd}")
        print("Usage: deploy-pipeline.py [commit|push|review|deploy|status] [--confirm]")
        sys.exit(1)

    print(json.dumps(result, indent=2, ensure_ascii=False))
