import sqlite3
import unittest
from pathlib import Path

from hermes.autoloop.leases import active_lease_for_spec, grant_lease, release_lease


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
        ("PTEST", "MTEST", "test spec", "IMPLEMENT", "PAUSED_AT_GATE"),
    )
    conn.execute(
        """
        INSERT INTO spec_queue (
          spec_id, mission_id, title, current_state, status,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        """,
        ("PTEST2", "MTEST", "test spec 2", "IMPLEMENT", "PAUSED_AT_GATE"),
    )
    conn.commit()
    return conn


class LeaseConflictsTest(unittest.TestCase):
    def test_grant_active_lease_and_read_policy_shape(self):
        conn = make_conn()
        lease_id = grant_lease(
            conn,
            spec_id="PTEST",
            gate_id=None,
            approved_by="human",
            paths=["src/allowed"],
            ttl_minutes=60,
        )
        self.assertTrue(lease_id)
        lease = active_lease_for_spec(conn, "PTEST")
        self.assertEqual(lease["status"], "ACTIVE")
        self.assertEqual(lease["paths"], ["src/allowed"])
        self.assertFalse(lease["expired"])

    def test_overlapping_active_lease_is_rejected(self):
        conn = make_conn()
        grant_lease(
            conn,
            spec_id="PTEST",
            gate_id=None,
            approved_by="human",
            paths=["src/allowed"],
            ttl_minutes=60,
        )
        with self.assertRaises(sqlite3.IntegrityError):
            grant_lease(
                conn,
                spec_id="PTEST2",
                gate_id=None,
                approved_by="human",
                paths=["src/allowed/deeper"],
                ttl_minutes=60,
            )

    def test_released_lease_no_longer_blocks_new_lease(self):
        conn = make_conn()
        grant_lease(
            conn,
            spec_id="PTEST",
            gate_id=None,
            approved_by="human",
            paths=["src/allowed"],
            ttl_minutes=60,
        )
        release_lease(conn, spec_id="PTEST", reason="test_done")
        lease_id = grant_lease(
            conn,
            spec_id="PTEST2",
            gate_id=None,
            approved_by="human",
            paths=["src/allowed/deeper"],
            ttl_minutes=60,
        )
        self.assertTrue(lease_id)


if __name__ == "__main__":
    unittest.main()

