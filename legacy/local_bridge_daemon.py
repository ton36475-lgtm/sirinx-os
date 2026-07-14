#!/usr/bin/env python3
"""SIRINX Phase 5C local bridge preview API.

The preparation lane never dispatches shell commands, writes project context,
or opens a public listener. A later execution lane must provide a separate,
reviewed command broker contract.
"""

from __future__ import annotations

import os
from typing import Literal

from fastapi import FastAPI, HTTPException, Security
from fastapi.security import APIKeyHeader
from pydantic import BaseModel

from local_bridge_policy import (
    BridgePolicyError,
    build_dispatch_preview,
    verify_bridge_token,
)


app = FastAPI(
    title="SIRINX OS Local Bridge Preview",
    version="2.6.1",
    docs_url="/docs",
    redoc_url=None,
)
api_key_header = APIKeyHeader(name="X-Sirinx-Auth-Token", auto_error=False)


class TaskPayload(BaseModel):
    """Structured preview input; arbitrary shell text is intentionally absent."""

    action: Literal["status", "inspect", "abort_preview", "validate"]
    correlation_id: str
    assigned_target: Literal[
        "claude-worker", "opencode-worker", "codex-worker", "master-loop"
    ] = "master-loop"
    context_snapshot: str | None = None
    ttl_ms: int = 30_000


class ExecutionPreview(BaseModel):
    """Response returned by the non-executing bridge."""

    schema_name: str
    status: str
    correlation_id: str
    action: str
    agent_directed: str
    context_sha256: str | None
    context_size_bytes: int
    execution_allowed: bool
    reason: str


def require_bridge_token(provided: str | None) -> None:
    expected = os.environ.get("SIRINX_BRIDGE_TOKEN")
    if not expected:
        raise HTTPException(status_code=503, detail="Bridge token is not configured.")
    if not provided or not verify_bridge_token(provided, expected):
        raise HTTPException(status_code=403, detail="Unauthorized bridge request.")


@app.post("/preview-task", response_model=ExecutionPreview)
async def preview_edge_task(
    payload: TaskPayload,
    auth_token: str | None = Security(api_key_header),
) -> ExecutionPreview:
    """Validate and normalize a task without executing or persisting it."""

    require_bridge_token(auth_token)
    try:
        preview = build_dispatch_preview(
            action=payload.action,
            assigned_target=payload.assigned_target,
            correlation_id=payload.correlation_id,
            ttl_ms=payload.ttl_ms,
            context_snapshot=payload.context_snapshot,
        )
    except BridgePolicyError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return ExecutionPreview(
        schema_name=preview["schema"],
        status=preview["status"],
        correlation_id=preview["correlation_id"],
        action=preview["action"],
        agent_directed=preview["assigned_target"],
        context_sha256=preview["context"]["sha256"],
        context_size_bytes=preview["context"]["size_bytes"],
        execution_allowed=preview["execution"]["allowed"],
        reason=preview["execution"]["reason"],
    )


@app.post("/execute-task")
async def execute_task_blocked() -> None:
    """Fail closed until an explicit execution broker lane is approved."""

    raise HTTPException(status_code=409, detail="Phase 5C is preview-only.")


@app.get("/health")
async def health_check() -> dict[str, object]:
    return {
        "status": "healthy",
        "service": "SIRINX Local Bridge Preview",
        "version": "2.6.1",
        "execution_enabled": False,
        "token_configured": bool(os.environ.get("SIRINX_BRIDGE_TOKEN")),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
