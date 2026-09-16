import json
import subprocess
import tempfile
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPT = REPO_ROOT / "scripts/ghostclaw_loop_harness_validate.py"


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def valid_schema() -> dict:
    return {
        "required": [
            "loop_id",
            "mode",
            "current_gate",
            "objective",
            "active_focus",
            "paused_out_of_scope",
            "allowed_paths",
            "blocked_paths",
            "max_iterations",
            "stop_before",
            "required_validation",
            "reviewer",
            "receipt_policy",
        ],
        "properties": {
            "loop_id": {},
            "mode": {"enum": ["docs_only_dry_run", "local_safe_no_commit", "review_or_manifest_only"]},
            "current_gate": {},
            "objective": {},
            "active_focus": {},
            "paused_out_of_scope": {},
            "allowed_paths": {},
            "blocked_paths": {},
            "max_iterations": {},
            "stop_before": {},
            "required_validation": {},
            "reviewer": {},
            "receipt_policy": {},
        },
    }


def valid_manifest() -> dict:
    return {
        "loop_id": "GHOSTCLAW-P077-LOOP-HARNESS-LOCAL-DRY-RUN-20260704",
        "mode": "docs_only_dry_run",
        "current_gate": "P077",
        "objective": "Add Loop-Engineered Harness as Layer 12B without replacing core gates.",
        "active_focus": ["sirinx.co", "AGM AutoFlow"],
        "paused_out_of_scope": [
            "Kusala",
            "กุศลา",
            "Final Farewell",
            "Phitsanulok News",
            "Phitsanulok United News",
        ],
        "allowed_paths": [
            "docs/harness/**",
            ".ghostclaw_runtime/a2a2a/evidence/*LOOP-HARNESS*",
            ".ghostclaw_runtime/a2a2a/receipts/*LOOP-HARNESS*",
            ".ghostclaw_runtime/a2a2a/reviews/*LOOP-HARNESS*",
            "reports/mission/*LOOP_HARNESS*",
        ],
        "blocked_paths": [
            "src/**",
            "apps/**",
            "packages/**",
            "workers/**",
            "cloudflare/**",
            "wrangler.toml",
            ".env*",
            "secrets/**",
            "credentials/**",
        ],
        "max_iterations": 3,
        "stop_before": [
            "git commit",
            "git push",
            "deploy",
            "live Telegram send",
            "Cloudflare mutation",
            "provider/model call",
        ],
        "required_validation": [
            "python3 -m json.tool docs/harness/loop_harness_manifest.schema.json",
            "node scripts/secret-scan.mjs",
            "git diff --check -- docs/harness reports/mission",
        ],
        "reviewer": {"separate_from_worker": True, "mutation_allowed": False},
        "receipt_policy": {
            "receipt_per_iteration": True,
            "record_changed_paths": True,
            "record_validation": True,
        },
    }


class GhostClawLoopHarnessValidateTest(unittest.TestCase):
    def _run_validator(self, root: Path, manifest: dict, *, write: bool = False) -> subprocess.CompletedProcess:
        schema_path = root / "docs/harness/loop_harness_manifest.schema.json"
        manifest_path = root / "docs/harness/manifest.json"
        write_json(schema_path, valid_schema())
        write_json(manifest_path, manifest)
        command = [
            "python3",
            str(SCRIPT),
            "--root",
            str(root),
            "--schema",
            str(schema_path.relative_to(root)),
            "--manifest",
            str(manifest_path.relative_to(root)),
        ]
        if write:
            command.append("--write")
        return subprocess.run(command, text=True, capture_output=True)

    def test_valid_manifest_writes_evidence_receipt_and_review_packet(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            result = self._run_validator(root, valid_manifest(), write=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "pass_loop_harness_manifest_validation")
            self.assertTrue(payload["validation"]["checks"]["reviewer_mutation_blocked"])
            self.assertFalse(payload["external_actions_performed"]["provider_call"])

            evidence_path = root / ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P154-LOOP-HARNESS-MANIFEST-VALIDATOR-20260704.json"
            receipt_path = root / ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P154-LOOP-HARNESS-MANIFEST-VALIDATOR-20260704.json"
            review_path = root / ".ghostclaw_runtime/a2a2a/reviews/A2A2A-P154-LOOP-HARNESS-OPENCODE-REVIEW-PACKET-20260704.json"
            self.assertTrue(evidence_path.is_file())
            self.assertTrue(receipt_path.is_file())
            self.assertTrue(review_path.is_file())
            review = json.loads(review_path.read_text())
            self.assertEqual(review["status"], "ready_for_opencode_review")
            self.assertFalse(review["mutation_allowed"])
            self.assertIn("OpenCode_Reviewer", review["review_worker"])

    def test_manifest_fails_when_reviewer_can_mutate(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            manifest = valid_manifest()
            manifest["reviewer"]["mutation_allowed"] = True
            result = self._run_validator(Path(temp_dir), manifest)
            self.assertNotEqual(result.returncode, 0)
            payload = json.loads(result.stdout)
            self.assertIn("reviewer_mutation_not_blocked", payload["validation"]["issues"])

    def test_manifest_fails_when_paused_scope_is_active(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            manifest = valid_manifest()
            manifest["active_focus"].append("Phitsanulok News")
            result = self._run_validator(Path(temp_dir), manifest)
            self.assertNotEqual(result.returncode, 0)
            payload = json.loads(result.stdout)
            self.assertIn("active_focus_contains_paused_scope", payload["validation"]["issues"])

    def test_manifest_fails_when_iteration_cap_exceeds_hard_limit(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            manifest = valid_manifest()
            manifest["max_iterations"] = 6
            result = self._run_validator(Path(temp_dir), manifest)
            self.assertNotEqual(result.returncode, 0)
            payload = json.loads(result.stdout)
            self.assertIn("max_iterations_out_of_cap", payload["validation"]["issues"])


if __name__ == "__main__":
    unittest.main()
