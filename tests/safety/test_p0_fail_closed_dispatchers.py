"""Deterministic offline proof for P0 dispatcher containment."""

import contextlib
import importlib.util
import io
import json
import tempfile
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]


def load_script(name):
    path = REPO / "scripts" / name
    spec = importlib.util.spec_from_file_location(name.replace("-", "_"), path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class FullAutoContainmentTests(unittest.TestCase):
    def setUp(self):
        self.module = load_script("full-auto-approval-loop.py")
        self.tempdir = tempfile.TemporaryDirectory()
        self.root = Path(self.tempdir.name)
        self.module.WS = self.root
        self.module.A2A = self.root / "_A2A_QUEUE"
        (self.module.A2A / "inbox").mkdir(parents=True)

    def tearDown(self):
        self.tempdir.cleanup()

    def write_packet(self, name, data):
        path = self.module.A2A / "inbox" / name
        path.write_text(json.dumps(data))
        return path

    def test_restricted_tiers_are_never_self_approved_or_downgraded(self):
        action_types = {"C": "write_local_scoped", "D": "deploy", "X": "read_local"}
        paths = {
            tier: self.write_packet(
                f"{tier}.json",
                {"action_type": action_types[tier], "safety": {"tier": tier}},
            )
            for tier in ("C", "D", "X")
        }

        self.assertEqual(self.module.quarantine_unsafe_packets(), 3)
        for tier, path in paths.items():
            packet = json.loads(path.read_text())
            self.assertEqual(packet["safety"]["tier"], tier)
            self.assertFalse(packet["safety"]["allowed"])
            self.assertNotIn("approval", packet)
            expected_status = "QUARANTINED" if tier == "X" else "BLOCKED_PENDING_EXACT_APPROVAL"
            self.assertEqual(packet["containment"]["status"], expected_status)

    def test_missing_and_unknown_tiers_quarantine_as_x(self):
        missing = self.write_packet("missing.json", {})
        unknown = self.write_packet(
            "unknown.json",
            {"action_type": "read_local", "safety": {"tier": "Z"}},
        )

        self.assertEqual(self.module.quarantine_unsafe_packets(), 2)
        for path in (missing, unknown):
            packet = json.loads(path.read_text())
            self.assertEqual(packet["safety"]["tier"], "X")
            self.assertFalse(packet["safety"]["allowed"])

    def test_auto_tier_requires_explicit_allow_and_high_risk_rounds_up(self):
        implicit = self.write_packet(
            "implicit.json",
            {"action_type": "read_local", "safety": {"tier": "A"}},
        )
        risky = self.write_packet(
            "risky.json",
            {
                "context": {"goal": "deploy to cloud"},
                "action_type": "deploy",
                "safety": {"tier": "A", "allowed": True},
            },
        )

        self.assertEqual(self.module.quarantine_unsafe_packets(), 2)
        self.assertEqual(json.loads(implicit.read_text())["safety"]["tier"], "X")
        self.assertEqual(json.loads(risky.read_text())["safety"]["tier"], "D")

    def test_hard_deny_action_is_x_not_approvable(self):
        packet_path = self.write_packet(
            "deny.json",
            {
                "context": {"goal": "read secret token"},
                "action_type": "secret_access",
                "safety": {"tier": "D", "allowed": False},
            },
        )

        self.assertEqual(self.module.quarantine_unsafe_packets(), 1)
        packet = json.loads(packet_path.read_text())
        self.assertEqual(packet["safety"]["tier"], "X")
        self.assertEqual(packet["containment"]["status"], "QUARANTINED")
        self.assertIn("hard_deny_action", packet["containment"]["reasons"])

    def test_missing_routing_status_cannot_become_done(self):
        assigned = self.module.A2A / "assigned" / "codex"
        assigned.mkdir(parents=True)
        packet = assigned / "no-status.json"
        packet.write_text("{}")

        self.module.collect_results()

        self.assertFalse((self.module.A2A / "done" / packet.name).exists())
        self.assertTrue((self.module.A2A / "blocked" / packet.name).exists())

    def test_completed_packet_waits_for_independent_verification(self):
        assigned = self.module.A2A / "assigned" / "codex"
        assigned.mkdir(parents=True)
        packet = assigned / "completed.json"
        packet.write_text(json.dumps({"routing_status": "COMPLETED"}))

        self.module.collect_results()

        self.assertTrue(packet.exists())
        self.assertFalse((self.module.A2A / "done" / packet.name).exists())

    def test_assigned_packet_waits_for_a_worker_result(self):
        assigned = self.module.A2A / "assigned" / "codex"
        assigned.mkdir(parents=True)
        packet = assigned / "assigned.json"
        packet.write_text(json.dumps({"routing_status": "ASSIGNED"}))

        self.module.collect_results()

        self.assertTrue(packet.exists())
        self.assertFalse((self.module.A2A / "blocked" / packet.name).exists())


class AgentDispatcherTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.module = load_script("cmux-agent-dispatcher.py")

    def test_tier_normalization_is_fail_closed(self):
        for value in (None, "", "Z", 1, {}):
            self.assertEqual(self.module.normalize_tier(value), "X")
        self.assertEqual(self.module.normalize_tier("b"), "B")

    def test_auto_tier_requires_explicit_allowed_true(self):
        self.assertEqual(
            self.module.effective_packet_tier({"safety": {"tier": "A"}}),
            "X",
        )

    def test_structured_high_risk_and_oversized_packets_cannot_enter_auto_lane(self):
        production_mutation = {
            "action_type": "production_db_mutation",
            "context": {"goal": "apply change"},
            "safety": {"tier": "A", "allowed": True},
        }
        oversized = {
            "action_type": "read_local",
            "context": {"goal": "x" * (self.module.MAX_PACKET_BYTES + 1)},
            "safety": {"tier": "A", "allowed": True},
        }

        self.assertEqual(self.module.effective_packet_tier(production_mutation), "D")
        self.assertEqual(self.module.effective_packet_tier(oversized), "X")
        self.assertEqual(
            self.module.effective_packet_tier({
                "action_type": "read_local",
                "safety": {"tier": "A", "allowed": True},
            }),
            "A",
        )
        self.assertEqual(
            self.module.effective_packet_tier({
                "context": {"goal": "read secret token"},
                "action_type": "secret_access",
                "safety": {"tier": "D", "allowed": False},
            }),
            "X",
        )

    def test_sensitive_actions_block_even_when_labeled_tier_a(self):
        restricted = (
            "install",
            "provider",
            "OmniRoute",
            "send",
            "Telegram",
            "push",
            "commit",
            "git add",
            "deploy",
            "cloud",
            "secret",
            "credential",
            "token",
            "cookie",
            ".env",
            "auth.json",
            "config.yaml",
        )
        for action in restricted:
            reasons = self.module.containment_reasons("A", f"please {action} now")
            self.assertIn("restricted_action_requires_external_approval", reasons)

    def test_sensitive_action_in_nested_packet_is_blocked(self):
        packet = {
            "action_type": "read_local",
            "context": {"goal": "review docs"},
            "payload": {"requested_action": "git push origin main"},
        }
        reasons = self.module.containment_reasons("A", packet)
        self.assertIn("restricted_action_requires_external_approval", reasons)

    def test_brainstorm_mode_performs_no_filesystem_write(self):
        with tempfile.TemporaryDirectory() as tempdir:
            root = Path(tempdir)
            self.module.WORKSPACE = root
            self.module.TASKS_DIR = root / "storage" / "agent-tasks"
            self.module.RESULTS_DIR = root / "storage" / "agent-results"

            analysis = self.module.brainstorm_packets([
                {
                    "file": "safe.json",
                    "data": {
                        "action_type": "read_local",
                        "safety": {"tier": "A", "allowed": True},
                    },
                    "goal_text": "review docs",
                    "tier": "A",
                    "blocked_reasons": [],
                }
            ])

            self.assertEqual(analysis["total"], 1)
            self.assertEqual(list(root.rglob("*")), [])

    def test_dispatch_cycle_quarantines_ambiguous_and_sensitive_packets(self):
        with tempfile.TemporaryDirectory() as tempdir:
            root = Path(tempdir)
            self.module.WORKSPACE = root
            self.module.A2A_QUEUE = root / "_A2A_QUEUE"
            self.module.TASKS_DIR = root / "storage" / "agent-tasks"
            self.module.RESULTS_DIR = root / "storage" / "agent-results"
            self.module.WORKTREES = {
                name: root / ".worktrees" / name
                for name in ("claude", "codex", "opencode")
            }
            (self.module.A2A_QUEUE / "inbox").mkdir(parents=True)
            self.module.TASKS_DIR.mkdir(parents=True)
            self.module.RESULTS_DIR.mkdir(parents=True)
            for worktree in self.module.WORKTREES.values():
                worktree.mkdir(parents=True)

            packets = {
                "safe.json": {
                    "action_type": "read_local",
                    "context": {"goal": "review docs"},
                    "safety": {"tier": "A", "allowed": True},
                },
                "missing.json": {"context": {"goal": "review docs"}},
                "unknown.json": {
                    "action_type": "read_local",
                    "context": {"goal": "review docs"},
                    "safety": {"tier": "Z"},
                },
                "tier-c.json": {
                    "action_type": "write_local_scoped",
                    "context": {"goal": "review docs"},
                    "safety": {"tier": "C"},
                },
                "tier-d.json": {
                    "action_type": "deploy",
                    "context": {"goal": "review docs"},
                    "safety": {"tier": "D"},
                },
                "sensitive-a.json": {
                    "action_type": "deploy",
                    "context": {"goal": "deploy to cloud"},
                    "safety": {"tier": "A", "allowed": True},
                    "approval": {"approved": True},
                },
            }
            for name, packet in packets.items():
                (self.module.A2A_QUEUE / "inbox" / name).write_text(json.dumps(packet))

            summary = self.module.run_dispatch_cycle()

            self.assertEqual(summary["dispatched"], 1)
            self.assertFalse((self.module.A2A_QUEUE / "inbox" / "safe.json").exists())
            assigned_safe = self.module.A2A_QUEUE / "assigned" / "opencode" / "safe.json"
            self.assertTrue(assigned_safe.exists())
            assigned_payload = json.loads(assigned_safe.read_text())
            self.assertEqual(assigned_payload["routing_status"], "ASSIGNED")
            self.assertFalse(assigned_payload["dispatch_control"]["execution_authorized"])
            self.assertEqual(summary["collected_errors"], 0)
            for name in packets.keys() - {"safe.json"}:
                path = self.module.A2A_QUEUE / "inbox" / name
                self.assertTrue(path.exists(), name)
                packet = json.loads(path.read_text())
                if name in {"missing.json", "unknown.json"}:
                    self.assertEqual(packet["containment"]["status"], "QUARANTINED")
                else:
                    self.assertEqual(packet["containment"]["status"], "BLOCKED_PENDING_EXACT_APPROVAL")
                self.assertFalse(packet["safety"]["allowed"])
            self.assertEqual(
                json.loads((self.module.A2A_QUEUE / "inbox" / "missing.json").read_text())["safety"]["tier"],
                "X",
            )
            self.assertEqual(summary["approval_held"], 3)
            self.assertEqual(summary["quarantined"], 2)
            self.assertEqual(
                json.loads((self.module.A2A_QUEUE / "inbox" / "unknown.json").read_text())["safety"]["tier"],
                "X",
            )


class CliPreviewTests(unittest.TestCase):
    def setUp(self):
        self.module = load_script("cmux-cli-dispatcher.py")
        self.tempdir = tempfile.TemporaryDirectory()
        self.root = Path(self.tempdir.name)
        self.module.WS = self.root

    def tearDown(self):
        self.tempdir.cleanup()

    def test_provider_shims_never_execute(self):
        self.assertEqual(
            self.module.run_codex("$(touch should-not-run)"),
            (False, "BLOCKED: Codex/provider execution disabled; preview only"),
        )
        self.assertEqual(
            self.module.run_opencode("; git push"),
            (False, "BLOCKED: OpenCode/provider execution disabled; preview only"),
        )

    def test_x_is_quarantined_and_production_db_mutation_is_never_preview_only(self):
        quarantined = self.module.packet_preview({
            "action_type": "secret_access",
            "safety": {"tier": "X", "allowed": False},
        })
        production_mutation = self.module.packet_preview({
            "action_type": "production_db_mutation",
            "safety": {"tier": "A", "allowed": True},
        })

        self.assertEqual(quarantined["tier"], "X")
        self.assertEqual(quarantined["status"], "QUARANTINED_NOT_APPROVABLE")
        self.assertEqual(production_mutation["tier"], "D")
        self.assertEqual(production_mutation["status"], "BLOCKED_PENDING_EXTERNAL_APPROVAL")

    def test_default_main_is_read_only_preview(self):
        assigned = self.root / "_A2A_QUEUE" / "assigned" / "codex"
        assigned.mkdir(parents=True)
        packet = assigned / "packet.json"
        original = json.dumps({
            "action_type": "read_local",
            "context": {"goal": "review docs"},
            "safety": {"tier": "A", "allowed": True},
        })
        packet.write_text(original)

        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            self.module.main()

        self.assertEqual(packet.read_text(), original)
        self.assertIn("preview only", output.getvalue())
        self.assertFalse((self.root / "_A2A_QUEUE" / "done").exists())

    def test_source_contains_no_shell_or_git_push_execution(self):
        cli_source = (REPO / "scripts" / "cmux-cli-dispatcher.py").read_text()
        loop_source = (REPO / "scripts" / "full-auto-approval-loop.py").read_text()
        self.assertNotIn("shell=True", cli_source)
        self.assertNotIn("subprocess.run", cli_source)
        self.assertNotIn('["git", "push"', loop_source)
        self.assertNotIn('["git", "add"', loop_source)
        self.assertNotIn('["git", "commit"', loop_source)


if __name__ == "__main__":
    unittest.main()
