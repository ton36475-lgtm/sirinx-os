"""Hash-chained evidence receipts for Autoloop V2."""

from __future__ import annotations

import hashlib
import json
import sqlite3
import uuid

from .leases import now_iso
from .middleware import PolicyError


def canonical_json(payload: dict) -> str:
    return json.dumps(payload, ensure_ascii=True, sort_keys=True, separators=(",", ":"))


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def write_evidence(
    conn: sqlite3.Connection,
    spec: dict,
    state: str,
    event_type: str,
    summary: str,
    verdict: str,
    *,
    artifact_path: str | None = None,
    artifact_hash: str | None = None,
) -> str:
    prev = conn.execute(
        """
        SELECT chain_hash
        FROM evidence_events
        WHERE spec_id = ?
        ORDER BY created_at DESC, evidence_id DESC
        LIMIT 1
        """,
        (spec["spec_id"],),
    ).fetchone()

    prev_chain_hash = prev["chain_hash"] if prev else "GENESIS"
    evidence_id = str(uuid.uuid4())
    created_at = now_iso()
    event_payload = {
        "evidence_id": evidence_id,
        "spec_id": spec["spec_id"],
        "state": state,
        "event_type": event_type,
        "summary": summary,
        "artifact_path": artifact_path,
        "artifact_hash": artifact_hash,
        "verdict": verdict,
        "created_at": created_at,
    }
    event_hash = sha256_text(canonical_json(event_payload))
    chain_hash = sha256_text(prev_chain_hash + ":" + event_hash)

    with conn:
        conn.execute(
            """
            INSERT INTO evidence_events (
              evidence_id, spec_id, state, event_type, summary,
              artifact_path, artifact_hash, verdict,
              prev_chain_hash, event_hash, chain_hash, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                evidence_id,
                spec["spec_id"],
                state,
                event_type,
                summary,
                artifact_path,
                artifact_hash,
                verdict,
                prev_chain_hash,
                event_hash,
                chain_hash,
                created_at,
            ),
        )
        conn.execute(
            "UPDATE spec_queue SET evidence_head_hash = ?, updated_at = ? WHERE spec_id = ?",
            (chain_hash, created_at, spec["spec_id"]),
        )

    return chain_hash


def verify_evidence_chain(conn: sqlite3.Connection) -> bool:
    specs = conn.execute("SELECT spec_id FROM spec_queue").fetchall()
    for spec in specs:
        prev_chain_hash = "GENESIS"
        rows = conn.execute(
            """
            SELECT *
            FROM evidence_events
            WHERE spec_id = ?
            ORDER BY created_at ASC, evidence_id ASC
            """,
            (spec["spec_id"],),
        ).fetchall()

        for row in rows:
            event_payload = {
                "evidence_id": row["evidence_id"],
                "spec_id": row["spec_id"],
                "state": row["state"],
                "event_type": row["event_type"],
                "summary": row["summary"],
                "artifact_path": row["artifact_path"],
                "artifact_hash": row["artifact_hash"],
                "verdict": row["verdict"],
                "created_at": row["created_at"],
            }
            expected_event_hash = sha256_text(canonical_json(event_payload))
            expected_chain_hash = sha256_text(prev_chain_hash + ":" + expected_event_hash)

            if row["event_hash"] != expected_event_hash or row["chain_hash"] != expected_chain_hash:
                raise PolicyError(f"evidence_chain_broken:{row['evidence_id']}")

            prev_chain_hash = row["chain_hash"]

    return True

