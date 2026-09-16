"""GhostClaw YOLO v3.3 artifact gate validator guardrails."""
import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
VALIDATOR = ROOT / "WORKSPACE_SCAFFOLD" / "scripts" / "validate_ghostclaw_v3_3_artifact_gate.py"
CONTRACT_JSON = ROOT / "data" / "pathspecs" / "sirinx_ghostclaw_v3_3_artifact_gate_validator_2026-06-29.json"
CONTRACT_DOC = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_V3_3_ARTIFACT_GATE_VALIDATOR_2026-06-29.md"
TEMPLATE_JSON = ROOT / "WORKSPACE_SCAFFOLD" / "templates" / "ghostclaw_v3_3_artifact_gate_packet.template.json"
ACTIVE_ARTIFACT = ROOT / "ghostclaw_repo_merge_kit_v3_3.zip"
INDEX_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_systematic_work_index_2026-06-29.json"
QUEUE_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_execution_queue_2026-06-29.json"


def load_validator_module():
    spec = importlib.util.spec_from_file_location("ghostclaw_v3_3_artifact_gate", VALIDATOR)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def write_synthetic_zip(path, missing=None):
    missing = set(missing or [])
    entries = {
        "ghostclaw_repo_merge_kit_v3_3/server/routers.ts": "export const routers = {};",
        "ghostclaw_repo_merge_kit_v3_3/server/routers/agentic.ts": "export const agenticRouter = {};",
        "ghostclaw_repo_merge_kit_v3_3/server/services/llmAnalysis.ts": "export const analyzeR0GateRisk = () => ({});",
        "ghostclaw_repo_merge_kit_v3_3/drizzle/schema.ts": "export const schema = {};",
        "ghostclaw_repo_merge_kit_v3_3/server/db.ts": "export const db = {};",
        "ghostclaw_repo_merge_kit_v3_3/tests/policy.test.mjs": "import test from 'node:test';",
        "ghostclaw_repo_merge_kit_v3_3/.github/workflows/staging.yml": "name: staging",
        "ghostclaw_repo_merge_kit_v3_3/staging-manifest.json": "{}",
        "ghostclaw_repo_merge_kit_v3_3/receipt.json": "{}",
    }
    with zipfile.ZipFile(path, "w") as archive:
        for entry, content in entries.items():
            if entry not in missing:
                archive.writestr(entry, content)


class GhostClawV33ArtifactGateValidatorTests(unittest.TestCase):
    """Ensure v3.3 artifact intake is deterministic and does not run merge work."""

    def test_contract_artifacts_exist_without_active_artifact(self):
        self.assertTrue(VALIDATOR.exists(), f"Missing validator script: {VALIDATOR}")
        self.assertTrue(CONTRACT_JSON.exists(), f"Missing contract JSON: {CONTRACT_JSON}")
        self.assertTrue(CONTRACT_DOC.exists(), f"Missing contract doc: {CONTRACT_DOC}")
        self.assertTrue(TEMPLATE_JSON.exists(), f"Missing template JSON: {TEMPLATE_JSON}")
        self.assertFalse(ACTIVE_ARTIFACT.exists(), "Active v3.3 artifact exists unexpectedly in repo root")

    def test_contract_is_not_artifact_and_keeps_external_actions_blocked(self):
        contract = json.loads(CONTRACT_JSON.read_text(encoding="utf-8"))

        self.assertEqual(contract["schema"], "sirinx.ghostclaw_v3_3.artifact_gate_validator.v1")
        self.assertEqual(contract["status"], "validator_not_artifact")
        self.assertEqual(contract["expected_artifact_basename"], "ghostclaw_repo_merge_kit_v3_3.zip")
        self.assertFalse(contract["claims_artifact_present"])
        self.assertFalse(contract["artifact_gate_passed"])
        for action in (
            "deploy",
            "push",
            "cloud_mutation",
            "customer_send",
            "secret_read",
            "paid_provider_call",
            "runtime_queue_execution",
            "merge_script_execution",
            "install",
            "migration",
            "feature_branch_creation",
        ):
            self.assertFalse(contract["blocked_actions"][action], f"{action} should remain false")

    def test_template_defaults_to_no_artifact_gate_pass(self):
        template = json.loads(TEMPLATE_JSON.read_text(encoding="utf-8"))

        self.assertEqual(template["status"], "template_not_artifact_gate_pass")
        self.assertFalse(template["artifact_gate_passed"])
        self.assertFalse(template["policy_tests_passed"])
        self.assertEqual(template["artifact_path"], "/Users/sirinx/Downloads/ghostclaw_repo_merge_kit_v3_3.zip")
        for action, allowed in template["blocked_actions"].items():
            self.assertFalse(allowed, f"{action} should remain false")

    def test_validator_accepts_synthetic_complete_zip_with_policy_pass_evidence(self):
        module = load_validator_module()
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            artifact = tmp_path / "ghostclaw_repo_merge_kit_v3_3.zip"
            policy_evidence = tmp_path / "policy-evidence.json"
            write_synthetic_zip(artifact)
            policy_evidence.write_text(json.dumps({"pass": 11, "fail": 0}), encoding="utf-8")

            result = module.validate_artifact_gate(artifact, policy_evidence_path=policy_evidence)

        self.assertTrue(result.ok, result.errors)
        self.assertEqual(result.status, "artifact_gate_passed")
        self.assertEqual(result.artifact_basename, "ghostclaw_repo_merge_kit_v3_3.zip")
        self.assertEqual(result.policy_pass, 11)
        self.assertEqual(result.policy_fail, 0)
        self.assertEqual(result.missing_required_entries, [])
        self.assertFalse(result.merge_script_execution)

    def test_validator_rejects_wrong_name_missing_entries_or_policy_failures(self):
        module = load_validator_module()
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            artifact = tmp_path / "wrong_name.zip"
            policy_evidence = tmp_path / "policy-evidence.json"
            write_synthetic_zip(
                artifact,
                missing={
                    "ghostclaw_repo_merge_kit_v3_3/server/services/llmAnalysis.ts",
                    "ghostclaw_repo_merge_kit_v3_3/receipt.json",
                },
            )
            policy_evidence.write_text(json.dumps({"pass": 10, "fail": 1}), encoding="utf-8")

            result = module.validate_artifact_gate(artifact, policy_evidence_path=policy_evidence)

        self.assertFalse(result.ok)
        self.assertEqual(result.status, "blocked")
        self.assertIn("artifact basename must be ghostclaw_repo_merge_kit_v3_3.zip", result.errors)
        self.assertIn("missing required archive entry kind: llmAnalysis.ts", result.errors)
        self.assertIn("missing required archive entry kind: receipt", result.errors)
        self.assertIn("policy evidence must show fail=0", result.errors)

    def test_validator_cli_handles_missing_artifact_as_blocked_not_success(self):
        result = subprocess.run(
            [sys.executable, str(VALIDATOR), str(ROOT / "missing-ghostclaw-v3-3.zip")],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=False,
        )

        self.assertEqual(result.returncode, 2)
        self.assertIn("missing_v3_3_artifact", result.stdout)

    def test_contract_is_linked_from_active_index_and_queue(self):
        rel = str(CONTRACT_JSON.relative_to(ROOT))
        index = json.loads(INDEX_JSON.read_text(encoding="utf-8"))
        queue = json.loads(QUEUE_JSON.read_text(encoding="utf-8"))

        self.assertIn(rel, index["source_files"])
        self.assertIn(rel, queue["source_indexes"])
        v33_item = next(item for item in queue["items"] if item["id"] == "GHOSTCLAW-V3-3-ARTIFACT-INTAKE")
        self.assertIn(rel, v33_item["evidence"])

    def test_markdown_contract_states_metadata_only_non_action_boundary(self):
        text = CONTRACT_DOC.read_text(encoding="utf-8")
        required = [
            "GHOSTCLAW_V3_3_ARTIFACT_GATE_VALIDATOR_LOCAL_ONLY",
            "This validator does not merge the artifact.",
            "claims_artifact_present=false",
            "artifact_gate_passed=false",
            "metadata-only zip inventory",
            "No merge script, feature branch, commit, push, deploy, cloud mutation, provider call, install, migration, wallet action, live send, or secret read is authorized.",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
