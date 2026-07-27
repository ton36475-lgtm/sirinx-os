//! MCP stdio server exposing real A2A dispatch as a tool any agentic coding
//! team member can call — Claude Code, Codex itself, opencode, ZCode, whatever
//! else registers it as an MCP server, not just this one session.
//!
//! Hand-rolled rather than pulled from a crate: MCP's stdio transport is
//! newline-delimited JSON-RPC 2.0 on stdin/stdout, and the surface this
//! dispatcher needs is exactly three methods (`initialize`, `tools/list`,
//! `tools/call`) plus swallowing the `notifications/initialized` notification.
//! That is small enough to get right by hand and verify directly, rather than
//! trust an unfamiliar dependency's framing.
//!
//! Register it as a stdio MCP server, same pattern as `codex mcp-server`:
//! ```json
//! { "command": "/path/to/a2a-dispatch-mcp" }
//! ```

use std::io::Write;
use std::sync::Arc;

use ghostclaw_a2a_dispatch::{DispatchError, Dispatcher};
use ghostclaw_providers::breaker::CircuitBreaker;
use ghostclaw_providers::receipt::ReceiptLog;
use serde_json::{json, Value};
use tokio::io::{AsyncBufReadExt, BufReader};

const PROTOCOL_VERSION: &str = "2024-11-05";
const SERVER_NAME: &str = "ghostclaw-a2a-dispatch";
const SERVER_VERSION: &str = "0.1.0";
const MAX_REQUEST_LINE_BYTES: usize = 128 * 1024;

fn tool_definitions() -> Value {
    json!([{
        "name": "a2a_send_message",
        "description": "Dispatch one operator-leased, read-only message to a \
            real agent over the A2A lane. A matching one-use lease must be \
            present at GHOSTCLAW_A2A_LEASE_FILE. \
            Only 'Codex' has a verified live backend today (the codex CLI, \
            codex exec) — every other name in the Phase 9 agent-card \
            (Antigravity, Planner, LineSecretary, SovereignSwarm, WebMCP) is \
            still a stub with live_send:false and is refused here rather than \
            silently faked.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "agent": {
                    "type": "string",
                    "description": "Target agent name. Only \"Codex\" is live today."
                },
                "message": {
                    "type": "string",
                    "description": "The prompt/task to send."
                }
            },
            "required": ["agent", "message"]
        }
    }])
}

fn write_response(id: &Value, result: Value) {
    let msg = json!({ "jsonrpc": "2.0", "id": id, "result": result });
    println!("{msg}");
    let _ = std::io::stdout().flush();
}

fn write_error(id: &Value, code: i64, message: &str) {
    let msg = json!({ "jsonrpc": "2.0", "id": id, "error": { "code": code, "message": message } });
    println!("{msg}");
    let _ = std::io::stdout().flush();
}

fn tool_result(text: String, is_error: bool) -> Value {
    json!({ "content": [{ "type": "text", "text": text }], "isError": is_error })
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_writer(std::io::stderr)
        .init();

    let receipts_path = ghostclaw_providers::maxplus::env_nonempty("GHOSTCLAW_RECEIPTS")
        .unwrap_or_else(|| ".ghostclaw_runtime/receipts/a2a-dispatch.jsonl".to_string());
    let dispatcher = match Dispatcher::from_env(
        Arc::new(CircuitBreaker::new()),
        Arc::new(ReceiptLog::new(receipts_path)),
    ) {
        Ok(dispatcher) => dispatcher,
        Err(error) => {
            tracing::error!(%error, "a2a-dispatch refused to start");
            std::process::exit(78);
        }
    };

    let stdin = tokio::io::stdin();
    let mut lines = BufReader::new(stdin).lines();

    while let Ok(Some(line)) = lines.next_line().await {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        if line.len() > MAX_REQUEST_LINE_BYTES {
            tracing::warn!("refusing oversized MCP request line");
            continue;
        }
        let req: Value = match serde_json::from_str(line) {
            Ok(v) => v,
            Err(e) => {
                tracing::warn!(error = %e, "skipping unparseable stdin line");
                continue;
            }
        };

        let method = req.get("method").and_then(Value::as_str).unwrap_or("");
        let id = req.get("id").cloned();

        // A request with no "id" is a notification — the spec forbids a reply.
        let Some(id) = id else {
            tracing::debug!(method, "notification, no reply sent");
            continue;
        };

        match method {
            "initialize" => write_response(
                &id,
                json!({
                    "protocolVersion": PROTOCOL_VERSION,
                    "capabilities": { "tools": {} },
                    "serverInfo": { "name": SERVER_NAME, "version": SERVER_VERSION }
                }),
            ),
            "tools/list" => write_response(&id, json!({ "tools": tool_definitions() })),
            "tools/call" => {
                let params = req.get("params").cloned().unwrap_or(Value::Null);
                let name = params.get("name").and_then(Value::as_str).unwrap_or("");
                let args = params.get("arguments").cloned().unwrap_or(Value::Null);

                if name != "a2a_send_message" {
                    write_response(&id, tool_result(format!("unknown tool: {name}"), true));
                    continue;
                }

                let agent = args.get("agent").and_then(Value::as_str).unwrap_or("");
                let message = args.get("message").and_then(Value::as_str).unwrap_or("");

                match dispatcher.send_message(agent, message).await {
                    Ok(r) => {
                        let session_str = r.session_id
                            .as_ref()
                            .map(|s| format!(" session_id={}", s))
                            .unwrap_or_default();
                        let text = format!(
                            "[live_send={} latency_ms={} lease_id={} message_sha256={}{}]\n{}",
                            r.live_send, r.latency_ms, r.lease_id, r.message_sha256, session_str, r.output
                        );
                        write_response(&id, tool_result(text, false));
                    }
                    Err(e @ DispatchError::UnknownAgent(_)) => {
                        write_response(&id, tool_result(format!("refused: {e}"), true));
                    }
                    Err(e) => {
                        write_response(&id, tool_result(format!("dispatch failed: {e}"), true));
                    }
                }
            }
            "" => write_error(&id, -32600, "invalid request: missing method"),
            other => write_error(&id, -32601, &format!("method not found: {other}")),
        }
    }
}
