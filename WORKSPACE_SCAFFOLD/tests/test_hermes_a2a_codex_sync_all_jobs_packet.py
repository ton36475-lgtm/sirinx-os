"""Hermes A2A Codex sync-all-jobs packet guardrails."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PACKET_JSON = ROOT / "_A2A_QUEUE" / "inbox" / "packet_024_sirinx_hermes_a2a_codex_sync_all_jobs.json"
PATHSPEC_JSON = (
    ROOT
    / "data"
    / "pathspecs"
    / "sirinx_hermes_a2a_codex_sync_all_jobs_packet_2026-06-29.json"
)
PATHSPEC_DOC = ROOT / "docs" / "knowledge" / "SIRINX_HERMES_A2A_CODEX_SYNC_ALL_JOBS_PACKET_2026-06-29.md"
QUEUE_STATUS_JSON = ROOT / "data" / "pathspecs" / "sirinx_codex_hermes_a2a_queue_status_2026-06-29.json"
COMMAND_INTENTS = ROOT / "GHOSTCLAW" / "a2a-hermes-codex-bridge" / "command-intents.ts"


class HermesA2ACodexSyncAllJobsPacketTests(unittest.TestCase):
    """Ensure packet_024 stays a local command packet instead of an execution grant."""

    def test_packet_and_pathspec_exist_without_license_file(self):
        self.assertTrue(PACKET_JSON.exists(), f"Missing packet: {PACKET_JSON}")
        self.assertTrue(PATHSPEC_JSON.exists(), f"Missing pathspec: {PATHSPEC_JSON}")
        self.assertTrue(PATHSPEC_DOC.exists(), f"Missing doc: {PATHSPEC_DOC}")
        self.assertTrue(COMMAND_INTENTS.exists(), f"Missing command-intents bridge: {COMMAND_INTENTS}")
        self.assertFalse((ROOT / "LICENSE").exists(), "Root LICENSE unexpectedly exists")
        self.assertFalse((ROOT / "COPYING").exists(), "Root COPYING unexpectedly exists")

    def test_packet_records_goal_command_without_execution(self):
        packet = json.loads(PACKET_JSON.read_text(encoding="utf-8"))
        message = packet["a2a2a_message"]
        context = message["context"]

        self.assertEqual(packet["id"], "packet_024_sirinx_hermes_a2a_codex_sync_all_jobs")
        self.assertEqual(packet["status"], "inbox")
        self.assertEqual(packet["agent"], "hermes")
        self.assertEqual(message["action_requested"], "goal_define")
        self.assertEqual(context["command_source"], "goal")
        self.assertIn("no_real_codex_cli_execution", context["constraints"])
        self.assertIn("mit_license_intent_only_until_license_file_exists", context["constraints"])
        self.assertFalse(packet["approval_required"])
        self.assertEqual(context["license_policy"]["requested_license"], "MIT")
        self.assertFalse(context["license_policy"]["repo_license_file_present"])
        self.assertEqual(context["license_policy"]["assertion"], "intent_only_until_license_file_exists")
        self.assertIn("runtime_queue_execution=false", packet["notes"])
        self.assertIn("provider_call=false", packet["notes"])
        self.assertIn("requested_license=MIT", packet["notes"])

    def test_pathspec_preserves_local_only_license_intent_boundary(self):
        pathspec = json.loads(PATHSPEC_JSON.read_text(encoding="utf-8"))

        self.assertEqual(pathspec["schema"], "sirinx.hermes_a2a_codex_sync_all_jobs_packet.v1")
        self.assertEqual(pathspec["status"], "goal_command_inbox_ready_local_only")
        self.assertEqual(pathspec["current_actionable_packet"], "packet_013")
        self.assertFalse(pathspec["packet_024_is_current_actionable"])
        self.assertEqual(
            pathspec["queue_counts"],
            {
                "inbox": 5,
                "outbox": 14,
                "working": 1,
                "done": 8,
                "blocked": 0,
                "total": 28,
            },
        )
        self.assertEqual(pathspec["license_policy"]["requested_license"], "MIT")
        self.assertFalse(pathspec["license_policy"]["repo_license_file_present"])
        self.assertFalse(pathspec["license_policy"]["license_file_created"])
        self.assertFalse(pathspec["license_policy"]["license_claim_authorized"])

        for flag in (
            "runtime_queue_execution",
            "real_codex_cli_execution",
            "provider_call",
            "paid_provider_call",
            "external_message_send",
            "telegram_live_send",
            "deploy",
            "push",
            "cloud_mutation",
            "customer_send",
            "secret_read",
            "state_mutation",
            "lane2_authorized",
            "claims_goal_complete",
            "claims_all_chats_read",
        ):
            self.assertFalse(pathspec[flag], f"{flag} should remain false")

        self.assertIn("license_claim_without_license_file", pathspec["forbidden_actions"])
        self.assertIn("license_file_creation_without_approval", pathspec["forbidden_actions"])
        self.assertIn(str(PACKET_JSON.relative_to(ROOT)), pathspec["source_evidence"])

    def test_queue_status_indexes_packet_024_without_changing_current_actionable_packet(self):
        queue_status = json.loads(QUEUE_STATUS_JSON.read_text(encoding="utf-8"))
        packet = next(item for item in queue_status["packets"] if item["id"] == "packet_024_sirinx_hermes_a2a_codex_sync_all_jobs")

        self.assertEqual(queue_status["current_actionable_packet"], "packet_013")
        self.assertEqual(queue_status["packet_counts"]["inbox"], 5)
        self.assertEqual(queue_status["packet_counts"]["outbox"], 14)
        self.assertEqual(queue_status["packet_counts"]["total"], 28)
        self.assertEqual(packet["folder"], "inbox")
        self.assertEqual(packet["agent"], "hermes")
        self.assertEqual(packet["status"], "inbox")
        self.assertEqual(packet["risk"], "safe")
        self.assertFalse(packet["runtime_queue_execution"])
        self.assertFalse(packet["provider_call"])
        self.assertFalse(packet["deploy"])
        self.assertFalse(packet["push"])
        self.assertFalse(packet["secret_read"])
        self.assertFalse(packet["lane2_authorized"])

    def test_markdown_states_non_actions(self):
        text = PATHSPEC_DOC.read_text(encoding="utf-8")
        required = [
            "HERMES_A2A_CODEX_SYNC_ALL_JOBS_PACKET_LOCAL_ONLY",
            "packet_024_sirinx_hermes_a2a_codex_sync_all_jobs",
            "runtime_queue_execution=false",
            "real_codex_cli_execution=false",
            "license_policy=MIT intent only until LICENSE exists",
            "packet_counts: inbox=5 outbox=14 working=1 done=8 blocked=0 total=28",
            "No `LICENSE` file was created or changed.",
            "not a license claim",
        ]
        missing = [item for item in required if item not in text]
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
