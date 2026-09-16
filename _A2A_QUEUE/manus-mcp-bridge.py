#!/usr/bin/env python3
"""
Manus.ai ↔ A2A ↔ LINE OA MCP Bridge Server.

Implements the Model Context Protocol (MCP) over HTTP for Manus.ai to connect.
Routes LINE OA tool calls through the SIRINX A2A queue for audit, approval,
and policy enforcement.

Architecture:
  Manus.ai → [HTTP MCP] → manus-mcp-bridge.py → A2A Queue → a2a-bridge.py → LINE OA MCP
                                                                                  ↓
                                                                           LINE Messaging API

Auto-approval mode: When SIRINX_MCP_AUTO_APPROVE=true, MCP tool calls bypass
human approval gates (but are still logged).

Safety:
  - No secrets logged
  - No broadcast/push allowed by default
  - MCP allowlist-only mode enforced
  - Every call produces a receipt packet in _A2A_QUEUE/
"""

from __future__ import annotations

import json
import logging
import os
import signal
import sys
import time
import uuid
from datetime import datetime, timezone
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from typing import Any

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("manus-mcp-bridge")

QUEUE_ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = QUEUE_ROOT.parent

# ── Configuration ──────────────────────────────────────────────────────────────
MCP_HOST = os.environ.get("SIRINX_MCP_HOST", "127.0.0.1")
MCP_PORT = int(os.environ.get("SIRINX_MCP_PORT", "8788"))
AUTO_APPROVE = os.environ.get("SIRINX_MCP_AUTO_APPROVE", "false").lower() in ("1", "true", "yes")
LINE_MODE = os.environ.get("SIRINX_LINE_MODE", "dry-run")  # "dry-run" | "live" | "disabled"
DRY_RUN = LINE_MODE != "live"

if MCP_HOST not in {"127.0.0.1", "localhost", "::1"}:
    raise RuntimeError("Refusing to expose the Manus MCP bridge outside loopback")

# ── MCP Protocol Helpers ──────────────────────────────────────────────────────

def jsonrpc_error(code: int, message: str, id_val: Any = None) -> dict:
    return {
        "jsonrpc": "2.0",
        "error": {"code": code, "message": message},
        "id": id_val,
    }


def jsonrpc_result(result: Any, id_val: Any = None) -> dict:
    return {
        "jsonrpc": "2.0",
        "result": result,
        "id": id_val,
    }


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def stable_hash(value: dict[str, Any]) -> str:
    import hashlib
    payload = json.dumps(value, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(payload).hexdigest()


# ── Tool Definitions ──────────────────────────────────────────────────────────
# These are the MCP tools exposed to Manus.ai

MCP_TOOLS: list[dict[str, Any]] = [
    {
        "name": "line_send_message",
        "description": "Validate a draft LINE message. Live sending is blocked by default.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "userId": {
                    "type": "string",
                    "description": "LINE user ID to send the message to. Required unless DESTINATION_USER_ID is set.",
                },
                "message": {
                    "type": "string",
                    "description": "Text message content to send (max 2000 chars).",
                },
            },
            "required": ["message"],
        },
    },
    {
        "name": "line_get_profile",
        "description": "Validate a LINE profile lookup request in dry-run mode.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "userId": {
                    "type": "string",
                    "description": "LINE user ID to look up.",
                },
            },
            "required": ["userId"],
        },
    },
    {
        "name": "line_get_user_id",
        "description": "Report whether a default destination is configured without exposing it.",
        "inputSchema": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "bridge_health",
        "description": "Check the health and status of the MCP bridge itself.",
        "inputSchema": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "bridge_status",
        "description": "Get bridge configuration status without secrets.",
        "inputSchema": {
            "type": "object",
            "properties": {},
        },
    },
]

# ── Policy Enforcement ────────────────────────────────────────────────────────

LINE_SEND_BLOCKED = bool(os.environ.get("SIRINX_LINE_SEND_BLOCKED", "true").lower() in ("1", "true"))
LINE_BROADCAST_BLOCKED = True  # Always blocked by policy
LINE_TOOLS_BLOCKED: set[str] = {
    "line_broadcast",
    "line_push",
    "line_multicast",
    "line_narrowcast",
}

FORBIDDEN_ARGS_PATTERNS: list[str] = [
    "CHANNEL_ACCESS_TOKEN",
    "channelAccessToken",
    "channel_secret",
    "LINE_CHANNEL_SECRET",
]

ALLOWED_LINE_USER_PREFIXES: list[str] = [
    "U",       # Real LINE user IDs start with U
    "u",
]


def validate_line_args(args: dict[str, Any]) -> list[str]:
    """Validate tool arguments against policy. Returns list of violations."""
    violations: list[str] = []

    # Check for secrets in args
    args_str = json.dumps(args)
    for pattern in FORBIDDEN_ARGS_PATTERNS:
        if pattern.lower() in args_str.lower():
            violations.append(f"forbidden_arg_pattern:{pattern}")

    # Check destination for send
    if "userId" in args:
        uid = str(args["userId"])
        if not any(uid.startswith(p) for p in ALLOWED_LINE_USER_PREFIXES):
            violations.append(f"suspicious_user_id_prefix:{uid[:4]}")

    return violations


def build_receipt(
    tool_name: str,
    args: dict[str, Any],
    status: str,
    reason: str,
) -> dict[str, Any]:
    """Build an A2A-style receipt for audit."""
    receipt_id = f"mcp-{uuid.uuid4().hex[:12]}"
    return {
        "schema": "manus-mcp-bridge.receipt.v1",
        "receipt_id": receipt_id,
        "tool_name": tool_name,
        "args_keys": list(args.keys()),
        "args_redacted": {k: "<redacted>" for k in args},
        "line_mode": LINE_MODE,
        "auto_approved": AUTO_APPROVE,
        "dry_run": DRY_RUN,
        "decision_status": status,
        "reason": reason,
        "timestamp": now_iso(),
        "checksums": {
            "receipt_hash": stable_hash({"receipt_id": receipt_id, "tool_name": tool_name, "timestamp": now_iso()}),
        },
    }

# ── A2A Queue Integration ─────────────────────────────────────────────────────

def write_a2a_packet(tool_name: str, args: dict[str, Any], receipt: dict[str, Any]) -> str:
    """Write an A2A packet to the inbox for the a2a-bridge to process."""
    packet_id = f"mcp_{tool_name}_{uuid.uuid4().hex[:8]}"
    packet = {
        "id": packet_id,
        "schema": "a2a-bridge.packet.v1",
        "correlation_id": receipt["receipt_id"],
        "mission_id": f"mcp-{tool_name}",
        "from": {
            "agent": "manus-agent",
            "role": "external_mcp_client",
        },
        "to": {
            "agent": tool_name.replace("line_", "line-operator-"),
            "role": "mcp_operator",
        },
        "action_requested": tool_name,
        "context": {
            "goal": f"MCP tool call: {tool_name}",
            "args_redacted": receipt["args_redacted"],
            "mode": LINE_MODE,
            "dry_run": DRY_RUN,
            "auto_approved": AUTO_APPROVE,
        },
        "human_approval_required": not AUTO_APPROVE and tool_name in ("line_send_message",),
        "timestamp": now_iso(),
        "status": "ROUTED",
        "receipt": receipt,
    }
    # Always write to inbox for audit trail
    outbox = QUEUE_ROOT / "inbox"
    outbox.mkdir(parents=True, exist_ok=True)
    out_path = outbox / f"{packet_id}.json"
    out_path.write_text(json.dumps(packet, indent=2, ensure_ascii=False) + "\n")
    log.info("A2A packet written: %s", out_path.name)
    return packet_id


# ── LINE Tool Handlers (Simulated/Dry-run) ────────────────────────────────────

def handle_line_send_message(args: dict[str, Any]) -> dict[str, Any]:
    """Handle line_send_message tool call."""
    violations = validate_line_args(args)
    if violations:
        return {"status": "blocked", "violations": violations, "detail": "Policy violations detected"}

    message = args.get("message", "")
    user_id = args.get("userId", os.environ.get("DESTINATION_USER_ID", ""))

    if not user_id:
        return {"status": "error", "reason": "No userId provided and DESTINATION_USER_ID is not set"}

    if len(message) > 2000:
        return {"status": "error", "reason": "Message exceeds 2000 character limit"}

    if LINE_SEND_BLOCKED:
        receipt = build_receipt("line_send_message", args, "blocked", "SIRINX_LINE_SEND_BLOCKED=true")
        write_a2a_packet("line_send_message", args, receipt)
        return {
            "status": "blocked",
            "reason": "LINE send is blocked by policy",
            "dry_run": True,
            "receipt_id": receipt["receipt_id"],
        }

    receipt = build_receipt(
        "line_send_message",
        args,
        "simulated" if DRY_RUN else "blocked",
        "dry-run only" if DRY_RUN else "live connector unavailable",
    )
    write_a2a_packet("line_send_message", args, receipt)

    if DRY_RUN:
        return {
            "status": "simulated",
            "detail": "DRY-RUN: Message was validated but not sent",
            "message_length": len(message),
            "target_present": bool(user_id),
            "line_mode": LINE_MODE,
            "receipt_id": receipt["receipt_id"],
            "auto_approved": AUTO_APPROVE,
        }

    # The live connector is intentionally not implemented in this bridge.
    return {
        "status": "blocked",
        "reason": "Live LINE connector requires a separately approved implementation",
        "receipt_id": receipt["receipt_id"],
    }


def handle_line_get_profile(args: dict[str, Any]) -> dict[str, Any]:
    """Handle line_get_profile tool call."""
    user_id = args.get("userId", "")
    if not user_id:
        return {"status": "error", "reason": "No userId provided"}

    receipt = build_receipt(
        "line_get_profile",
        args,
        "simulated" if DRY_RUN else "blocked",
        "dry-run only" if DRY_RUN else "live connector unavailable",
    )
    write_a2a_packet("line_get_profile", args, receipt)

    if DRY_RUN:
        return {
            "status": "simulated",
            "detail": "DRY-RUN: Profile lookup was validated but not performed",
            "target_present": bool(user_id),
            "line_mode": LINE_MODE,
            "receipt_id": receipt["receipt_id"],
        }

    return {
        "status": "blocked",
        "reason": "Live LINE profile lookup requires separate approval",
        "receipt_id": receipt["receipt_id"],
    }


def handle_line_get_user_id(_args: dict[str, Any]) -> dict[str, Any]:
    """Handle line_get_user_id tool call."""
    dest_id = os.environ.get("DESTINATION_USER_ID", "")
    if not dest_id:
        return {"status": "error", "reason": "DESTINATION_USER_ID is not set"}
    return {
        "status": "available",
        "configured": True,
    }


def handle_bridge_health(_args: dict[str, Any]) -> dict[str, Any]:
    """Handle bridge_health tool call."""
    return {
        "status": "ok",
        "version": "1.0.0",
        "uptime_seconds": int(time.time() - _start_time) if _start_time else 0,
        "line_mode": LINE_MODE,
        "dry_run": DRY_RUN,
        "auto_approve": AUTO_APPROVE,
        "send_blocked": LINE_SEND_BLOCKED,
    }


def handle_bridge_status(_args: dict[str, Any]) -> dict[str, Any]:
    """Handle bridge_status tool call - no secrets exposed."""
    return {
        "status": "ok",
        "line_mode": LINE_MODE,
        "dry_run": DRY_RUN,
        "auto_approve": AUTO_APPROVE,
        "send_blocked": LINE_SEND_BLOCKED,
        "broadcast_blocked": LINE_BROADCAST_BLOCKED,
        "tools_available": [t["name"] for t in MCP_TOOLS],
        "queue_available": QUEUE_ROOT.exists(),
    }


# ── Tool Router ───────────────────────────────────────────────────────────────

TOOL_HANDLERS: dict[str, Any] = {
    "line_send_message": handle_line_send_message,
    "line_get_profile": handle_line_get_profile,
    "line_get_user_id": handle_line_get_user_id,
    "bridge_health": handle_bridge_health,
    "bridge_status": handle_bridge_status,
}


def handle_tool_call(name: str, args: dict[str, Any]) -> dict[str, Any]:
    """Route a tool call to its handler."""
    handler = TOOL_HANDLERS.get(name)
    if not handler:
        return {"status": "error", "reason": f"Unknown tool: {name}"}
    try:
        return handler(args)
    except Exception as e:
        log.error("Tool call failed: %s: %s", name, e)
        return {"status": "error", "reason": "Tool call failed; inspect local bridge logs"}


# ── MCP Request Handler (JSON-RPC 2.0 over HTTP) ─────────────────────────────

_start_time: float = 0.0


class MCPRequestHandler(BaseHTTPRequestHandler):
    """HTTP handler implementing the MCP protocol for Manus.ai."""

    def log_message(self, format: str, *args: Any) -> None:
        log.info("MCP HTTP: %s - %s", self.client_address[0], format % args)

    def _send_json(self, data: dict[str, Any], status: int = 200) -> None:
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def _parse_body(self) -> dict[str, Any] | None:
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length == 0:
            return None
        raw = self.rfile.read(content_length)
        try:
            return json.loads(raw)
        except json.JSONDecodeError as e:
            log.warning("Invalid JSON body: %s", e)
            return None

    def do_OPTIONS(self) -> None:  # noqa: N802
        """CORS pre-flight."""
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        """GET /health or /tools"""
        if self.path == "/health":
            self._send_json({"status": "ok", "service": "manus-mcp-bridge"})
        elif self.path == "/tools":
            self._send_json({"tools": MCP_TOOLS})
        else:
            self._send_json(jsonrpc_error(-32000, f"Not found: {self.path}"), 404)

    def do_POST(self) -> None:  # noqa: N802
        """POST /mcp — main MCP endpoint."""
        if self.path != "/mcp":
            self._send_json(jsonrpc_error(-32000, f"Not found: {self.path}"), 404)
            return

        body = self._parse_body()
        if body is None:
            self._send_json(jsonrpc_error(-32700, "Parse error"), 400)
            return

        req_id = body.get("id")

        # MCP Initialize
        if body.get("method") == "initialize":
            self._send_json(jsonrpc_result({
                "protocolVersion": "2025-03-26",
                "capabilities": {
                    "tools": {},
                    "resources": {},
                },
                "serverInfo": {
                    "name": "sirinx-manus-mcp-bridge",
                    "version": "1.0.0",
                },
            }, req_id))
            return

        # MCP List Tools
        if body.get("method") == "tools/list":
            self._send_json(jsonrpc_result({
                "tools": MCP_TOOLS,
            }, req_id))
            return

        # MCP Call Tool
        if body.get("method") == "tools/call":
            params = body.get("params", {})
            tool_name = params.get("name", "")
            tool_args = params.get("arguments", {})
            log.info("Tool call: %s | arg_keys=%s", tool_name, sorted(tool_args))

            result = handle_tool_call(tool_name, tool_args)
            self._send_json(jsonrpc_result({
                "content": [
                    {
                        "type": "text",
                        "text": json.dumps(result, indent=2, ensure_ascii=False),
                    }
                ],
                "isError": result.get("status") == "error",
            }, req_id))
            return

        # Unknown method
        self._send_json(jsonrpc_error(-32601, f"Method not found: {body.get('method')}", req_id))


def run_server() -> None:
    """Start the MCP HTTP server."""
    server = HTTPServer((MCP_HOST, MCP_PORT), MCPRequestHandler)
    log.info("=" * 60)
    log.info("Manus.ai ↔ LINE OA MCP Bridge")
    log.info("=" * 60)
    log.info("Server:     http://%s:%d/mcp", MCP_HOST, MCP_PORT)
    log.info("Health:     http://%s:%d/health", MCP_HOST, MCP_PORT)
    log.info("Tools:      http://%s:%d/tools", MCP_HOST, MCP_PORT)
    log.info("LINE Mode:  %s", LINE_MODE)
    log.info("Dry Run:    %s", DRY_RUN)
    log.info("Auto-App:   %s", AUTO_APPROVE)
    log.info("Queue Root: %s", QUEUE_ROOT)
    log.info("-" * 60)
    log.info("Available tools:")
    for tool in MCP_TOOLS:
        log.info("  - %s: %s", tool["name"], tool["description"])
    log.info("=" * 60)
    log.info("To register with Manus.ai, use the Server URL:")
    log.info("  http://%s:%d/mcp", MCP_HOST, MCP_PORT)
    log.info("")

    def shutdown_handler(signum: int, _frame: Any) -> None:
        log.info("Shutdown signal received (%s)", signum)
        sys.exit(0)

    signal.signal(signal.SIGTERM, shutdown_handler)
    signal.signal(signal.SIGINT, shutdown_handler)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        log.info("Server stopped by user")
        server.server_close()


def main() -> int:
    global _start_time
    _start_time = time.time()
    run_server()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
