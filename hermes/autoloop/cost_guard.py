"""Token and cost pre-dispatch guard for Autoloop V2."""

from __future__ import annotations

import sqlite3
import uuid

from .leases import now_iso
from .middleware import GateRequired
from .notifications import enqueue_notification


def check_budget_before_dispatch(conn: sqlite3.Connection, spec: dict) -> bool:
    project_id = spec["mission_id"]
    budget = conn.execute(
        "SELECT * FROM project_budget WHERE project_id = ?",
        (project_id,),
    ).fetchone()

    if budget is None:
        return True

    usage = conn.execute(
        """
        SELECT
          COALESCE(SUM(input_tokens + output_tokens), 0) AS tokens,
          COALESCE(SUM(estimated_cost_usd), 0) AS cost
        FROM agent_cost_log
        WHERE project_id = ?
          AND created_at >= datetime('now', '-1 day')
        """,
        (project_id,),
    ).fetchone()

    if usage["tokens"] >= budget["daily_token_limit"]:
        enqueue_notification(conn, spec, "URGENT", "budget.exceeded", "daily_token_budget_exceeded", urgent=True)
        raise GateRequired("daily_token_budget_exceeded")

    if usage["cost"] >= budget["daily_cost_limit_usd"]:
        enqueue_notification(conn, spec, "URGENT", "budget.exceeded", "daily_cost_budget_exceeded", urgent=True)
        raise GateRequired("daily_cost_budget_exceeded")

    return True


def record_agent_cost(
    conn: sqlite3.Connection,
    *,
    project_id: str,
    spec_id: str,
    task_id: str | None,
    agent: str,
    input_tokens: int,
    output_tokens: int,
    estimated_cost_usd: float,
) -> str:
    cost_id = str(uuid.uuid4())
    with conn:
        conn.execute(
            """
            INSERT INTO agent_cost_log (
              cost_id, project_id, spec_id, task_id, agent,
              input_tokens, output_tokens, estimated_cost_usd, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                cost_id,
                project_id,
                spec_id,
                task_id,
                agent,
                input_tokens,
                output_tokens,
                estimated_cost_usd,
                now_iso(),
            ),
        )
    return cost_id

