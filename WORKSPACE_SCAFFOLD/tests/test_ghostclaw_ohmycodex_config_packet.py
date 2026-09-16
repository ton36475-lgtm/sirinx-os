import json
import os
import subprocess
import tempfile
import unittest
from importlib.machinery import SourceFileLoader
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "ghostclaw_ohmycodex_config_packet.py"
ACTIVATE_WRAPPER = ROOT / "scripts" / "ohmycodex-activate-and-verify-project-canonical"
MODULE = SourceFileLoader("ghostclaw_ohmycodex_config_packet", str(SCRIPT)).load_module()


def valid_packet():
    return {
        "schema": "ghostclaw.ohmycodex.config_packet.v1",
        "status": "ready_for_review_no_execution",
        "gate": "OHMYCODEX_CONFIG_PACKET_ONLY",
        "candidate_destination_paths": {
            "project_canonical": ".opencode/oh-my-openagent.jsonc"
        },
        "destination_selected": None,
        "safety_constraints": {
            "write_live_config": False,
            "provider_model_call": False,
            "api_key_read": False,
            "env_read": False,
            "secret_access": False,
            "plugin_install": False,
            "postinstall_execution": False,
            "dependency_install": False,
            "push": False,
            "deploy": False,
            "production_action": False,
        },
        "config_draft": {
            "default_run_agent": "codex-build-captain",
            "agent_order": [
                "hermes-commander",
                "opus-critic",
                "codex-build-captain",
                "glm52-worker",
                "deepseek-worker",
                "kimi-worker",
            ],
            "model_fallback": True,
            "mcp_env_allowlist": [],
            "disabled_commands": [
                "init-deep",
                "ralph-loop",
                "ulw-loop",
                "cancel-ralph",
                "refactor",
                "start-work",
                "stop-continuation",
                "remove-ai-slops",
                "hyperplan",
            ],
            "agents": {
                "build": {
                    "model": "codex-local",
                    "fallback_models": ["kimi-k2.7-code", "glm-5.2", "deepseek-v4-pro"],
                },
                "oracle": {
                    "model": "gpt-5.5",
                    "fallback_models": ["glm-5.2"],
                }
            },
        },
    }


def valid_alias_manifest():
    return {
        "schema": "ghostclaw.model_router.ohmycodex_aliases.v1",
        "agents": {
            "glm52_worker": {"aliases": ["glm-5.2"], "canonical_model": "glm_5_2_max"},
            "deepseek_worker": {"aliases": ["deepseek-v4-pro"], "canonical_model": "deepseek_v4_pro"},
            "kimi_worker": {"aliases": ["kimi-k2.7-code"], "canonical_model": "kimi_k2_7_code"},
            "gpt_final_gate": {"aliases": ["gpt-5.5"], "canonical_model": "gpt_5_5"},
            "codex_build_captain": {"aliases": ["codex-local"]},
        },
    }


class OhMyCodexConfigPacketTest(unittest.TestCase):
    def test_valid_packet_builds_non_writing_preview(self):
        preview = MODULE.build_preview(valid_packet())

        self.assertTrue(preview["ok"])
        self.assertFalse(preview["write_live_config"])
        self.assertFalse(preview["provider_model_call"])
        self.assertFalse(preview["secret_access"])
        self.assertEqual(preview["config_draft"]["agents"]["build"]["model"], "codex-local")

    def test_secret_allowlist_is_rejected(self):
        packet = valid_packet()
        packet["config_draft"]["mcp_env_allowlist"] = ["OPENAI_API_KEY"]

        errors = MODULE.validate_packet(packet)

        self.assertIn("config_draft.mcp_env_allowlist must remain empty", errors)

    def test_cli_preview_outputs_json(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            packet_path = Path(temp_dir) / "packet.json"
            packet_path.write_text(json.dumps(valid_packet()), encoding="utf-8")

            result = subprocess.run(
                ["python3", str(SCRIPT), "--packet", str(packet_path), "--preview"],
                check=True,
                text=True,
                capture_output=True,
            )

            payload = json.loads(result.stdout)
            self.assertTrue(payload["ok"])
            self.assertEqual(payload["gate"], "OHMYCODEX_CONFIG_PACKET_ONLY")

    def test_apply_plan_resolves_project_destination_without_writing(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            packet = valid_packet()

            plan = MODULE.build_apply_plan(
                packet,
                "project_canonical",
                root,
                root / ".ghostclaw_runtime" / "a2a2a" / "rollback" / "ohmycodex",
            )

            self.assertTrue(plan["ok"])
            self.assertEqual(plan["approval_env"], "APPROVE_OHMYCODEX_CONFIG_WRITE_PROJECT_CANONICAL")
            self.assertEqual(plan["target_path"], str(root / ".opencode" / "oh-my-openagent.jsonc"))
            self.assertFalse((root / ".opencode" / "oh-my-openagent.jsonc").exists())
            self.assertFalse(plan["write_live_config"])

    def test_write_mode_requires_exact_approval_env(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            packet_path = root / "packet.json"
            packet_path.write_text(json.dumps(valid_packet()), encoding="utf-8")

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--packet",
                    str(packet_path),
                    "--root",
                    str(root),
                    "--destination-label",
                    "project_canonical",
                    "--write",
                ],
                text=True,
                capture_output=True,
            )

            self.assertNotEqual(result.returncode, 0)
            self.assertIn("write blocked", result.stderr)
            self.assertFalse((root / ".opencode" / "oh-my-openagent.jsonc").exists())

    def test_write_mode_with_exact_env_writes_only_temp_config(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            packet_path = root / "packet.json"
            packet_path.write_text(json.dumps(valid_packet()), encoding="utf-8")
            env = os.environ.copy()
            env["APPROVE_OHMYCODEX_CONFIG_WRITE_PROJECT_CANONICAL"] = "1"

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--packet",
                    str(packet_path),
                    "--root",
                    str(root),
                    "--destination-label",
                    "project_canonical",
                    "--write",
                ],
                check=True,
                text=True,
                capture_output=True,
                env=env,
            )

            payload = json.loads(result.stdout)
            target = root / ".opencode" / "oh-my-openagent.jsonc"
            self.assertTrue(payload["ok"])
            self.assertEqual(Path(payload["target_path"]), target.resolve())
            self.assertTrue(target.exists())
            written = json.loads(target.read_text(encoding="utf-8"))
            self.assertEqual(written["default_run_agent"], "codex-build-captain")
            self.assertEqual(written["agents"]["build"]["model"], "codex-local")

    def test_dispatch_review_writes_probe_only_target_inboxes(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            packet_path = root / "packet.json"
            packet_path.write_text(json.dumps(valid_packet()), encoding="utf-8")
            apply_plan = MODULE.build_apply_plan(
                valid_packet(),
                "project_canonical",
                root,
                root / ".ghostclaw_runtime" / "a2a2a" / "rollback" / "ohmycodex",
            )

            result = MODULE.dispatch_review_tasks(
                valid_packet(),
                packet_path,
                apply_plan,
                None,
                root,
                ["hermes", "codex"],
                "2026-06-30T10:50:00Z",
            )

            self.assertTrue(result["ok"])
            self.assertFalse(result["write_live_config"])
            self.assertFalse(result["provider_model_call"])
            self.assertFalse(result["secret_access"])
            self.assertEqual([packet["target"] for packet in result["packets"]], ["hermes", "codex"])
            for packet in result["packets"]:
                task_path = Path(packet["path"])
                self.assertTrue(task_path.exists())
                task = json.loads(task_path.read_text(encoding="utf-8"))
                self.assertEqual(task["schema"], "ghostclaw.a2a2a.task.v1")
                self.assertTrue(task["requires_ack"])
                self.assertFalse(task["dangerous_actions_allowed"])
                self.assertFalse(task["secret_access_allowed"])
                self.assertFalse(task["paid_model_calls_allowed"])
                self.assertIn("write_live_config", task["payload"]["blocked_actions"])

    def test_cli_dispatch_review_outputs_written_task_paths(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            packet_path = root / "packet.json"
            packet_path.write_text(json.dumps(valid_packet()), encoding="utf-8")

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--packet",
                    str(packet_path),
                    "--root",
                    str(root),
                    "--destination-label",
                    "project_canonical",
                    "--dispatch-review",
                    "--targets",
                    "opencode",
                ],
                check=True,
                text=True,
                capture_output=True,
            )

            payload = json.loads(result.stdout)
            self.assertTrue(payload["ok"])
            self.assertEqual(payload["packets"][0]["target"], "opencode")
            self.assertTrue(Path(payload["packets"][0]["path"]).exists())

    def test_readiness_report_requires_aliases_models_and_receipts(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            packet_path = root / "packet.json"
            packet_path.write_text(json.dumps(valid_packet()), encoding="utf-8")
            apply_plan = MODULE.build_apply_plan(
                valid_packet(),
                "project_canonical",
                root,
                root / ".ghostclaw_runtime" / "a2a2a" / "rollback" / "ohmycodex",
            )
            MODULE.dispatch_review_tasks(
                valid_packet(),
                packet_path,
                apply_plan,
                None,
                root,
                ["hermes"],
                "2026-06-30T10:50:00Z",
            )
            receipt_path = (
                root
                / ".ghostclaw_runtime"
                / "a2a2a"
                / "receipts"
                / "ack_hermes_ohmycodex_config_review_hermes_20260630T105000Z.json"
            )
            receipt_path.parent.mkdir(parents=True, exist_ok=True)
            receipt_path.write_text(
                json.dumps(
                    {
                        "schema": "ghostclaw.a2a2a.ack_receipt.v1",
                        "status": "acknowledged_probe_only",
                        "execution": {
                            "payload_executed": False,
                            "paid_model_calls": False,
                            "secret_access": False,
                            "deploy": False,
                            "git_push": False,
                        },
                    }
                ),
                encoding="utf-8",
            )

            report = MODULE.build_readiness_report(
                valid_packet(),
                packet_path,
                valid_alias_manifest(),
                root / "aliases.json",
                apply_plan,
                root / "apply-plan.json",
                root,
                ["hermes"],
            )

            self.assertEqual(report["status"], "ready_for_review_no_execution")
            self.assertTrue(report["checks"]["required_aliases_present"])
            self.assertTrue(report["checks"]["required_config_models_present"])
            self.assertTrue(report["checks"]["a2a_review_receipts_ok"])
            self.assertFalse(report["write_live_config"])
            self.assertFalse(report["provider_model_call"])
            self.assertFalse(report["secret_access"])

    def test_readiness_report_blocks_missing_required_alias(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            packet_path = root / "packet.json"
            packet_path.write_text(json.dumps(valid_packet()), encoding="utf-8")
            aliases = valid_alias_manifest()
            aliases["agents"]["glm52_worker"]["aliases"] = []
            apply_plan = MODULE.build_apply_plan(
                valid_packet(),
                "project_canonical",
                root,
                root / ".ghostclaw_runtime" / "a2a2a" / "rollback" / "ohmycodex",
            )

            report = MODULE.build_readiness_report(
                valid_packet(),
                packet_path,
                aliases,
                root / "aliases.json",
                apply_plan,
                root / "apply-plan.json",
                root,
                ["hermes"],
            )

            self.assertEqual(report["status"], "not_ready")
            self.assertIn("glm-5.2", report["blockers"][0])

    def test_cli_readiness_report_can_store_json(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            packet_path = root / "packet.json"
            aliases_path = root / "aliases.json"
            plan_path = root / "apply-plan.json"
            out_path = root / "readiness.json"
            packet_path.write_text(json.dumps(valid_packet()), encoding="utf-8")
            aliases_path.write_text(json.dumps(valid_alias_manifest()), encoding="utf-8")
            plan_path.write_text(
                json.dumps(
                    MODULE.build_apply_plan(
                        valid_packet(),
                        "project_canonical",
                        root,
                        root / ".ghostclaw_runtime" / "a2a2a" / "rollback" / "ohmycodex",
                    )
                ),
                encoding="utf-8",
            )
            receipt_path = (
                root
                / ".ghostclaw_runtime"
                / "a2a2a"
                / "receipts"
                / "ack_hermes_ohmycodex_config_review_hermes_20260630T105000Z.json"
            )
            receipt_path.parent.mkdir(parents=True, exist_ok=True)
            receipt_path.write_text(
                json.dumps(
                    {
                        "schema": "ghostclaw.a2a2a.ack_receipt.v1",
                        "status": "acknowledged_probe_only",
                        "execution": {
                            "payload_executed": False,
                            "paid_model_calls": False,
                            "secret_access": False,
                            "deploy": False,
                            "git_push": False,
                        },
                    }
                ),
                encoding="utf-8",
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--packet",
                    str(packet_path),
                    "--root",
                    str(root),
                    "--alias-manifest",
                    str(aliases_path),
                    "--apply-plan-path",
                    str(plan_path),
                    "--readiness-report",
                    "--targets",
                    "hermes",
                    "--store-readiness-report",
                    str(out_path),
                ],
                check=True,
                text=True,
                capture_output=True,
            )

            payload = json.loads(result.stdout)
            stored = json.loads(out_path.read_text(encoding="utf-8"))
            self.assertEqual(payload["status"], "ready_for_review_no_execution")
            self.assertEqual(stored["status"], "ready_for_review_no_execution")

    def test_live_config_smoke_blocks_missing_file(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)

            report = MODULE.build_live_config_smoke_report(
                valid_packet(),
                "project_canonical",
                root,
                MODULE.build_apply_plan(
                    valid_packet(),
                    "project_canonical",
                    root,
                    root / ".ghostclaw_runtime" / "a2a2a" / "rollback" / "ohmycodex",
                ),
            )

            self.assertEqual(report["status"], "not_ready")
            self.assertFalse(report["checks"]["target_exists"])
            self.assertIn("live config does not exist", report["blockers"][0])
            self.assertFalse(report["provider_model_call"])
            self.assertFalse(report["secret_access"])

    def test_live_config_smoke_passes_exact_packet_config_without_provider_call(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            packet = valid_packet()
            target = root / ".opencode" / "oh-my-openagent.jsonc"
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(MODULE.stable_json_bytes(packet["config_draft"]))

            report = MODULE.build_live_config_smoke_report(
                packet,
                "project_canonical",
                root,
                MODULE.build_apply_plan(
                    packet,
                    "project_canonical",
                    root,
                    root / ".ghostclaw_runtime" / "a2a2a" / "rollback" / "ohmycodex",
                ),
            )

            self.assertEqual(report["status"], "smoke_passed_no_provider_call")
            self.assertTrue(report["checks"]["target_exists"])
            self.assertTrue(report["checks"]["live_config_matches_packet"])
            self.assertTrue(report["checks"]["required_models_present"])
            self.assertTrue(report["checks"]["risky_commands_disabled"])
            self.assertFalse(report["write_live_config"])
            self.assertFalse(report["provider_model_call"])
            self.assertFalse(report["secret_access"])

    def test_cli_smoke_live_config_can_store_report(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            packet = valid_packet()
            packet_path = root / "packet.json"
            plan_path = root / "apply-plan.json"
            out_path = root / "smoke.json"
            target = root / ".opencode" / "oh-my-openagent.jsonc"
            packet_path.write_text(json.dumps(packet), encoding="utf-8")
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(MODULE.stable_json_bytes(packet["config_draft"]))
            plan_path.write_text(
                json.dumps(
                    MODULE.build_apply_plan(
                        packet,
                        "project_canonical",
                        root,
                        root / ".ghostclaw_runtime" / "a2a2a" / "rollback" / "ohmycodex",
                    )
                ),
                encoding="utf-8",
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--packet",
                    str(packet_path),
                    "--root",
                    str(root),
                    "--destination-label",
                    "project_canonical",
                    "--apply-plan-path",
                    str(plan_path),
                    "--smoke-live-config",
                    "--store-smoke-report",
                    str(out_path),
                ],
                check=True,
                text=True,
                capture_output=True,
            )

            payload = json.loads(result.stdout)
            stored = json.loads(out_path.read_text(encoding="utf-8"))
            self.assertEqual(payload["status"], "smoke_passed_no_provider_call")
            self.assertEqual(stored["status"], "smoke_passed_no_provider_call")

    def test_activation_status_is_non_writing_and_reports_gate(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            packet = valid_packet()
            plan = MODULE.build_apply_plan(
                packet,
                "project_canonical",
                root,
                root / ".ghostclaw_runtime" / "a2a2a" / "rollback" / "ohmycodex",
            )

            status = MODULE.build_activation_status(packet, "project_canonical", root, plan)

            self.assertEqual(status["status"], "ready_for_activation_gate")
            self.assertEqual(status["approval_env"], "APPROVE_OHMYCODEX_CONFIG_WRITE_PROJECT_CANONICAL")
            self.assertFalse(status["approval_env_set"])
            self.assertFalse(status["target_exists"])
            self.assertFalse(status["write_live_config"])
            self.assertFalse((root / ".opencode" / "oh-my-openagent.jsonc").exists())

    def test_cli_activate_requires_exact_gate_and_writes_nothing_without_it(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            packet_path = root / "packet.json"
            out_path = root / "activation.json"
            packet_path.write_text(json.dumps(valid_packet()), encoding="utf-8")

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--packet",
                    str(packet_path),
                    "--root",
                    str(root),
                    "--destination-label",
                    "project_canonical",
                    "--activate",
                    "--store-activation-result",
                    str(out_path),
                ],
                text=True,
                capture_output=True,
            )

            self.assertNotEqual(result.returncode, 0)
            self.assertIn("write blocked", result.stderr)
            self.assertFalse(out_path.exists())
            self.assertFalse((root / ".opencode" / "oh-my-openagent.jsonc").exists())

    def test_cli_activate_with_exact_gate_writes_and_smokes_temp_config(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            packet_path = root / "packet.json"
            out_path = root / "activation.json"
            packet_path.write_text(json.dumps(valid_packet()), encoding="utf-8")
            env = os.environ.copy()
            env["APPROVE_OHMYCODEX_CONFIG_WRITE_PROJECT_CANONICAL"] = "1"

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--packet",
                    str(packet_path),
                    "--root",
                    str(root),
                    "--destination-label",
                    "project_canonical",
                    "--activate",
                    "--store-activation-result",
                    str(out_path),
                ],
                check=True,
                text=True,
                capture_output=True,
                env=env,
            )

            payload = json.loads(result.stdout)
            stored = json.loads(out_path.read_text(encoding="utf-8"))
            target = root / ".opencode" / "oh-my-openagent.jsonc"
            self.assertEqual(payload["status"], "activated_smoke_passed_no_provider_call")
            self.assertEqual(stored["status"], "activated_smoke_passed_no_provider_call")
            self.assertTrue(target.exists())
            self.assertEqual(payload["smoke"]["status"], "smoke_passed_no_provider_call")
            self.assertFalse(payload["provider_model_call"])
            self.assertFalse(payload["secret_access"])
            self.assertFalse(payload["push"])
            self.assertFalse(payload["deploy"])

    def test_activation_dry_run_writes_only_sandbox_and_smokes(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            sandbox = root / "sandbox"

            result = MODULE.activation_dry_run(valid_packet(), "project_canonical", root, sandbox)

            self.assertEqual(result["status"], "dry_run_smoke_passed_no_provider_call")
            self.assertTrue((sandbox / ".opencode" / "oh-my-openagent.jsonc").exists())
            self.assertFalse((root / ".opencode" / "oh-my-openagent.jsonc").exists())
            self.assertTrue(result["sandbox_write_only"])
            self.assertFalse(result["write_live_config"])
            self.assertFalse(result["provider_model_call"])
            self.assertFalse(result["secret_access"])
            self.assertEqual(result["smoke"]["status"], "smoke_passed_no_provider_call")

    def test_read_only_load_check_passes_explicit_sandbox_config_without_runtime_start(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            packet = valid_packet()
            sandbox_config = root / "sandbox" / ".opencode" / "oh-my-openagent.jsonc"
            sandbox_config.parent.mkdir(parents=True, exist_ok=True)
            sandbox_config.write_bytes(MODULE.stable_json_bytes(packet["config_draft"]))
            apply_plan = MODULE.build_apply_plan(
                packet,
                "project_canonical",
                root,
                root / ".ghostclaw_runtime" / "a2a2a" / "rollback" / "ohmycodex",
            )

            report = MODULE.build_read_only_load_check(
                packet,
                "project_canonical",
                root,
                sandbox_config,
                apply_plan,
            )

            self.assertEqual(report["status"], "load_check_passed_no_runtime_start")
            self.assertTrue(report["checks"]["target_exists"])
            self.assertTrue(report["checks"]["config_matches_packet"])
            self.assertTrue(report["checks"]["required_models_present"])
            self.assertTrue(report["checks"]["risky_commands_disabled"])
            self.assertFalse(report["opencode_started"])
            self.assertFalse(report["provider_model_call"])
            self.assertFalse(report["secret_access"])

    def test_read_only_load_check_blocks_missing_config_without_runtime_start(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)

            report = MODULE.build_read_only_load_check(
                valid_packet(),
                "project_canonical",
                root,
            )

            self.assertEqual(report["status"], "not_ready")
            self.assertFalse(report["checks"]["target_exists"])
            self.assertIn("config file does not exist", report["blockers"][0])
            self.assertFalse(report["opencode_started"])
            self.assertFalse(report["provider_model_call"])
            self.assertFalse(report["secret_access"])

    def test_cli_read_only_load_check_can_store_result(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            packet = valid_packet()
            packet_path = root / "packet.json"
            plan_path = root / "apply-plan.json"
            config_path = root / "sandbox" / ".opencode" / "oh-my-openagent.jsonc"
            out_path = root / "load-check.json"
            packet_path.write_text(json.dumps(packet), encoding="utf-8")
            config_path.parent.mkdir(parents=True, exist_ok=True)
            config_path.write_bytes(MODULE.stable_json_bytes(packet["config_draft"]))
            plan_path.write_text(
                json.dumps(
                    MODULE.build_apply_plan(
                        packet,
                        "project_canonical",
                        root,
                        root / ".ghostclaw_runtime" / "a2a2a" / "rollback" / "ohmycodex",
                    )
                ),
                encoding="utf-8",
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--packet",
                    str(packet_path),
                    "--root",
                    str(root),
                    "--destination-label",
                    "project_canonical",
                    "--apply-plan-path",
                    str(plan_path),
                    "--read-only-load-check",
                    "--config-path",
                    str(config_path),
                    "--store-load-check-result",
                    str(out_path),
                ],
                check=True,
                text=True,
                capture_output=True,
            )

            payload = json.loads(result.stdout)
            stored = json.loads(out_path.read_text(encoding="utf-8"))
            self.assertEqual(payload["status"], "load_check_passed_no_runtime_start")
            self.assertEqual(stored["status"], "load_check_passed_no_runtime_start")
            self.assertFalse(stored["opencode_started"])
            self.assertFalse(stored["provider_model_call"])
            self.assertFalse(stored["secret_access"])

    def test_cli_activation_dry_run_can_store_result(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            packet_path = root / "packet.json"
            sandbox = root / "sandbox"
            out_path = root / "dry-run.json"
            packet_path.write_text(json.dumps(valid_packet()), encoding="utf-8")

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--packet",
                    str(packet_path),
                    "--root",
                    str(root),
                    "--destination-label",
                    "project_canonical",
                    "--activation-dry-run",
                    "--sandbox-root",
                    str(sandbox),
                    "--store-activation-result",
                    str(out_path),
                ],
                check=True,
                text=True,
                capture_output=True,
            )

            payload = json.loads(result.stdout)
            stored = json.loads(out_path.read_text(encoding="utf-8"))
            self.assertEqual(payload["status"], "dry_run_smoke_passed_no_provider_call")
            self.assertEqual(stored["status"], "dry_run_smoke_passed_no_provider_call")
            self.assertTrue((sandbox / ".opencode" / "oh-my-openagent.jsonc").exists())
            self.assertFalse((root / ".opencode" / "oh-my-openagent.jsonc").exists())

    def test_activation_handoff_is_non_writing_and_contains_exact_gate(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            packet = valid_packet()
            packet_path = root / "packet.json"
            plan_path = root / "apply-plan.json"
            packet_path.write_text(json.dumps(packet), encoding="utf-8")
            plan = MODULE.build_apply_plan(
                packet,
                "project_canonical",
                root,
                root / ".ghostclaw_runtime" / "a2a2a" / "rollback" / "ohmycodex",
            )
            plan_path.write_text(json.dumps(plan), encoding="utf-8")

            handoff = MODULE.build_activation_handoff(
                packet,
                packet_path,
                "project_canonical",
                root,
                plan,
                plan_path,
            )

            self.assertEqual(handoff["status"], "ready_for_exact_gate")
            self.assertEqual(handoff["approval_env"], "APPROVE_OHMYCODEX_CONFIG_WRITE_PROJECT_CANONICAL")
            self.assertFalse(handoff["approval_env_set"])
            self.assertFalse(handoff["target_exists"])
            self.assertFalse((root / ".opencode" / "oh-my-openagent.jsonc").exists())
            self.assertEqual(handoff["commands"][0]["env"]["APPROVE_OHMYCODEX_CONFIG_WRITE_PROJECT_CANONICAL"], "1")
            self.assertTrue(handoff["commands"][0]["writes_live_config"])
            self.assertFalse(handoff["commands"][0]["provider_model_call"])
            self.assertFalse(handoff["commands"][1]["writes_live_config"])
            self.assertFalse(handoff["commands"][2]["opencode_started"])
            self.assertIn("read_only_load_check", handoff["receipts_expected"])

    def test_cli_activation_handoff_can_store_json_without_writing_config(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            packet = valid_packet()
            packet_path = root / "packet.json"
            plan_path = root / "apply-plan.json"
            out_path = root / "handoff.json"
            packet_path.write_text(json.dumps(packet), encoding="utf-8")
            plan_path.write_text(
                json.dumps(
                    MODULE.build_apply_plan(
                        packet,
                        "project_canonical",
                        root,
                        root / ".ghostclaw_runtime" / "a2a2a" / "rollback" / "ohmycodex",
                    )
                ),
                encoding="utf-8",
            )

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--packet",
                    str(packet_path),
                    "--root",
                    str(root),
                    "--destination-label",
                    "project_canonical",
                    "--apply-plan-path",
                    str(plan_path),
                    "--activation-handoff",
                    "--store-activation-handoff",
                    str(out_path),
                ],
                check=True,
                text=True,
                capture_output=True,
            )

            payload = json.loads(result.stdout)
            stored = json.loads(out_path.read_text(encoding="utf-8"))
            self.assertEqual(payload["status"], "ready_for_exact_gate")
            self.assertEqual(stored["status"], "ready_for_exact_gate")
            self.assertFalse(stored["approval_env_set"])
            self.assertFalse((root / ".opencode" / "oh-my-openagent.jsonc").exists())

    def test_goal_completion_audit_reports_not_complete_before_live_config(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            packet = valid_packet()
            readiness_path = root / "readiness.json"
            handoff_path = root / "handoff.json"
            readiness_path.write_text(
                json.dumps({"schema": "ghostclaw.ohmycodex.readiness_report.v1", "status": "ready_for_review_no_execution"}),
                encoding="utf-8",
            )
            handoff_path.write_text(
                json.dumps({"schema": "ghostclaw.ohmycodex.activation_handoff.v1", "status": "ready_for_exact_gate"}),
                encoding="utf-8",
            )

            audit = MODULE.build_goal_completion_audit(
                packet,
                "project_canonical",
                root,
                readiness_path,
                handoff_path,
            )

            self.assertEqual(audit["status"], "not_complete")
            self.assertIn("live OhMyCodex config has not been written", audit["blockers"])
            self.assertFalse((root / ".opencode" / "oh-my-openagent.jsonc").exists())
            self.assertFalse(audit["provider_model_call"])
            self.assertFalse(audit["secret_access"])

    def test_goal_completion_audit_can_complete_with_live_config_and_receipts(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            packet = valid_packet()
            target = root / ".opencode" / "oh-my-openagent.jsonc"
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(MODULE.stable_json_bytes(packet["config_draft"]))
            readiness_path = root / "readiness.json"
            handoff_path = root / "handoff.json"
            activation_path = root / "activation.json"
            smoke_path = root / "smoke.json"
            load_check_path = root / "load-check.json"
            readiness_path.write_text(json.dumps({"status": "ready_for_review_no_execution"}), encoding="utf-8")
            handoff_path.write_text(json.dumps({"status": "ready_for_exact_gate"}), encoding="utf-8")
            activation_path.write_text(
                json.dumps(
                    {
                        "status": "activated_smoke_passed_no_provider_call",
                        "provider_model_call": False,
                        "secret_access": False,
                        "push": False,
                        "deploy": False,
                    }
                ),
                encoding="utf-8",
            )
            smoke_path.write_text(
                json.dumps(
                    {
                        "status": "smoke_passed_no_provider_call",
                        "provider_model_call": False,
                        "secret_access": False,
                        "push": False,
                        "deploy": False,
                    }
                ),
                encoding="utf-8",
            )
            load_check_path.write_text(
                json.dumps(
                    {
                        "status": "load_check_passed_no_runtime_start",
                        "provider_model_call": False,
                        "secret_access": False,
                        "push": False,
                        "deploy": False,
                    }
                ),
                encoding="utf-8",
            )

            audit = MODULE.build_goal_completion_audit(
                packet,
                "project_canonical",
                root,
                readiness_path,
                handoff_path,
                activation_path,
                smoke_path,
                load_check_path,
            )

            self.assertEqual(audit["status"], "complete")
            self.assertEqual(audit["blockers"], [])
            self.assertIsNone(audit["next_gate"])

    def test_cli_goal_completion_audit_can_store_not_complete_json(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            packet_path = root / "packet.json"
            readiness_path = root / "readiness.json"
            handoff_path = root / "handoff.json"
            out_path = root / "goal-audit.json"
            packet_path.write_text(json.dumps(valid_packet()), encoding="utf-8")
            readiness_path.write_text(json.dumps({"status": "ready_for_review_no_execution"}), encoding="utf-8")
            handoff_path.write_text(json.dumps({"status": "ready_for_exact_gate"}), encoding="utf-8")

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--packet",
                    str(packet_path),
                    "--root",
                    str(root),
                    "--destination-label",
                    "project_canonical",
                    "--goal-completion-audit",
                    "--readiness-path",
                    str(readiness_path),
                    "--handoff-path",
                    str(handoff_path),
                    "--store-goal-audit",
                    str(out_path),
                ],
                text=True,
                capture_output=True,
            )

            self.assertNotEqual(result.returncode, 0)
            payload = json.loads(result.stdout)
            stored = json.loads(out_path.read_text(encoding="utf-8"))
            self.assertEqual(payload["status"], "not_complete")
            self.assertEqual(stored["status"], "not_complete")
            self.assertFalse(stored["write_live_config"])
            self.assertFalse(stored["provider_model_call"])
            self.assertFalse(stored["secret_access"])

    def test_cli_activate_and_verify_requires_exact_gate_and_writes_nothing_without_it(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            packet_path = root / "packet.json"
            readiness_path = root / "readiness.json"
            handoff_path = root / "handoff.json"
            out_path = root / "activate-and-verify.json"
            packet_path.write_text(json.dumps(valid_packet()), encoding="utf-8")
            readiness_path.write_text(json.dumps({"status": "ready_for_review_no_execution"}), encoding="utf-8")
            handoff_path.write_text(json.dumps({"status": "ready_for_exact_gate"}), encoding="utf-8")

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--packet",
                    str(packet_path),
                    "--root",
                    str(root),
                    "--destination-label",
                    "project_canonical",
                    "--activate-and-verify",
                    "--readiness-path",
                    str(readiness_path),
                    "--handoff-path",
                    str(handoff_path),
                    "--store-activate-and-verify-result",
                    str(out_path),
                ],
                text=True,
                capture_output=True,
            )

            self.assertNotEqual(result.returncode, 0)
            self.assertIn("write blocked", result.stderr)
            self.assertFalse(out_path.exists())
            self.assertFalse((root / ".opencode" / "oh-my-openagent.jsonc").exists())

    def test_cli_activate_and_verify_with_exact_gate_writes_and_completes_temp_goal(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            packet_path = root / "packet.json"
            readiness_path = root / "readiness.json"
            handoff_path = root / "handoff.json"
            out_path = root / "activate-and-verify.json"
            receipt_dir = root / "receipts"
            packet_path.write_text(json.dumps(valid_packet()), encoding="utf-8")
            readiness_path.write_text(json.dumps({"status": "ready_for_review_no_execution"}), encoding="utf-8")
            handoff_path.write_text(json.dumps({"status": "ready_for_exact_gate"}), encoding="utf-8")
            env = os.environ.copy()
            env["APPROVE_OHMYCODEX_CONFIG_WRITE_PROJECT_CANONICAL"] = "1"

            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--packet",
                    str(packet_path),
                    "--root",
                    str(root),
                    "--destination-label",
                    "project_canonical",
                    "--activate-and-verify",
                    "--readiness-path",
                    str(readiness_path),
                    "--handoff-path",
                    str(handoff_path),
                    "--verify-receipt-dir",
                    str(receipt_dir),
                    "--store-activate-and-verify-result",
                    str(out_path),
                ],
                check=True,
                text=True,
                capture_output=True,
                env=env,
            )

            payload = json.loads(result.stdout)
            stored = json.loads(out_path.read_text(encoding="utf-8"))
            self.assertEqual(payload["status"], "complete")
            self.assertEqual(stored["status"], "complete")
            self.assertEqual(stored["activation_status"], "activated_smoke_passed_no_provider_call")
            self.assertEqual(stored["smoke_status"], "smoke_passed_no_provider_call")
            self.assertEqual(stored["load_check_status"], "load_check_passed_no_runtime_start")
            self.assertEqual(stored["goal_audit_status"], "complete")
            self.assertFalse(stored["opencode_started"])
            self.assertFalse(stored["provider_model_call"])
            self.assertFalse(stored["secret_access"])
            target = root / ".opencode" / "oh-my-openagent.jsonc"
            self.assertTrue(target.exists())
            for receipt_path in stored["receipts"].values():
                self.assertTrue(Path(receipt_path).exists())

    def test_project_canonical_wrapper_blocks_without_exact_gate(self):
        target = ROOT / ".opencode" / "oh-my-openagent.jsonc"
        target_existed = target.exists()
        target_before = target.read_bytes() if target_existed else None
        env = os.environ.copy()
        env.pop("APPROVE_OHMYCODEX_CONFIG_WRITE_PROJECT_CANONICAL", None)

        result = subprocess.run(
            ["bash", str(ACTIVATE_WRAPPER)],
            cwd=ROOT,
            text=True,
            capture_output=True,
            env=env,
        )

        self.assertEqual(result.returncode, 2)
        self.assertIn("Blocked: set APPROVE_OHMYCODEX_CONFIG_WRITE_PROJECT_CANONICAL=1", result.stderr)
        if target_existed:
            self.assertEqual(target.read_bytes(), target_before)
        else:
            self.assertFalse(target.exists())

    def test_project_canonical_wrapper_preflight_is_read_only(self):
        target = ROOT / ".opencode" / "oh-my-openagent.jsonc"
        target_existed = target.exists()
        target_before = target.read_bytes() if target_existed else None
        with tempfile.TemporaryDirectory() as temp_dir:
            receipt = Path(temp_dir) / "preflight.json"
            env = os.environ.copy()
            env.pop("APPROVE_OHMYCODEX_CONFIG_WRITE_PROJECT_CANONICAL", None)
            env["OHMYCODEX_PREFLIGHT_RECEIPT"] = str(receipt)

            result = subprocess.run(
                ["bash", str(ACTIVATE_WRAPPER), "--preflight"],
                cwd=ROOT,
                check=True,
                text=True,
                capture_output=True,
                env=env,
            )

            payload = json.loads(result.stdout)
            stored = json.loads(receipt.read_text(encoding="utf-8"))
            self.assertEqual(payload["status"], "ready_for_activation_gate")
            self.assertEqual(stored["status"], "ready_for_activation_gate")
            self.assertFalse(stored["approval_env_set"])
            self.assertFalse(stored["write_live_config"])
            self.assertFalse(stored["provider_model_call"])
            self.assertFalse(stored["secret_access"])
        if target_existed:
            self.assertEqual(target.read_bytes(), target_before)
        else:
            self.assertFalse(target.exists())


if __name__ == "__main__":
    unittest.main()
