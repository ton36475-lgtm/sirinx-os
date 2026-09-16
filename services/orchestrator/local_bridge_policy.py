"""Pure local policy helpers for the Phase 5C bridge preview."""

from __future__ import annotations

from hashlib import sha256
import hmac
import re
from typing import Any


ALLOWED_ACTIONS = frozenset({"status", "inspect", "abort_preview", "validate"})
ALLOWED_TARGETS = frozenset(
    {"claude-worker", "opencode-worker", "codex-worker", "master-loop"}
)
MIN_TTL_MS = 1_000
MAX_TTL_MS = 300_000
MAX_CONTEXT_BYTES = 65_536
_IDENTIFIER = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$")


class BridgePolicyError(ValueError):
    """Raised when an execution preview violates the local bridge contract."""


def validate_identifier(value: str, field: str) -> str:
    normalized = value.strip()
    if not _IDENTIFIER.fullmatch(normalized):
        raise BridgePolicyError(f"invalid {field}")
    return normalized


def verify_bridge_token(provided: str, expected: str | None) -> bool:
    """Compare a supplied token without permitting a hard-coded fallback."""

    if not expected or not provided:
        return False
    return hmac.compare_digest(provided.encode("utf-8"), expected.encode("utf-8"))


def build_dispatch_preview(
    *,
    action: str,
    assigned_target: str,
    correlation_id: str,
    ttl_ms: int,
    context_snapshot: str | None = None,
) -> dict[str, Any]:
    """Build a non-executing packet from allow-listed identifiers."""

    normalized_action = action.strip().lower()
    if normalized_action not in ALLOWED_ACTIONS:
        raise BridgePolicyError("action is not allow-listed")
    if assigned_target not in ALLOWED_TARGETS:
        raise BridgePolicyError("target is not allow-listed")
    normalized_correlation_id = validate_identifier(correlation_id, "correlation_id")
    if not isinstance(ttl_ms, int) or not MIN_TTL_MS <= ttl_ms <= MAX_TTL_MS:
        raise BridgePolicyError("ttl_ms is outside the supported range")

    context_digest = None
    context_bytes = 0
    if context_snapshot is not None:
        encoded = context_snapshot.encode("utf-8")
        context_bytes = len(encoded)
        if context_bytes > MAX_CONTEXT_BYTES:
            raise BridgePolicyError("context_snapshot is too large")
        context_digest = sha256(encoded).hexdigest()

    return {
        "schema": "sirinx.local-bridge.preview.v1",
        "status": "DRY_RUN",
        "correlation_id": normalized_correlation_id,
        "action": normalized_action,
        "assigned_target": assigned_target,
        "ttl_ms": ttl_ms,
        "context": {
            "sha256": context_digest,
            "size_bytes": context_bytes,
            "persisted": False,
        },
        "execution": {
            "allowed": False,
            "reason": "phase_5c_preview_only",
        },
    }
