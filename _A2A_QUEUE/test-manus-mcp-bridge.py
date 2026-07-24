#!/usr/bin/env python3
"""
Evidence Verifier: Test Suite for Manus.ai ↔ LINE OA MCP Bridge.
Runs local validation against the bridge implementation without starting the server.

Tests:
1. MCP tool definitions match expected shape
2. Tool handlers produce valid responses
3. A2A packet writing works
4. Policy validation catches violations
5. Receipt generation is correct
6. All 6 skills are present (progressive disclosure check)
"""

from __future__ import annotations

import importlib.util
import json
import os
import sys
import tempfile
import time
import uuid
from pathlib import Path
from typing import Any

# Make the test deterministic and fail-closed regardless of the caller's shell.
os.environ["SIRINX_MCP_AUTO_APPROVE"] = "false"
os.environ["SIRINX_LINE_MODE"] = "dry-run"
os.environ["SIRINX_LINE_SEND_BLOCKED"] = "true"
os.environ["SIRINX_MCP_HOST"] = "127.0.0.1"

# Load the bridge module (file has hyphens so can't use regular import)
_bridge_path = str(Path(__file__).resolve().parent / "manus-mcp-bridge.py")
_spec = importlib.util.spec_from_file_location("manus_mcp_bridge", _bridge_path)
_bridge = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_bridge)

_test_queue_tmp = tempfile.TemporaryDirectory(prefix="manus-mcp-test-")
_bridge.QUEUE_ROOT = Path(_test_queue_tmp.name)

MCP_TOOLS = _bridge.MCP_TOOLS
TOOL_HANDLERS = _bridge.TOOL_HANDLERS
build_receipt = _bridge.build_receipt
write_a2a_packet = _bridge.write_a2a_packet
validate_line_args = _bridge.validate_line_args
handle_line_send_message = _bridge.handle_line_send_message
handle_line_get_profile = _bridge.handle_line_get_profile
handle_line_get_user_id = _bridge.handle_line_get_user_id
handle_bridge_health = _bridge.handle_bridge_health
handle_bridge_status = _bridge.handle_bridge_status
handle_tool_call = _bridge.handle_tool_call

PASS = "✓ PASS"
FAIL = "✗ FAIL"
SKIP = "─ SKIP"

tests_run = 0
tests_passed = 0
tests_failed = 0


def test(name: str, condition: bool, detail: str = "") -> None:
    global tests_run, tests_passed, tests_failed
    tests_run += 1
    if condition:
        tests_passed += 1
        print(f"  {PASS} {name}")
    else:
        tests_failed += 1
        print(f"  {FAIL} {name}: {detail}")


def section(title: str) -> None:
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


# ── Test 1: Progressive Disclosure Check ─────────────────────────────────────

section("1. REPO-INTAKE-QUARANTINE: Progressive Disclosure Bundle Check")

required_skills = [
    "repo-intake-quarantine",
    "codebase-cartographer",
    "authorized-reverse-engineering",
    "system-design-architect",
    "senior-fullstack-builder",
    "evidence-verifier",
]

print("  Required skills in bundle:")
for skill in required_skills:
    print(f"    - {skill}")

# Verify this test file exists
test("evidence-verifier test exists", Path(__file__).exists(), "test-manus-mcp-bridge.py not found")

# Verify each implementation artifact exists
implementation_artifacts = [
    ("Manus MCP Bridge", "/Users/sirinx/sirinx-os/_A2A_QUEUE/manus-mcp-bridge.py"),
    ("Manus MCP Control Script", "/Users/sirinx/sirinx-os/_A2A_QUEUE/manus-mcp-bridge.sh"),
    ("Manus MCP Policy", "/Users/sirinx/sirinx-os/policy/manus-mcp-policy.yaml"),
    ("Manus MCP Config Template", "/Users/sirinx/sirinx-os/config/manus-mcp-config.json"),
    ("Manus Registration Script", "/Users/sirinx/sirinx-os/scripts/register-manus-mcp.sh"),
    ("A2A Message Types", "/Users/sirinx/sirinx-os/GHOSTCLAW/a2a-hermes-codex-bridge/a2a-message.ts"),
    ("MCP Allowlist", "/Users/sirinx/.config/thclaws/mcp_allowlist.json"),
    ("OpenCode Config", "/Users/sirinx/.config/opencode/opencode.json"),
    ("A2A Bridge", "/Users/sirinx/sirinx-os/_A2A_QUEUE/a2a-bridge.py"),
]

for name, path in implementation_artifacts:
    p = Path(path).expanduser()
    test(f"Implementation artifact: {name}", p.exists(), f"Missing: {path}")


# ── Test 2: MCP Tool Definitions ─────────────────────────────────────────────

section("2. CODEBASE-CARTOGRAPHER: MCP Tool Definition Validation")

test("MCP_TOOLS is a list", isinstance(MCP_TOOLS, list), f"Got {type(MCP_TOOLS)}")
test("MCP_TOOLS has 5 tools", len(MCP_TOOLS) == 5, f"Got {len(MCP_TOOLS)}")
test("MCP_TOOLS has no duplicates", len({t["name"] for t in MCP_TOOLS}) == len(MCP_TOOLS), "Duplicate names found")
test("MCP_TOOLS has line_send_message", any(t["name"] == "line_send_message" for t in MCP_TOOLS), "Missing line_send_message")
test("MCP_TOOLS has line_get_profile", any(t["name"] == "line_get_profile" for t in MCP_TOOLS), "Missing line_get_profile")
test("MCP_TOOLS has line_get_user_id", any(t["name"] == "line_get_user_id" for t in MCP_TOOLS), "Missing line_get_user_id")
test("MCP_TOOLS has bridge_health", any(t["name"] == "bridge_health" for t in MCP_TOOLS), "Missing bridge_health")
test("MCP_TOOLS has bridge_status", any(t["name"] == "bridge_status" for t in MCP_TOOLS), "Missing bridge_status")

# Validate each tool's schema
for tool in MCP_TOOLS:
    test(f"Tool '{tool['name']}' has name", "name" in tool, "Missing name")
    test(f"Tool '{tool['name']}' has description", "description" in tool, "Missing description")
    test(f"Tool '{tool['name']}' has inputSchema", "inputSchema" in tool, "Missing inputSchema")
    schema = tool["inputSchema"]
    test(f"Tool '{tool['name']}' schema has type object", schema.get("type") == "object", f"Got {schema.get('type')}")
    test(f"Tool '{tool['name']}' has properties or empty", "properties" in schema, "Missing properties")

# Verify each tool has a handler
for tool in MCP_TOOLS:
    test(f"Handler exists for '{tool['name']}'", tool["name"] in TOOL_HANDLERS, f"No handler registered")


# ── Test 3: Tool Handler Responses ────────────────────────────────────────────

section("3. AUTHORIZED-REVERSE-ENGINEERING: Tool Handler Response Validation")

# bridge_health
result = handle_bridge_health({})
test("bridge_health returns status ok", result.get("status") == "ok", str(result))
test("bridge_health has version", "version" in result, str(result))
test("bridge_health reports auto-approve disabled", result.get("auto_approve") is False, str(result))
test("bridge_health reports sends blocked", result.get("send_blocked") is True, str(result))
test("bridge_health does not expose local paths", "queue_root" not in result, str(result))

# bridge_status
result = handle_bridge_status({})
test("bridge_status returns status ok", result.get("status") == "ok", str(result))
test("bridge_status has line_mode", result.get("line_mode") == "dry-run", str(result))
test("bridge_status has tools_available", len(result.get("tools_available", [])) == 5, str(result))

# line_get_user_id (no DESTINATION_USER_ID set)
result = handle_line_get_user_id({})
test("line_get_user_id returns error when no DESTINATION_USER_ID", result.get("status") == "error", str(result))

# line_get_profile (dry-run mode)
result = handle_line_get_profile({"userId": "U1234567890abcdef1234567890abcdef"})
test("line_get_profile returns simulated in dry-run", result.get("status") == "simulated", str(result))
test("line_get_profile masks target identity", result.get("target_present") is True, str(result))

# line_send_message (dry-run mode)
result = handle_line_send_message({"userId": "U1234567890abcdef1234567890abcdef", "message": "Hello from Manus!"})
test("line_send_message is blocked by default", result.get("status") == "blocked", str(result))
test("line_send_message remains dry-run", result.get("dry_run") is True, str(result))
test("line_send_message has receipt_id", bool(result.get("receipt_id")), str(result))

# line_send_message without userId and no DESTINATION_USER_ID
result = handle_line_send_message({"message": "Hello"})
test("line_send_message without userId returns error", result.get("status") == "error", str(result))

# line_send_message with long message
result = handle_line_send_message({"userId": "Utest", "message": "x" * 2001})
test("line_send_message with >2000 chars returns error", result.get("status") == "error", str(result))


# ── Test 4: Policy Validation ────────────────────────────────────────────────

section("4. SYSTEM-DESIGN-ARCHITECT: Policy Validation Tests")

# Clean args
violations = validate_line_args({"userId": "U1234", "message": "hello"})
test("Clean args pass validation", len(violations) == 0, str(violations))

# Suspicious userId prefix
violations = validate_line_args({"userId": "X1234"})
test("Suspicious userId prefix detected", len(violations) > 0, str(violations))

# Secrets in args
violations = validate_line_args({"CHANNEL_ACCESS_TOKEN": "secret"})
test("Secrets in args detected", len(violations) > 0, str(violations))

# Receipt generation
receipt = build_receipt("line_send_message", {"userId": "Utest", "message": "hi"}, "simulated", "test")
test("Receipt has schema", receipt.get("schema") == "manus-mcp-bridge.receipt.v1", str(receipt))
test("Receipt has receipt_id", bool(receipt.get("receipt_id")), str(receipt))
test("Receipt has tool_name", receipt.get("tool_name") == "line_send_message", str(receipt))
test("Receipt has dry_run", receipt.get("dry_run") == True, str(receipt))
test("Receipt has auto_approved false", receipt.get("auto_approved") is False, str(receipt))
test("Receipt redacts every argument value", all(v == "<redacted>" for v in receipt["args_redacted"].values()), str(receipt["args_redacted"]))

# Unknown tool
result = handle_tool_call("nonexistent_tool", {})
test("Unknown tool returns error", result.get("status") == "error", str(result))


# ── Test 5: A2A Queue Integration ────────────────────────────────────────────

section("5. SENIOR-FULLSTACK-BUILDER: A2A Packet Integration Test")

# Test packet writing to inbox
inbox = _bridge.QUEUE_ROOT / "inbox"
inbox.mkdir(parents=True, exist_ok=True)

receipt = build_receipt("test_tool", {"test": "data"}, "simulated", "integration_test")
packet_id = write_a2a_packet("test_tool", {"test": "data"}, receipt)

packet_path = inbox / f"{packet_id}.json"
test("A2A packet written to inbox", packet_path.exists(), str(packet_path))

if packet_path.exists():
    packet = json.loads(packet_path.read_text())
    test("Packet has valid JSON", bool(packet), "Invalid JSON")
    test("Packet has schema", packet.get("schema") == "a2a-bridge.packet.v1", str(packet.get("schema")))
    test("Packet has correlation_id", bool(packet.get("correlation_id")), str(packet.get("correlation_id")))
    test("Packet from.agent is manus-agent", packet.get("from", {}).get("agent") == "manus-agent", str(packet.get("from")))
    test("Packet has receipt embedded", bool(packet.get("receipt")), str(packet.get("receipt")))
    test("Non-send test packet does not require approval", packet.get("human_approval_required") is False, str(packet.get("human_approval_required")))

    # Cleanup test packet
    packet_path.unlink()


# ── Test 6: File Permissions and Security ────────────────────────────────────

section("6. EVIDENCE-VERIFIER: Security & File Permission Checks")

bridge_py = Path("/Users/sirinx/sirinx-os/_A2A_QUEUE/manus-mcp-bridge.py")
test("Bridge script is executable", os.access(str(bridge_py), os.X_OK), str(oct(os.stat(str(bridge_py)).st_mode)))

bridge_sh = Path("/Users/sirinx/sirinx-os/_A2A_QUEUE/manus-mcp-bridge.sh")
test("Control script is executable", os.access(str(bridge_sh), os.X_OK), str(oct(os.stat(str(bridge_sh)).st_mode)))

registration_sh = Path("/Users/sirinx/sirinx-os/scripts/register-manus-mcp.sh")
test("Registration script is executable", os.access(str(registration_sh), os.X_OK), str(oct(os.stat(str(registration_sh)).st_mode)))

# Check no secrets in bridge code
code = bridge_py.read_text()
test("No hardcoded tokens in bridge", "sk-" not in code and "ghp_" not in code, "Token pattern found")

# Check A2A message types updated
a2a_types = Path("/Users/sirinx/sirinx-os/GHOSTCLAW/a2a-hermes-codex-bridge/a2a-message.ts")
types_content = a2a_types.read_text()
test("A2A types include manus-agent", '"manus-agent"' in types_content, "Missing manus-agent type")
test("A2A types include line-operator-mcp", '"line-operator-mcp"' in types_content, "Missing line-operator-mcp type")

# Check A2A bridge updated
bridge_content = Path("/Users/sirinx/sirinx-os/_A2A_QUEUE/a2a-bridge.py").read_text()
test("A2A bridge routes manus-agent", '"manus-agent"' in bridge_content, "Missing manus-agent routing")
test("A2A bridge routes line-operator-mcp", '"line-operator-mcp"' in bridge_content, "Missing line-operator-mcp routing")

# Check allowlist updated
allowlist = json.loads(Path("/Users/sirinx/.config/thclaws/mcp_allowlist.json").read_text())
test("Allowlist has manus-mcp-bridge", "manus-mcp-bridge" in allowlist.get("mcp_servers", {}), str(allowlist.get("mcp_servers", {}).keys()))
test("Allowlist has line-bot", "line-bot" in allowlist.get("mcp_servers", {}), str(allowlist.get("mcp_servers", {}).keys()))
test("Allowlist defaults auto-approve off", allowlist.get("config", {}).get("auto_approve_default") is False, str(allowlist.get("config")))

# Check policy exists
test("Manus MCP policy exists", Path("/Users/sirinx/sirinx-os/policy/manus-mcp-policy.yaml").exists(), "Missing policy file")

# Check opencode config updated
opencode = json.loads(Path("/Users/sirinx/.config/opencode/opencode.json").read_text())
test("OpenCode MCP has manus-mcp-bridge", "manus-mcp-bridge" in opencode.get("mcp", {}), str(opencode.get("mcp", {}).keys()))
test("OpenCode manus-mcp-bridge enabled", opencode["mcp"]["manus-mcp-bridge"].get("enabled") is True, "Not enabled")
test("OpenCode manus-mcp-bridge uses local HTTP", opencode["mcp"]["manus-mcp-bridge"].get("url") == "http://127.0.0.1:8788/mcp", str(opencode["mcp"]["manus-mcp-bridge"]))
test("OpenCode line-bot remains disabled", opencode["mcp"]["line-bot"].get("enabled") is False, "Unexpectedly enabled")
test("OpenCode allows bridge health only", opencode.get("permission", {}).get("manus-mcp-bridge_bridge_health") == "allow", "Health tool is not allowed")
test("OpenCode allows bridge status only", opencode.get("permission", {}).get("manus-mcp-bridge_bridge_status") == "allow", "Status tool is not allowed")
test("OpenCode line-bot broadcast blocked", opencode.get("tools", {}).get("line-bot.broadcast*") == False, "Broadcast not blocked")
test("OpenCode line-bot push blocked", opencode.get("tools", {}).get("line-bot.push*") == False, "Push not blocked")


# ── Summary ───────────────────────────────────────────────────────────────────

print(f"\n{'='*60}")
print(f"  RESULTS: {tests_run} tests, {tests_passed} passed, {tests_failed} failed")
print(f"{'='*60}")

if tests_failed > 0:
    print("\n  FAILED TESTS REQUIRE ATTENTION")
    sys.exit(1)
else:
    print("\n  All evidence-verifier checks passed.")
    print("  The Manus.ai ↔ LINE OA MCP Bridge is correctly implemented.")
    sys.exit(0)
