"""Telegram approval callback handlers for local governance state."""

from __future__ import annotations

import json
import sqlite3

from .leases import grant_lease, now_iso, release_lease


def advance_state(conn: sqlite3.Connection, spec_id: str, state: str) -> None:
    with conn:
        conn.execute(
            """
            UPDATE spec_queue
            SET current_state = ?, status = 'QUEUED', blocked_reason = NULL, updated_at = ?
            WHERE spec_id = ?
            """,
            (state, now_iso(), spec_id),
        )


def proposed_lease_paths(conn: sqlite3.Connection, spec_id: str) -> list[str]:
    row = conn.execute(
        """
        SELECT paths_json
        FROM proposed_file_leases
        WHERE spec_id = ?
        ORDER BY created_at DESC
        LIMIT 1
        """,
        (spec_id,),
    ).fetchone()
    if row is None:
        return []
    return json.loads(row["paths_json"])


def on_telegram_gate_callback(
    conn: sqlite3.Connection,
    *,
    gate_id: str,
    decision: str,
    decided_by: str,
    note: str | None = None,
) -> None:
    if decision not in {"APPROVED", "REJECTED"}:
        raise ValueError("invalid gate decision")

    gate = conn.execute("SELECT * FROM gate_approvals WHERE gate_id = ?", (gate_id,)).fetchone()
    if gate is None:
        raise ValueError(f"unknown gate_id:{gate_id}")

    spec = conn.execute("SELECT * FROM spec_queue WHERE spec_id = ?", (gate["spec_id"],)).fetchone()
    if spec is None:
        raise ValueError(f"unknown spec_id:{gate['spec_id']}")

    with conn:
        conn.execute(
            """
            UPDATE gate_approvals
            SET decision = ?, decided_by = ?, decision_note = ?, decided_at = ?
            WHERE gate_id = ?
            """,
            (decision, decided_by, note, now_iso(), gate_id),
        )

    if decision == "REJECTED":
        with conn:
            conn.execute(
                """
                UPDATE spec_queue
                SET status = 'BLOCKED', blocked_reason = ?, updated_at = ?
                WHERE spec_id = ?
                """,
                (f"gate_rejected:{gate['gate_type']}", now_iso(), spec["spec_id"]),
            )
        release_lease(conn, spec_id=spec["spec_id"], reason="gate_rejected")
        return

    if gate["gate_type"] == "FILE_LEASE_APPROVAL":
        paths = proposed_lease_paths(conn, spec["spec_id"])
        grant_lease(
            conn,
            spec_id=spec["spec_id"],
            gate_id=gate_id,
            approved_by=decided_by,
            paths=paths,
            ttl_minutes=60,
        )
        advance_state(conn, spec["spec_id"], "IMPLEMENT")
    elif gate["gate_type"] == "HUMAN_DECISION":
        advance_state(conn, spec["spec_id"], "COMMIT_LOCAL")

