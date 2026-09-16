import sqlite3
import unittest
from pathlib import Path

from hermes.autoloop.evidence_chain import verify_evidence_chain, write_evidence
from hermes.autoloop.middleware import PolicyError


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
        ("PEVIDENCE", "MTEST", "evidence spec", "VALIDATE", "RUNNING"),
    )
    conn.commit()
    return conn


class EvidenceChainTest(unittest.TestCase):
    def test_hash_chain_verifies_after_appends(self):
        conn = make_conn()
        spec = {"spec_id": "PEVIDENCE"}
        head_1 = write_evidence(conn, spec, "VALIDATE", "test.started", "started", "PASS")
        head_2 = write_evidence(conn, spec, "VALIDATE", "test.done", "done", "PASS")
        self.assertNotEqual(head_1, head_2)
        self.assertTrue(verify_evidence_chain(conn))
        row = conn.execute("SELECT evidence_head_hash FROM spec_queue WHERE spec_id = ?", ("PEVIDENCE",)).fetchone()
        self.assertEqual(row["evidence_head_hash"], head_2)

    def test_tampered_evidence_is_blocked(self):
        conn = make_conn()
        spec = {"spec_id": "PEVIDENCE"}
        write_evidence(conn, spec, "VALIDATE", "test.done", "done", "PASS")
        conn.execute("UPDATE evidence_events SET summary = 'tampered'")
        conn.commit()
        with self.assertRaisesRegex(PolicyError, "evidence_chain_broken"):
            verify_evidence_chain(conn)


if __name__ == "__main__":
    unittest.main()

