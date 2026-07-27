//! Direct CLI for one lease-gated dispatch call, bypassing only MCP framing.
//! It uses the same lease, workspace, redaction, breaker, sandbox, and receipt
//! path as the MCP server.
//!
//!   a2a-dispatch-cli Codex "Reply with exactly: dispatch ok"

use std::sync::Arc;

use ghostclaw_a2a_dispatch::Dispatcher;
use ghostclaw_providers::breaker::CircuitBreaker;
use ghostclaw_providers::receipt::ReceiptLog;

#[tokio::main]
async fn main() {
    let mut args = std::env::args().skip(1);
    let (Some(agent), Some(message)) = (args.next(), args.next()) else {
        eprintln!("usage: a2a-dispatch-cli <agent> <message>");
        std::process::exit(2);
    };

    let receipts_path = ghostclaw_providers::maxplus::env_nonempty("GHOSTCLAW_RECEIPTS")
        .unwrap_or_else(|| ".ghostclaw_runtime/receipts/a2a-dispatch.jsonl".to_string());
    let dispatcher = match Dispatcher::from_env(
        Arc::new(CircuitBreaker::new()),
        Arc::new(ReceiptLog::new(receipts_path)),
    ) {
        Ok(dispatcher) => dispatcher,
        Err(error) => {
            eprintln!("dispatch unavailable: {error}");
            std::process::exit(78);
        }
    };

    match dispatcher.send_message(&agent, &message).await {
        Ok(r) => {
            if let Some(session_id) = &r.session_id {
                println!(
                    "live_send={} latency_ms={} lease_id={} message_sha256={} session_id={}",
                    r.live_send, r.latency_ms, r.lease_id, r.message_sha256, session_id
                );
            } else {
                println!(
                    "live_send={} latency_ms={} lease_id={} message_sha256={}",
                    r.live_send, r.latency_ms, r.lease_id, r.message_sha256
                );
            }
            println!("{}", r.output);
        }
        Err(e) => {
            eprintln!("dispatch failed: {e}");
            std::process::exit(1);
        }
    }
}
