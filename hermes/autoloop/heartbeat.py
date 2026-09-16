"""Heartbeat and stall detection helpers for supervised Autoloop tasks."""

from __future__ import annotations

import sqlite3
import threading
from datetime import datetime, timezone
from typing import Callable

from .leases import now_iso, release_lease
from .notifications import enqueue_notification


def heartbeat_loop(
    conn_factory: Callable[[], sqlite3.Connection],
    run_id: str,
    stop_event: threading.Event,
    *,
    interval: int = 30,
) -> None:
    while not stop_event.wait(interval):
        conn = conn_factory()
        try:
            with conn:
                conn.execute(
                    "UPDATE agent_log SET last_heartbeat_at = ? WHERE run_id = ?",
                    (now_iso(), run_id),
                )
        finally:
            conn.close()


def sweep_stalled_tasks(conn: sqlite3.Connection, *, current_time: datetime | None = None) -> list[str]:
    rows = conn.execute(
        """
        SELECT run_id, task_id, spec_id, last_heartbeat_at, timeout_seconds
        FROM agent_log
        WHERE status = 'RUNNING'
        """
    ).fetchall()

    current = current_time or datetime.now(timezone.utc)
    stalled: list[str] = []
    for row in rows:
        last = datetime.fromisoformat(row["last_heartbeat_at"])
        if (current - last).total_seconds() <= row["timeout_seconds"]:
            continue

        with conn:
            conn.execute(
                "UPDATE agent_log SET status = 'STALLED', ended_at = ? WHERE run_id = ?",
                (now_iso(), row["run_id"]),
            )
            conn.execute(
                "UPDATE a2a_tasks SET status = 'STALLED' WHERE task_id = ?",
                (row["task_id"],),
            )
            conn.execute(
                """
                UPDATE spec_queue
                SET status = 'PAUSED_AT_GATE',
                    blocked_reason = 'stalled_task_human_review',
                    updated_at = ?
                WHERE spec_id = ?
                """,
                (now_iso(), row["spec_id"]),
            )

        release_lease(conn, spec_id=row["spec_id"], reason="stalled_task")
        enqueue_notification(
            conn,
            {"spec_id": row["spec_id"]},
            "URGENT",
            "task.stalled",
            "No heartbeat; human review required",
            urgent=True,
        )
        stalled.append(row["run_id"])

    return stalled

