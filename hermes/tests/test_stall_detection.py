import sqlite3
import unittest
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

from hermes.autoloop.heartbeat import sweep_stalled_tasks
from hermes.autoloop.leases import grant_lease, now_iso


SCHEMA = Path(__file__).resolve().parents[1] / "db" / "schema_v2.sql"


def make_conn():
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.executescript(SCHEMA.read_text())
    conn.execute(
        """
        INSERT INTO spec_queue (
          spec_id, mission_id, title, current_state, status,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        """,
        ("PSTALL", "MTEST", "stall spec", "IMPLEMENT", "RUNNING"),
    )
    conn.commit()
    grant_lease(
        conn,
        spec_id="PSTALL",
        gate_id=None,
        approved_by="human",
        paths=["src/allowed"],
        ttl_minutes=60,
    )
    task_id = str(uuid.uuid4())
    run_id = str(uuid.uuid4())
    old_heartbeat = (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat()
    conn.execute(
        """
        INSERT INTO a2a_tasks (
          task_id, spec_id, from_agent, to_agent, state, action_requested,
          envelope_json, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'RUNNING', ?)
        """,
        (task_id, "PSTALL", "hermes", "codex", "IMPLEMENT", "write_leased_paths", "{}", now_iso()),
    )
    conn.execute(
        """
        INSERT INTO agent_log (
          run_id, task_id, spec_id, agent, agent_instance_id,
          started_at, last_heartbeat_at, timeout_seconds, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'RUNNING')
        """,
        (run_id, task_id, "PSTALL", "codex", "codex-1", now_iso(), old_heartbeat, 60),
    )
    conn.commit()
    return conn, run_id, task_id


class StallDetectionTest(unittest.TestCase):
    def test_stalled_task_pauses_spec_releases_lease_and_notifies(self):
        conn, run_id, task_id = make_conn()
        stalled = sweep_stalled_tasks(conn)
        self.assertEqual(stalled, [run_id])

        spec = conn.execute("SELECT * FROM spec_queue WHERE spec_id = 'PSTALL'").fetchone()
        task = conn.execute("SELECT * FROM a2a_tasks WHERE task_id = ?", (task_id,)).fetchone()
        lease = conn.execute("SELECT * FROM file_leases WHERE spec_id = 'PSTALL'").fetchone()
        note = conn.execute("SELECT * FROM notification_events WHERE event_type = 'task.stalled'").fetchone()

        self.assertEqual(spec["status"], "PAUSED_AT_GATE")
        self.assertEqual(spec["blocked_reason"], "stalled_task_human_review")
        self.assertEqual(task["status"], "STALLED")
        self.assertEqual(lease["status"], "RELEASED")
        self.assertEqual(note["urgent"], 1)


if __name__ == "__main__":
    unittest.main()

