"""Local notification queue and digest helpers.

These helpers never send live Telegram messages. Delivery adapters must be wired
behind a separate approval gate.
"""

from __future__ import annotations

import sqlite3
import uuid

from .leases import now_iso


URGENT_EVENTS = {
    "gate.waiting",
    "spec.blocked",
    "task.stalled",
    "budget.exceeded",
    "evidence.chain_broken",
}


def enqueue_notification(
    conn: sqlite3.Connection,
    spec: dict,
    severity: str,
    event_type: str,
    message: str,
    *,
    urgent: bool = False,
) -> str:
    urgent = urgent or event_type in URGENT_EVENTS
    notification_id = str(uuid.uuid4())
    with conn:
        conn.execute(
            """
            INSERT INTO notification_events (
              notification_id, spec_id, severity, event_type, message,
              urgent, delivered, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, 0, ?)
            """,
            (
                notification_id,
                spec.get("spec_id"),
                severity,
                event_type,
                message,
                1 if urgent else 0,
                now_iso(),
            ),
        )
    return notification_id


def flush_notification_digest(conn: sqlite3.Connection, max_age_minutes: int = 15) -> str | None:
    rows = conn.execute(
        """
        SELECT *
        FROM notification_events
        WHERE delivered = 0 AND urgent = 0
          AND created_at <= datetime('now', ?)
        ORDER BY created_at ASC
        """,
        (f"-{max_age_minutes} minutes",),
    ).fetchall()

    if not rows:
        return None

    digest = "\n".join(f"- {row['event_type']}: {row['message']}" for row in rows)
    delivered_at = now_iso()
    with conn:
        conn.executemany(
            "UPDATE notification_events SET delivered = 1, delivered_at = ? WHERE notification_id = ?",
            [(delivered_at, row["notification_id"]) for row in rows],
        )
    return "GHOSTCLAW digest\n" + digest

