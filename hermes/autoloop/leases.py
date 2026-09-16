"""SQLite-backed file lease helpers for Autoloop V2."""

from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime, timedelta, timezone
from typing import Iterable

from .middleware import normalize_rel_path


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _normalized_paths(paths: Iterable[str]) -> list[str]:
    normalized = sorted({normalize_rel_path(path) for path in paths})
    if not normalized:
        raise ValueError("lease requires at least one path")
    return normalized


def grant_lease(
    conn: sqlite3.Connection,
    *,
    spec_id: str,
    gate_id: str | None,
    approved_by: str,
    paths: Iterable[str],
    ttl_minutes: int = 60,
) -> str:
    """Grant a non-overlapping active lease inside a SQLite transaction."""

    lease_id = str(uuid.uuid4())
    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=ttl_minutes)).isoformat()
    normalized_paths = _normalized_paths(paths)

    conn.execute("BEGIN IMMEDIATE")
    try:
        conn.execute(
            """
            INSERT INTO file_leases (
              lease_id, spec_id, gate_id, approved_by, approved_at, expires_at,
              paths_json, action_scope, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
            """,
            (
                lease_id,
                spec_id,
                gate_id,
                approved_by,
                now_iso(),
                expires_at,
                json.dumps(normalized_paths),
                "write_leased_paths",
            ),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise

    return lease_id


def release_lease(conn: sqlite3.Connection, *, spec_id: str, reason: str) -> None:
    with conn:
        conn.execute(
            """
            UPDATE file_leases
            SET status = 'RELEASED', released_at = ?, reason = ?
            WHERE spec_id = ? AND status = 'ACTIVE'
            """,
            (now_iso(), reason, spec_id),
        )


def sweep_expired_leases(conn: sqlite3.Connection) -> int:
    with conn:
        cursor = conn.execute(
            """
            UPDATE file_leases
            SET status = 'EXPIRED', reason = 'ttl_expired'
            WHERE status = 'ACTIVE' AND expires_at <= ?
            """,
            (now_iso(),),
        )
    return cursor.rowcount


def active_lease_for_spec(conn: sqlite3.Connection, spec_id: str) -> dict | None:
    row = conn.execute(
        """
        SELECT *
        FROM file_leases
        WHERE spec_id = ? AND status = 'ACTIVE'
        ORDER BY approved_at DESC
        LIMIT 1
        """,
        (spec_id,),
    ).fetchone()
    if row is None:
        return None

    expires_at = datetime.fromisoformat(row["expires_at"])
    return {
        "lease_id": row["lease_id"],
        "status": row["status"],
        "expired": expires_at <= datetime.now(timezone.utc),
        "paths": json.loads(row["paths_json"]),
    }

