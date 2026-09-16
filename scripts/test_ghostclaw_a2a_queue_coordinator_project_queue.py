#!/usr/bin/env python3
import json
import tempfile
import unittest
from pathlib import Path

import ghostclaw_a2a_queue_coordinator as coordinator


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def write_json(path: Path, payload: dict) -> None:
    write(path, json.dumps(payload, indent=2, sort_keys=True) + "\n")


class GhostClawProjectQueueCoordinatorTest(unittest.TestCase):
    def seed_route_matrix(self, root: Path) -> None:
        write(
            root / ".ghostclaw/registry/route-matrix.v1.yaml",
            """
routes:
  - route_id: route-repo-arch
    task_type: repo_or_architecture
    primary_agent: codex
    reviewer_agent: opencode
    validator_agent: validator
    tier: C
""",
        )

    def seed_inbox_task(self, root: Path) -> None:
        write_json(
            root / ".ghostclaw_runtime/a2a2a/inbox/hermes/task-004.json",
            {
                "mission_id": "GHOSTCLAW-SAMPLE-QUEUE-TASK-001",
                "project_id": "ghostclaw-os",
                "task_type": "repo_or_architecture",
                "tier": "C",
                "priority": "high",
                "summary": "Sample project queue task.",
                "allowed_files": ["scripts/**"],
                "forbidden_files": [".env"],
                "constraints": ["Local file bus only"],
                "deliverables": ["Queue item"],
                "verification": ["Queue item exists"],
            },
        )

    def test_project_queue_dry_run_does_not_write_task_yaml(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self.seed_route_matrix(root)
            self.seed_inbox_task(root)
            coordinator.configure_root(str(root))

            report = coordinator.coordinate(dry_run=True, project_queue_mode="dry-run")

            dispatch = report["project_queue_dispatch"]
            self.assertEqual(dispatch["candidate_count"], 1)
            self.assertEqual(dispatch["written_count"], 0)
            self.assertEqual(dispatch["collision_count"], 0)
            self.assertFalse((root / ".ghostclaw_runtime/a2a2a/project_queues/ghostclaw_os").exists())

    def test_project_queue_write_creates_yaml_and_detects_collision(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self.seed_route_matrix(root)
            self.seed_inbox_task(root)
            coordinator.configure_root(str(root))

            report = coordinator.coordinate(dry_run=False, project_queue_mode="write")
            dispatch = report["project_queue_dispatch"]
            self.assertEqual(dispatch["written_count"], 1)
            destination = root / dispatch["written"][0]["destination_path"]
            self.assertTrue(destination.is_file())
            task_yaml = destination.read_text(encoding="utf-8")
            self.assertIn("mission_id: GHOSTCLAW-SAMPLE-QUEUE-TASK-001", task_yaml)
            self.assertIn("primary_agent: codex", task_yaml)
            self.assertIn("status: pending", task_yaml)

            second = coordinator.coordinate(dry_run=True, project_queue_mode="dry-run")
            self.assertEqual(second["project_queue_dispatch"]["collision_count"], 1)
            self.assertEqual(second["project_queue_dispatch"]["written_count"], 0)

    def test_project_queue_only_write_skips_legacy_worker_and_gate_writes(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self.seed_route_matrix(root)
            self.seed_inbox_task(root)
            coordinator.configure_root(str(root))

            report = coordinator.project_queue_only_report("write")

            self.assertFalse(report["legacy_queue_dispatch"])
            self.assertEqual(report["worker_packets_written"], 0)
            self.assertEqual(report["gate_records_written"], 0)
            self.assertEqual(report["project_queue_dispatch"]["written_count"], 1)


if __name__ == "__main__":
    unittest.main()
