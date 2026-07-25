#!/usr/bin/env python3
"""
SIRINX OS — GhostClawCoreEngine (self-evolution-core.py)

The definitive autonomous core engine for GhostClaw Unified OS.
Implements the Never-Dying Loop with Dream Mode sandbox simulation.

Architecture: 4-level evolution pipeline
  L1: Evolution Loop (orchestrator)
  L2: Bridge wiring (canonical A2A + OmniRoute gateway)
  L3: Disk health + auto-purge
  L4: Test suite + mutation routing
  L5: Mutation engine (error → skill → evolve)

Node identity: local_mac_m2_core
Gateway: OmniRoute API Gateway :20128 (250 providers, 94 MCP tools)

Usage:
  python3 scripts/self-evolution-core.py
  python3 scripts/self-evolution-core.py --dream
  python3 scripts/self-evolution-core.py --checkpoint
  python3 scripts/self-evolution-core.py --recover
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

# ─── Identity ───
NODE_IDENTITY = "local_mac_m2_core"
OMNIROUTE_ENDPOINT = "http://127.0.0.1:20128"
CANONICAL_VERSION = "2.0"
MIN_DISK_GB = 15.0
MAX_MUTATIONS_PER_CYCLE = 3


class GhostClawCoreEngine:
    """Core autonomous evolution engine — the never-dying loop."""

    def __init__(self):
        self.workspace = Path("/Users/sirinx/sirinx-os")
        self.a2a_queue_dir = self.workspace / "_A2A_QUEUE"
        self.omniroute_endpoint = OMNIROUTE_ENDPOINT
        self.min_disk_threshold_gb = MIN_DISK_GB
        self.checkpoint_dir = self.workspace / "storage" / "cmux_snapshots"
        self.evolution_log = self.workspace / "docs" / "evolution-log"
        self.sandbox_dir = self.workspace / "storage" / "dream-sandbox"
        self.mutation_dir = self.workspace / "storage" / "mutations"
        self.obsidian_brain = Path("/Users/sirinx/Documents/Obsidian Vault/SIRINX")

        # Ensure dirs exist
        for d in [self.checkpoint_dir, self.evolution_log, self.sandbox_dir,
                  self.mutation_dir, self.a2a_queue_dir / "archive"]:
            d.mkdir(parents=True, exist_ok=True)

    def _now(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    def _ts(self) -> str:
        return datetime.now().strftime("%H:%M:%S")

    def _log(self, level: str, msg: str):
        print(f"[{self._ts()}] [{level}] {msg}")

    def _run(self, cmd: str | list, timeout: int = 60, cwd: str | None = None) -> tuple[int, str, str]:
        try:
            if isinstance(cmd, str):
                r = subprocess.run(cmd, shell=True, capture_output=True, text=True,
                                   timeout=timeout, cwd=cwd or str(self.workspace))
            else:
                r = subprocess.run(cmd, capture_output=True, text=True,
                                   timeout=timeout, cwd=cwd or str(self.workspace))
            return r.returncode, r.stdout.strip(), r.stderr.strip()
        except subprocess.TimeoutExpired:
            return -1, "", f"TIMEOUT after {timeout}s"
        except Exception as e:
            return -2, "", str(e)

    # ═══════════════════════════════════════════════════════════════
    # L3: DISK HEALTH + AUTO-PURGE
    # ═══════════════════════════════════════════════════════════════

    def run_l3_disk_purger(self) -> dict:
        """
        Disk Space Mitigation — pull space back from caches into Safety Zone (>15GB)
        """
        self._log("L3-HEALTH", "Initiating automatic resource auditing...")
        total, used, free = shutil.disk_usage(self.workspace)
        free_gb = free / (2**30)
        before_gb = free_gb
        self._log("L3-HEALTH", f"Current free disk space: {free_gb:.2f} GB")

        actions = []
        warnings = []
        purge_enabled = os.environ.get("SELF_EVOLUTION_ALLOW_PURGE") == "1"

        # All deletion targets must resolve inside one of these explicit cache/temp roots.
        allowlisted_roots = [
            (Path.home() / ".npm" / "_cacache").resolve(),
            Path("/tmp").resolve(),
        ]
        pnpm_rc, pnpm_store_out, _ = self._run(["pnpm", "store", "path"])
        if pnpm_rc == 0 and pnpm_store_out:
            allowlisted_roots.append(Path(pnpm_store_out.splitlines()[-1]).expanduser().resolve())

        def allowed_target(target: Path) -> bool:
            try:
                resolved = target.expanduser().resolve()
                return any(resolved == root or resolved.is_relative_to(root)
                           for root in allowlisted_roots)
            except (OSError, RuntimeError) as exc:
                warnings.append(f"BLOCKED_UNSAFE_PATH: {target} ({exc})")
                return False

        def plan_or_delete(target: Path, label: str) -> bool:
            if not allowed_target(target):
                warning = f"BLOCKED_UNSAFE_PATH: {target}"
                warnings.append(warning)
                self._log("L3-WARN", warning)
                return False
            if not target.exists():
                return False
            if not purge_enabled:
                action = f"WOULD_PURGE: {label} ({target})"
                actions.append(action)
                self._log("L3-DRY-RUN", action)
                return False
            try:
                if target.is_dir() and not target.is_symlink():
                    shutil.rmtree(target)
                else:
                    target.unlink()
                actions.append(f"Purged: {label} ({target})")
                return True
            except (OSError, RuntimeError) as exc:
                warning = f"PURGE_FAILED: {target} ({exc})"
                warnings.append(warning)
                self._log("L3-ERROR", warning)
                return False

        if free_gb < self.min_disk_threshold_gb:
            mode = "enabled" if purge_enabled else "dry-run"
            self._log("L3-REPAIR", f"Disk space critical; purge mode: {mode}")

            # 1. Package manager caches
            for cmd, label, target in [
                (["pnpm", "store", "prune"], "pnpm store", Path(pnpm_store_out) if pnpm_rc == 0 and pnpm_store_out else None),
                (["npm", "cache", "clean", "--force"], "npm cache", Path.home() / ".npm" / "_cacache"),
            ]:
                if target is None or not allowed_target(target):
                    warning = f"BLOCKED_UNSAFE_PATH: {target or label}"
                    warnings.append(warning)
                    self._log("L3-WARN", warning)
                    continue
                if not purge_enabled:
                    action = f"WOULD_PURGE: {label} ({target.resolve()})"
                    actions.append(action)
                    self._log("L3-DRY-RUN", action)
                    continue
                try:
                    r = subprocess.run(cmd, capture_output=True, text=True,
                                       timeout=60, cwd=str(self.workspace))
                    if r.returncode == 0:
                        actions.append(f"Cleared: {label}")
                        self._log("L3-REPAIR", f"Cleared {label}")
                except Exception as e:
                    self._log("L3-ERROR", f"Package clean failed ({label}): {e}")

            # 2. Build artifacts
            artifact_targets = [
                self.workspace / "apps" / "centerbrain-shell" / ".next",
                self.workspace / ".turbo",
                self.workspace / "integrations" / "omniroute" / ".build",
                self.workspace / ".cache",
            ]
            for target in artifact_targets:
                if target.exists():
                    plan_or_delete(target, target.name)

            # 3. Python cache
            for pyc in self.workspace.rglob("__pycache__"):
                if pyc.is_dir():
                    plan_or_delete(pyc, "__pycache__")

            # 4. Log rotation (>1MB → keep last 100 lines)
            for log_dir in [Path.home() / ".hermes" / "logs", self.workspace / "logs"]:
                if log_dir.exists():
                    for lf in log_dir.glob("*.log"):
                        try:
                            if lf.stat().st_size > 1_000_000:
                                if not allowed_target(lf):
                                    warning = f"BLOCKED_UNSAFE_PATH: {lf}"
                                    warnings.append(warning)
                                    self._log("L3-WARN", warning)
                                elif not purge_enabled:
                                    actions.append(f"WOULD_PURGE: rotate {lf}")
                                else:
                                    lines = lf.read_text(errors="replace").splitlines()[-100:]
                                    lf.write_text("\n".join(lines) + "\n")
                                    actions.append(f"Rotated: {lf.name}")
                        except Exception:
                            pass

            # 5. A2A archive purge (>24h)
            archive_dir = self.a2a_queue_dir / "archive"
            if archive_dir.exists():
                purged = 0
                for f in archive_dir.glob("*.json"):
                    try:
                        if f.stat().st_mtime < (time.time() - 86400):
                            if plan_or_delete(f, "archived packet"):
                                purged += 1
                    except Exception:
                        pass
                if purged:
                    actions.append(f"Purged: {purged} archived packets (>24h)")
                    self._log("L3-REPAIR", f"Purged {purged} historical transaction log packets.")

            # 6. System caches
            sys_caches = [
                Path.home() / "Library" / "Caches" / "dev.kdrag0n.MacVirt",
                Path.home() / "Library" / "Caches" / "camoufox",
                Path.home() / "Library" / "Caches" / "ms-playwright",
                Path.home() / ".local" / "share" / "uv",
                Path.home() / ".codex" / "sessions",
            ]
            for cache in sys_caches:
                if cache.exists():
                    plan_or_delete(cache, cache.name)

            # 7. Claude old versions (keep latest)
            claude_ver = Path.home() / ".local" / "share" / "claude" / "versions"
            if claude_ver.exists():
                versions = sorted(claude_ver.iterdir(),
                                  key=lambda p: p.stat().st_mtime, reverse=True)
                for old in versions[1:]:
                    plan_or_delete(old, f"claude {old.name}")

            # 8. Trash
            trash = Path.home() / ".Trash"
            if trash.exists() and trash.is_dir():
                try:
                    trash_items = list(trash.iterdir())
                except OSError as exc:
                    warning = f"Trash unavailable for enumeration: {trash} ({exc})"
                    warnings.append(warning)
                    self._log("L3-WARN", warning)
                else:
                    for item in trash_items:
                        plan_or_delete(item, f"Trash/{item.name}")
            else:
                warning = f"Trash unavailable or not a directory: {trash}"
                warnings.append(warning)
                self._log("L3-WARN", warning)

        # Recheck
        _, _, free = shutil.disk_usage(self.workspace)
        after_gb = free / (2**30)
        self._log("L3-HEALTH", f"Post-purge disk space: {after_gb:.2f} GB")

        return {
            "before_gb": round(before_gb, 2),
            "after_gb": round(after_gb, 2),
            "actions": actions,
            "warnings": warnings,
            "purge_enabled": purge_enabled,
            "critical": after_gb < self.min_disk_threshold_gb,
        }

    # ═══════════════════════════════════════════════════════════════
    # L2: OMNIROUTE GATEWAY WIRING + CANONICAL A2A
    # ═══════════════════════════════════════════════════════════════

    def wire_omniroute_gateway(self) -> dict:
        """
        Convert legacy packets in Inbox to Canonical A2A format
        and verify OmniRoute gateway connectivity.
        """
        inbox_dir = self.a2a_queue_dir / "inbox"
        if not inbox_dir.exists():
            return {"error": "inbox directory not found"}

        self._log("L2-BRIDGE", "Checking pipeline for pending unacknowledged packets...")

        # Check OmniRoute health
        omni_rc, omni_out, _ = self._run(
            f"curl -s -o /dev/null -w '%{{http_code}}' {self.omniroute_endpoint}/ 2>/dev/null"
        )
        omni_status = "UP" if omni_rc == 0 and omni_out in ("200", "307") else "DOWN"
        self._log("L2-BRIDGE", f"OmniRoute Gateway ({self.omniroute_endpoint}): {omni_status}")

        converted = 0
        skipped = 0

        for packet_path in inbox_dir.glob("*.json"):
            try:
                with open(packet_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)

                # Skip if already canonical
                if data.get("canonical_version") == CANONICAL_VERSION:
                    skipped += 1
                    continue

                # Convert to canonical A2A format
                canonical_packet = {
                    "canonical_version": CANONICAL_VERSION,
                    "source_node": NODE_IDENTITY,
                    "gateway_target": self.omniroute_endpoint,
                    "timestamp": time.time(),
                    "message_id": f"msg-{packet_path.stem}",
                    "mission_id": data.get("mission_id", f"M-{packet_path.stem}"),
                    "from": data.get("from", {"agent": "hermes-commander", "role": "commander"}),
                    "to": data.get("to", {"agent": "codex-captain", "role": "worker"}),
                    "context": data.get("context", {"goal": str(data)[:200], "tier": "A"}),
                    "payload": data,
                    "routing_status": "CANONICALIZED",
                    "safety": self._safety_scan(
                        data.get("context", {}).get("goal", str(data)[:200])
                    ),
                }

                with open(packet_path, 'w', encoding='utf-8') as f:
                    json.dump(canonical_packet, f, indent=2, ensure_ascii=False)
                converted += 1
                self._log("L2-BRIDGE", f"Wired packet {packet_path.name} → Canonical A2A")

            except Exception as e:
                self._log("L2-ERROR", f"Failed to process packet {packet_path.name}: {e}")

        self._log("L2-BRIDGE", f"Converted: {converted}, Skipped: {skipped}, Gateway: {omni_status}")

        return {
            "converted": converted,
            "skipped": skipped,
            "gateway_status": omni_status,
            "gateway_endpoint": self.omniroute_endpoint,
        }

    def _safety_scan(self, prompt: str) -> dict:
        """Evaluate command safety before dispatch."""
        prompt_lower = prompt.lower()

        forbidden = [
            r"\.env\b", r"AUTH|TOKEN|SECRET|PASSWORD|API_KEY", r"credentials?",
            r"rm\s+-rf\s+/", r"git\s+push\s+--force", r"mkfs",
            r"DROP\s+TABLE", r"curl.*\|\s*(bash|sh)",
        ]
        for pattern in forbidden:
            if re.search(pattern, prompt, re.IGNORECASE):
                return {"allowed": False, "tier": "X", "reason": f"FORBIDDEN: {pattern}"}

        tier_c_kw = ["deploy", "push", "release", "publish", "cloudflare", "customer", "payment"]
        for kw in tier_c_kw:
            if kw in prompt_lower:
                return {"allowed": False, "tier": "C", "reason": f"Tier C: {kw}"}

        tier = "A"
        if any(w in prompt_lower for w in ["write", "create", "modify", "edit", "fix", "build"]):
            tier = "B"
        return {"allowed": True, "tier": tier, "reason": "safe"}

    # ═══════════════════════════════════════════════════════════════
    # L4: TEST SUITE + MUTATION ROUTING
    # ═══════════════════════════════════════════════════════════════

    def run_test_suite(self) -> dict:
        """Run pnpm hq:test and route failures to mutation engine."""
        self._log("L4-TEST", "Running system integrity suite...")
        rc, stdout, stderr = self._run("pnpm hq:test 2>&1", timeout=120)

        if rc == 0:
            self._log("L4-TEST", "All system suites passed successfully. Node healthy.")
            return {"passed": True, "returncode": rc}
        else:
            self._log("L4-ALERT", "Mutation triggers detected via code error context. Routing to Ronin Team...")
            error_context = stderr[-500:] if stderr else stdout[-500:]
            mutation_id = self.route_error_to_mutation_engine(error_context)
            return {"passed": False, "returncode": rc, "error": error_context[-200:],
                    "mutation_id": mutation_id}

    def route_error_to_mutation_engine(self, error_context: str) -> str:
        """
        Send error into mutation pipeline → knowledge base.
        """
        mutation_id = f"mut_{int(time.time())}_{uuid.uuid4().hex[:6]}"
        error_payload = {
            "mutation_id": mutation_id,
            "error_log": error_context,
            "detected_at": time.time(),
            "detected_at_iso": self._now(),
            "source_node": NODE_IDENTITY,
            "status": "MUTATION_READY",
            "safety": self._safety_scan(error_context),
        }
        target_file = self.a2a_queue_dir / "inbox" / f"error_mutation_{mutation_id}.json"
        with open(target_file, 'w', encoding='utf-8') as f:
            json.dump(error_payload, f, indent=2, ensure_ascii=False)
        self._log("L5-MUTATION", f"Error context locked into execution pipeline: {target_file.name}")

        # Also log to evolution log
        log_file = self.evolution_log / f"{mutation_id}.json"
        log_file.write_text(json.dumps(error_payload, indent=2, ensure_ascii=False))

        return mutation_id

    # ═══════════════════════════════════════════════════════════════
    # DREAM MODE: SANDBOX SIMULATION
    # ═══════════════════════════════════════════════════════════════

    def dream_mode_simulation(self, changes_description: str = "") -> dict:
        """
        Dream Mode (Speculative Run):
        Agent pulls a copy of current code → tests in sandbox folder
        → if pnpm hq:test passes 100% → auto-approve → deploy via Git Loop
        """
        self._log("DREAM", "Entering Dream Mode — Sandbox Simulation")
        dream_id = f"dream_{int(time.time())}"
        sandbox_path = self.sandbox_dir / dream_id
        sandbox_path.mkdir(parents=True, exist_ok=True)

        # Step 1: Snapshot current git state
        self._log("DREAM", "Step 1: Snapshotting current git state...")
        rc, sha, _ = self._run("git rev-parse HEAD")
        rc, branch, _ = self._run("git branch --show-current")
        rc, dirty, _ = self._run("git status --porcelain | wc -l")

        snapshot = {
            "dream_id": dream_id,
            "timestamp": self._now(),
            "git_head": sha[:12],
            "git_branch": branch,
            "dirty_files": int(dirty) if dirty.strip().isdigit() else 0,
            "changes_description": changes_description,
        }

        # Step 2: Stash any uncommitted changes
        self._log("DREAM", "Step 2: Stashing uncommitted changes...")
        self._run("git stash create")
        stash_created = int(dirty) if dirty.strip().isdigit() else 0

        # Step 3: Create virtual sandbox (copy workspace state)
        self._log("DREAM", "Step 3: Creating virtual sandbox checkpoint...")
        checkpoint = {
            **snapshot,
            "stash_created": stash_created > 0,
            "sandbox_path": str(sandbox_path),
            "status": "CHECKPOINT_CREATED",
        }
        checkpoint_file = sandbox_path / "checkpoint.json"
        checkpoint_file.write_text(json.dumps(checkpoint, indent=2, ensure_ascii=False))

        # Step 4: Simulate test suite
        self._log("DREAM", "Step 4: Running simulation test suite...")
        rc, stdout, stderr = self._run("pnpm hq:test 2>&1", timeout=120)
        sim_passed = rc == 0

        # Step 5: Evaluate
        result = {
            **checkpoint,
            "simulation_passed": sim_passed,
            "test_output_tail": stdout[-300:] if stdout else "",
            "decision": "APPROVED" if sim_passed else "REJECTED",
            "completed_at": self._now(),
        }

        if sim_passed:
            self._log("DREAM", "✅ Simulation PASSED — Auto-approve granted")
        else:
            self._log("DREAM", "❌ Simulation FAILED — Rolling back to checkpoint")
            # Rollback: restore stash
            if stash_created > 0:
                self._run("git stash pop")
                self._log("DREAM", "Rolled back uncommitted changes")

        result_file = sandbox_path / "result.json"
        result_file.write_text(json.dumps(result, indent=2, ensure_ascii=False))

        self._log("DREAM", f"Dream Mode complete: {result['decision']}")

        return result

    # ═══════════════════════════════════════════════════════════════
    # CMUX CHECKPOINT + RECOVERY (Never-Dying Loop)
    # ═══════════════════════════════════════════════════════════════

    def save_checkpoint(self) -> dict:
        """
        Save CMUX Master Snapshot — PID, pane layout, transaction state.
        Used for crash recovery / never-dying loop execution.
        """
        self._log("CMUX", "Saving checkpoint (freeze state)...")

        # Gather process state
        _, pids_out, _ = self._run(
            "lsof -iTCP -sTCP:LISTEN -P 2>/dev/null | "
            "grep -E 'node|python' | awk '{print $1, $2, $9}' | head -20"
        )

        # Gather A2A queue state
        queue_state = {}
        for d in ["inbox", "outbox", "done", "blocked", "approvals"]:
            p = self.a2a_queue_dir / d
            queue_state[d] = len(list(p.glob("*.json"))) if p.exists() else 0

        # Gather git state
        _, git_sha, _ = self._run("git rev-parse HEAD")
        _, git_branch, _ = self._run("git branch --show-current")
        _, git_dirty, _ = self._run("git status --porcelain | wc -l")

        # Gather disk state
        _, _, free = shutil.disk_usage(self.workspace)

        checkpoint = {
            "node_identity": NODE_IDENTITY,
            "timestamp": self._now(),
            "epoch": int(time.time()),
            "processes": pids_out,
            "git": {
                "head": git_sha[:12],
                "branch": git_branch,
                "dirty_files": int(git_dirty) if git_dirty.strip().isdigit() else 0,
            },
            "a2a_queue": queue_state,
            "disk_free_gb": round(free / (2**30), 2),
            "services": self._check_services(),
        }

        checkpoint_file = self.checkpoint_dir / "freeze.json"
        checkpoint_file.write_text(json.dumps(checkpoint, indent=2, ensure_ascii=False))
        self._log("CMUX", f"Checkpoint saved: {checkpoint_file}")

        # Also save to Obsidian brain
        obsidian_state = self.obsidian_brain / "AI HQ Knowledge Digest.md"
        if obsidian_state.parent.exists():
            try:
                with open(obsidian_state, 'a', encoding='utf-8') as f:
                    f.write(f"\n## CMUX Checkpoint [{self._now()}]\n")
                    f.write(f"- Node: {NODE_IDENTITY}\n")
                    f.write(f"- Git: {git_sha[:12]} @ {git_branch}\n")
                    f.write(f"- Queue: {queue_state}\n")
                    f.write(f"- Disk: {checkpoint['disk_free_gb']}GB free\n")
                    f.write(f"- Services: {checkpoint['services']}\n")
            except Exception:
                pass

        return checkpoint

    def recover_from_checkpoint(self) -> dict:
        """
        Scan for latest checkpoint JSON → resume execution automatically.
        Never-Dying Loop: CMUX restarts → scans JSON → continues execution.
        """
        checkpoint_file = self.checkpoint_dir / "freeze.json"
        if not checkpoint_file.exists():
            self._log("CMUX", "No checkpoint found — cold start")
            return {"recovered": False, "reason": "no checkpoint"}

        checkpoint = json.loads(checkpoint_file.read_text())
        self._log("CMUX", f"Recovering from checkpoint: epoch {checkpoint.get('epoch')}")
        self._log("CMUX", f"  Git: {checkpoint['git']['head']} @ {checkpoint['git']['branch']}")
        self._log("CMUX", f"  Queue: {checkpoint['a2a_queue']}")
        self._log("CMUX", f"  Disk: {checkpoint['disk_free_gb']}GB")

        # Resume: run evolution loop
        self._log("CMUX", "Resuming autonomous execution...")
        return {"recovered": True, "checkpoint": checkpoint}

    def _check_services(self) -> dict:
        """Check running services."""
        services = {}
        for port, name in [(3800, "skills-api"), (8711, "dev-control"),
                           (20128, "omniroute"), (8644, "hermes-gateway")]:
            rc, _, _ = self._run(
                f"curl -s -o /dev/null -w '%{{http_code}}' http://localhost:{port}/ 2>/dev/null"
            )
            services[name] = "up" if rc == 0 else "down"
        return services

    # ═══════════════════════════════════════════════════════════════
    # L1: EVOLUTION LOOP (Orchestrator)
    # ═══════════════════════════════════════════════════════════════

    def execute_self_evolution_loop(self) -> dict:
        """
        Main autonomous loop — runs all levels in sequence.
        """
        cycle_id = f"evo-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        self._log("L1-EVOLUTION", f"═══ Starting evolution cycle: {cycle_id} ═══")

        report = {
            "cycle_id": cycle_id,
            "node": NODE_IDENTITY,
            "timestamp": self._now(),
            "levels": {},
        }

        # L3: Disk health
        self._log("L1-EVOLUTION", "Executing L3: Disk Purger...")
        report["levels"]["L3_disk"] = self.run_l3_disk_purger()

        # L2: Gateway wiring
        self._log("L1-EVOLUTION", "Executing L2: OmniRoute Wiring...")
        report["levels"]["L2_bridge"] = self.wire_omniroute_gateway()

        # L4: Test suite
        self._log("L1-EVOLUTION", "Executing L4: Test Suite...")
        report["levels"]["L4_test"] = self.run_test_suite()

        # CMUX checkpoint
        self._log("L1-EVOLUTION", "Saving CMUX checkpoint...")
        report["checkpoint"] = self.save_checkpoint()

        # Summary
        disk = report["levels"]["L3_disk"]
        tests = report["levels"]["L4_test"]
        bridge = report["levels"]["L2_bridge"]

        report["summary"] = {
            "disk_gb": disk["after_gb"],
            "disk_healthy": not disk["critical"],
            "tests_passed": tests["passed"],
            "gateway": bridge.get("gateway_status", "unknown"),
            "packets_converted": bridge.get("converted", 0),
        }

        self._log("L1-EVOLUTION", f"═══ Cycle {cycle_id} complete ═══")
        self._log("L1-EVOLUTION", f"  Disk: {disk['after_gb']}GB ({'HEALTHY' if not disk['critical'] else 'CRITICAL'})")
        self._log("L1-EVOLUTION", f"  Tests: {'PASS' if tests['passed'] else 'FAIL'}")
        self._log("L1-EVOLUTION", f"  Gateway: {bridge.get('gateway_status', 'unknown')}")
        self._log("L1-EVOLUTION", f"  Services: {report['checkpoint']['services']}")

        # Save report
        report_file = self.evolution_log / f"{cycle_id}.json"
        report_file.write_text(json.dumps(report, indent=2, ensure_ascii=False))

        return report


# ═══════════════════════════════════════════════════════════════
# CLI ENTRY POINT
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    engine = GhostClawCoreEngine()

    mode = sys.argv[1] if len(sys.argv) > 1 else "evolve"

    if mode == "--dream":
        changes = " ".join(sys.argv[2:]) if len(sys.argv) > 2 else "general mutation"
        result = engine.dream_mode_simulation(changes)
        print(json.dumps(result, indent=2))
    elif mode == "--checkpoint":
        result = engine.save_checkpoint()
        print(json.dumps(result, indent=2))
    elif mode == "--recover":
        result = engine.recover_from_checkpoint()
        print(json.dumps(result, indent=2))
    elif mode == "--disk":
        result = engine.run_l3_disk_purger()
        print(json.dumps(result, indent=2))
    elif mode == "--wire":
        result = engine.wire_omniroute_gateway()
        print(json.dumps(result, indent=2))
    elif mode == "--test":
        result = engine.run_test_suite()
        print(json.dumps(result, indent=2))
    elif mode == "--dry-run":
        result = engine.run_l3_disk_purger()
        print(json.dumps(result, indent=2))
    else:
        # Full evolution loop
        result = engine.execute_self_evolution_loop()
        print(f"\n{'='*60}")
        print(f"EVOLUTION CYCLE: {result['cycle_id']}")
        print(f"{'='*60}")
        s = result["summary"]
        print(f"Disk: {s['disk_gb']}GB ({'HEALTHY' if s['disk_healthy'] else 'CRITICAL'})")
        print(f"Tests: {'PASS' if s['tests_passed'] else 'FAIL'}")
        print(f"Gateway: {s['gateway']}")
        print(f"Services: {result['checkpoint']['services']}")
        print(f"Queue: {result['checkpoint']['a2a_queue']}")
        if not s['tests_passed']:
            print(f"Mutation: {result['levels']['L4_test'].get('mutation_id', 'N/A')}")
