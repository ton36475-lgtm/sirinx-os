"""GhostClaw LANE_1 Opus architecture packet gate guardrails."""
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
VALIDATOR = ROOT / "WORKSPACE_SCAFFOLD" / "scripts" / "validate_lane1_opus_architecture_packet.py"
CONTRACT_JSON = ROOT / "data" / "pathspecs" / "ghostclaw_lane1_opus_architecture_packet_gate_2026-06-29.json"
CONTRACT_DOC = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET_GATE_2026-06-29.md"
PACKET = ROOT / "_A2A_QUEUE" / "outbox" / "packet_018_ghostclaw_lane1_opus_architecture_packet_gate.json"
FINAL_PACKET = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET.md"
HERMES_DECISION = ROOT / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md"
QUEUE_STATUS_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_a2a_queue_status_2026-06-29.json"
QUEUE_STATUS_DOC = ROOT / "docs" / "knowledge" / "SIRINX_CODEX_HERMES_A2A_QUEUE_STATUS_2026-06-29.md"
EXECUTION_QUEUE_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_execution_queue_2026-06-29.json"
ACTIVE_INDEX_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_systematic_work_index_2026-06-29.json"
CONTEXT_REGISTRY_JSON = ROOT / "data" / "pathspecs" / "sirinx_active_goal_context_packet_registry_2026-06-29.json"
MANIFEST_JSON = ROOT / "WORKSPACE_SCAFFOLD" / "manifests" / "active_goal_local_evidence_durability_2026-06-29.json"
MISSION_CONTROL = ROOT / "apps" / "centerbrain-shell" / "src" / "lib" / "god-mode-master-os.ts"


def load_validator_module():
    spec = importlib.util.spec_from_file_location("lane1_opus_architecture_packet_gate", VALIDATOR)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def synthetic_final_packet(root: Path, drift: str = "") -> str:
    evidence_paths = [
        "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md",
        "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_ARCHITECTURE_PACKET_DRAFT_FOR_HERMES_REVIEW_2026-06-29.md",
        "docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_DECISION_PREFLIGHT_AUDIT_2026-06-29.md",
        "data/pathspecs/ghostclaw_lane1_hermes_decision_preflight_audit_2026-06-29.json",
        "_A2A_QUEUE/outbox/packet_017_ghostclaw_lane1_hermes_decision_preflight_audit.json",
    ]
    for path in evidence_paths:
        target = root / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(f"synthetic evidence for {path}\n", encoding="utf-8")

    sections = "\n".join(
        [
            "## Goal",
            "## Current State",
            "## Proposed Architecture",
            "## Interface Contracts",
            "## Data Model Changes",
            "## Lane Assignments",
            "## Risk Assessment",
            "## Dependencies",
            "## Rollback Plan",
            "## Hermes Review Decision",
            "## Gate Status",
            "## Verification",
        ]
    )
    return "\n".join(
        [
            "# Synthetic Opus Architecture Packet",
            "GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET_FINAL",
            sections,
            "",
            "```text",
            "final_opus_packet=true",
            "hermes_decision_recorded=true",
            "decision_path=docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md",
            "lane2_authorized=false",
            "deploy=false",
            "push=false",
            "cloud_mutation=false",
            "customer_send=false",
            "secret_read=false",
            "paid_provider_call=false",
            "provider_call=false",
            "runtime_queue_execution=false",
            "merge_script_execution=false",
            "install=false",
            "migration=false",
            f"reviewed_evidence_paths={','.join(evidence_paths)}",
            drift,
            "```",
            "",
        ]
    )


class Lane1OpusArchitecturePacketGateTests(unittest.TestCase):
    """Ensure packet_018 validates future final packets without creating one."""

    def load_contract(self):
        self.assertTrue(CONTRACT_JSON.exists(), f"Missing Opus packet gate JSON: {CONTRACT_JSON}")
        return json.loads(CONTRACT_JSON.read_text(encoding="utf-8"))

    def load_packet(self):
        self.assertTrue(PACKET.exists(), f"Missing packet_018: {PACKET}")
        return json.loads(PACKET.read_text(encoding="utf-8"))

    def test_gate_artifacts_exist_without_final_packet_or_decision(self):
        self.assertTrue(VALIDATOR.exists(), f"Missing Opus packet validator: {VALIDATOR}")
        self.assertTrue(CONTRACT_JSON.exists(), f"Missing Opus packet gate JSON: {CONTRACT_JSON}")
        self.assertTrue(CONTRACT_DOC.exists(), f"Missing Opus packet gate doc: {CONTRACT_DOC}")
        self.assertTrue(PACKET.exists(), f"Missing Opus packet gate outbox packet: {PACKET}")
        self.assertFalse(FINAL_PACKET.exists(), "Final LANE_1 Opus packet exists unexpectedly")
        self.assertFalse(HERMES_DECISION.exists(), "Hermes decision exists unexpectedly")

    def test_contract_preserves_missing_final_packet_boundary(self):
        contract = self.load_contract()

        self.assertEqual(contract["schema"], "ghostclaw.lane1.opus_architecture_packet_gate.v1")
        self.assertEqual(contract["status"], "validator_ready_final_packet_missing")
        self.assertEqual(contract["current_actionable_packet"], "packet_013")
        self.assertEqual(contract["final_packet_path"], str(FINAL_PACKET.relative_to(ROOT)))
        self.assertEqual(contract["decision_path"], str(HERMES_DECISION.relative_to(ROOT)))
        self.assertFalse(contract["final_packet_present"])
        self.assertFalse(contract["final_packet_record"])
        self.assertFalse(contract["hermes_decision_recorded"])
        self.assertFalse(contract["decision_record"])
        self.assertFalse(contract["lane2_authorized"])
        self.assertFalse(contract["ready_for_lane2"])
        self.assertEqual(contract["blocked_by"], ["BLOCK-LANE1-OPUS-PACKET", "BLOCK-HERMES-GATEWAY"])

        for action in (
            "deploy",
            "push",
            "cloud_mutation",
            "customer_send",
            "secret_read",
            "paid_provider_call",
            "provider_call",
            "runtime_queue_execution",
            "merge_script_execution",
            "install",
            "migration",
        ):
            self.assertFalse(contract["blocked_actions"][action], f"{action} should remain false")

    def test_validator_fails_closed_when_final_packet_missing(self):
        module = load_validator_module()
        result = module.validate_opus_packet_path(FINAL_PACKET)

        self.assertFalse(result.ok)
        self.assertIn("missing_opus_architecture_packet", result.errors)
        self.assertEqual(module.main([str(FINAL_PACKET)]), 2)

    def test_validator_accepts_synthetic_final_packet_with_decision_evidence(self):
        module = load_validator_module()
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            packet_path = tmp_path / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET.md"
            packet_path.parent.mkdir(parents=True, exist_ok=True)
            packet_path.write_text(synthetic_final_packet(tmp_path), encoding="utf-8")

            result = module.validate_opus_packet_path(packet_path, root=tmp_path)

        self.assertTrue(result.ok, result.errors)
        self.assertEqual(result.fields["final_opus_packet"], "true")
        self.assertIn("docs/knowledge/SIRINX_GHOSTCLAW_LANE1_HERMES_REVIEW_DECISION.md", result.evidence_paths)

    def test_validator_rejects_gate_drift_or_secret_paths(self):
        module = load_validator_module()
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            packet_path = tmp_path / "docs" / "knowledge" / "SIRINX_GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET.md"
            packet_path.parent.mkdir(parents=True, exist_ok=True)
            packet_path.write_text(
                synthetic_final_packet(tmp_path, drift="deploy=true\nreviewed_evidence_paths=.env"),
                encoding="utf-8",
            )

            result = module.validate_opus_packet_path(packet_path, root=tmp_path)

        self.assertFalse(result.ok)
        self.assertIn("deploy must be false", result.errors)
        self.assertTrue(any("secret-like path" in error for error in result.errors))

    def test_packet_018_is_safe_outbox_only(self):
        contract = self.load_contract()
        packet = self.load_packet()

        self.assertEqual(packet["id"], "packet_018")
        self.assertEqual(packet["project"], "ghostclaw")
        self.assertEqual(packet["agent"], "codex")
        self.assertEqual(packet["status"], "outbox")
        self.assertEqual(packet["risk"], "safe")
        self.assertTrue(packet["approval_required"])
        self.assertEqual(packet["approval_scope"], "opus_architecture_packet_validation_only")
        self.assertEqual(packet["current_actionable_packet"], "packet_013")
        self.assertFalse(packet["final_packet_record"])
        self.assertFalse(packet["decision_record"])
        self.assertFalse(packet["lane2_authorized"])
        self.assertFalse(packet["runtime_queue_execution"])
        self.assertFalse(packet["provider_call"])
        self.assertIn(str(CONTRACT_JSON.relative_to(ROOT)), packet["input"])
        self.assertIn(str(CONTRACT_DOC.relative_to(ROOT)), packet["input"])
        self.assertIn(str(VALIDATOR.relative_to(ROOT)), packet["input"])
        self.assertIn(str(PACKET.relative_to(ROOT)), packet["output"])
        self.assertEqual(contract["current_actionable_packet"], packet["current_actionable_packet"])
        self.assertIn("Validator packet only", packet["notes"])

    def test_queue_status_indexes_packet_018_without_execution(self):
        status = json.loads(QUEUE_STATUS_JSON.read_text(encoding="utf-8"))

        self.assertEqual(
            status["packet_counts"],
            {
                "inbox": 5,
                "outbox": 15,
                "working": 1,
                "done": 8,
                "blocked": 0,
                "total": 29,
            },
        )
        packet = next(item for item in status["packets"] if item["id"] == "packet_018")
        self.assertEqual(packet["folder"], "outbox")
        self.assertEqual(packet["agent"], "codex")
        self.assertEqual(packet["status"], "outbox")
        self.assertEqual(packet["risk"], "safe")
        self.assertFalse(packet["runtime_queue_execution"])
        self.assertFalse(packet["provider_call"])
        self.assertFalse(packet["decision_record"])
        self.assertFalse(packet["final_packet_record"])
        self.assertFalse(packet["lane2_authorized"])

        text = QUEUE_STATUS_DOC.read_text(encoding="utf-8")
        self.assertIn("packet_counts: inbox=5 outbox=15 working=1 done=8 blocked=0 total=29", text)
        self.assertIn(str(PACKET.relative_to(ROOT)), text)

    def test_status_surfaces_link_gate_without_creating_final_packet(self):
        rel_validator = str(VALIDATOR.relative_to(ROOT))
        rel_json = str(CONTRACT_JSON.relative_to(ROOT))
        rel_doc = str(CONTRACT_DOC.relative_to(ROOT))
        rel_packet = str(PACKET.relative_to(ROOT))

        execution_queue = json.loads(EXECUTION_QUEUE_JSON.read_text(encoding="utf-8"))
        active_index = json.loads(ACTIVE_INDEX_JSON.read_text(encoding="utf-8"))
        registry = json.loads(CONTEXT_REGISTRY_JSON.read_text(encoding="utf-8"))
        manifest = json.loads(MANIFEST_JSON.read_text(encoding="utf-8"))
        mission = MISSION_CONTROL.read_text(encoding="utf-8")

        self.assertIn(rel_json, execution_queue["source_indexes"])
        item = next(item for item in execution_queue["items"] if item["id"] == "LANE1-OPUS-ARCHITECTURE-PACKET-GATE-PACKET-018")
        self.assertEqual(item["status"], "validator_ready_final_packet_missing")
        self.assertEqual(item["current_actionable_packet"], "packet_013")
        self.assertFalse(item["lane2_authorized"])
        self.assertIn(rel_validator, item["evidence"])
        self.assertIn(rel_json, item["evidence"])
        self.assertIn(rel_doc, item["evidence"])
        self.assertIn(rel_packet, item["evidence"])
        self.assertIn("decision_record", item["forbidden_actions"])
        self.assertIn("state_mutation", item["forbidden_actions"])
        self.assertIn("final_packet_creation", item["forbidden_actions"])

        stream = next(item for item in active_index["workstreams"] if item["id"] == "ghostclaw_lane1_opus_architecture_packet_gate")
        self.assertEqual(stream["status"], "validator_ready_final_packet_missing")
        self.assertIn(rel_json, stream["evidence"])
        self.assertIn(rel_packet, stream["evidence"])

        packet = next(item for item in registry["context_packets"] if item["id"] == "ctx-lane1-opus-architecture-packet-gate")
        self.assertEqual(packet["source"], rel_json)
        self.assertEqual(packet["permission"], "local_read_only")
        self.assertEqual(packet["status"], "validator_ready_final_packet_missing")

        manifest_paths = {entry["path"] for entry in manifest["ignored_pathspecs"]}
        self.assertIn(rel_json, manifest_paths)
        self.assertIn(rel_json, mission)
        self.assertIn(rel_packet, mission)
        self.assertIn("LANE1-OPUS-ARCHITECTURE-PACKET-GATE-PACKET-018", mission)
        self.assertFalse(FINAL_PACKET.exists(), "Final LANE_1 Opus packet exists unexpectedly")

    def test_markdown_gate_states_non_actions(self):
        text = CONTRACT_DOC.read_text(encoding="utf-8")
        required = [
            "GHOSTCLAW_LANE1_OPUS_ARCHITECTURE_PACKET_GATE_LOCAL_ONLY",
            "validator_ready_final_packet_missing",
            "final_packet_present=false",
            "final_packet_record=false",
            "hermes_decision_recorded=false",
            "decision_record=false",
            "lane2_authorized=false",
            "ready_for_lane2=false",
            "No deploy, push, cloud mutation, customer send, secret read, paid/provider call,",
            "Use this validator only after Hermes/Opus produces a separate final packet",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
