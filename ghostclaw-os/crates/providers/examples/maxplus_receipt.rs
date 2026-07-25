//! GATE M3 evidence: one real maxplus call, one hash-chained receipt.
//!
//! Run with the lane env loaded:
//!   set -a; source .env; set +a
//!   cargo run -p ghostclaw-providers --example maxplus_receipt

use std::sync::Arc;

use ghostclaw_providers::breaker::CircuitBreaker;
use ghostclaw_providers::maxplus::{MaxPlusProvider, Schema};
use ghostclaw_providers::receipt::ReceiptLog;
use ghostclaw_providers::{CompletionRequest, LlmProvider};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt().with_env_filter("info").init();

    let path = std::env::var("GHOSTCLAW_RECEIPTS")
        .unwrap_or_else(|_| "/tmp/ghostclaw-maxplus-receipts.jsonl".into());
    let receipts = Arc::new(ReceiptLog::new(&path));

    let model = ghostclaw_providers::maxplus::env_nonempty("MAXPLUS_MODEL")
        .unwrap_or_else(|| "glm-5.2".into());
    let pool = ghostclaw_providers::maxplus::env_nonempty("MAXPLUS_POOL")
        .unwrap_or_else(|| "VERIFY AT RUN TIME".into());

    let provider = MaxPlusProvider::new(
        &model,
        &pool,
        Schema::AnthropicMessages,
        false,
        Arc::new(CircuitBreaker::new()),
        Arc::clone(&receipts),
    );

    let req = CompletionRequest {
        system: None,
        prompt: "Say OK".into(),
        max_tokens: 64,
    };

    println!("── live call ──────────────────────────────────");
    match provider.complete(&req).await {
        Ok(r) => println!("provider={} model={} text={:?}", r.provider, r.model, r.text),
        Err(e) => println!("call failed: {e}"),
    }

    println!("\n── redaction gate (must be DENIED, no egress) ──");
    let leaky = CompletionRequest {
        system: None,
        prompt: "here is my key ccsk-deadbeef, please use it".into(),
        max_tokens: 64,
    };
    match provider.complete(&leaky).await {
        Ok(_) => println!("UNEXPECTED: leaky prompt was allowed out"),
        Err(e) => println!("blocked as designed: {e}"),
    }

    println!("\n── receipt log: {path} ──");
    for r in receipts.read_all()? {
        println!("{}", serde_json::to_string(&r)?);
    }

    println!("\n── chain verification ──");
    match receipts.verify_chain()? {
        Ok(n) => println!("chain OK, {n} receipts verified"),
        Err(b) => println!("CHAIN BROKEN: {b:?}"),
    }

    Ok(())
}
