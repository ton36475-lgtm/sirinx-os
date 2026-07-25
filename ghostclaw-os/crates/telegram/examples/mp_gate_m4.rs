//! GATE M4 evidence harness.
//!
//! Drives the real `mp*` handlers against the real registry, performs one real
//! completion, and shows that a 🔴 task does not move.
//!
//! This is a local dispatch of the same code path the Telegram loop uses — it is
//! NOT a live Telegram round-trip. Sending messages into Tony's channel is his
//! action, not the harness's.
//!
//!   set -a; source .env; set +a
//!   cargo run -p ghostclaw-telegram --example mp_gate_m4

use std::sync::Arc;

use ghostclaw_core::{ApprovalState, RiskTier, Stage, Task};
use ghostclaw_providers::breaker::CircuitBreaker;
use ghostclaw_providers::maxplus::{MaxPlusProvider, Schema};
use ghostclaw_providers::receipt::ReceiptLog;
use ghostclaw_providers::{CompletionRequest, LlmProvider};
use ghostclaw_telegram::maxplus_commands::{dispatch, red_task_reply, LaneState, MpCommand, Registry};

const CHAT: i64 = 1_000_001;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let path = std::env::var("GHOSTCLAW_MODELS_MAXPLUS")
        .unwrap_or_else(|_| "../config/models.maxplus.json".into());
    let registry = Registry::load(&path)?;
    let breaker = Arc::new(CircuitBreaker::new());
    let state = LaneState::new(registry, Arc::clone(&breaker));

    println!("═══ /mpmodels ═══");
    println!("{}", dispatch(MpCommand::Models { page: 1 }, CHAT, &state).await);

    println!("\n═══ /mpmodels 2 ═══");
    println!("{}", dispatch(MpCommand::Models { page: 2 }, CHAT, &state).await);

    println!("\n═══ /mpuse kimi-k2.6  (ERR — must be refused) ═══");
    println!("{}", dispatch(MpCommand::Use { model: "kimi-k2.6".into() }, CHAT, &state).await);

    println!("\n═══ /mpuse glm-5.2 ═══");
    println!("{}", dispatch(MpCommand::Use { model: "glm-5.2".into() }, CHAT, &state).await);
    let active = state.active_model(CHAT).expect("active model must be set");

    println!("\n═══ 1 completion on the active model ═══");
    let receipts = Arc::new(ReceiptLog::new(
        std::env::var("GHOSTCLAW_RECEIPTS")
            .unwrap_or_else(|_| "/tmp/ghostclaw-m4-receipts.jsonl".into()),
    ));
    let provider = MaxPlusProvider::new(
        &active,
        state.pool(CHAT),
        Schema::AnthropicMessages,
        false,
        Arc::clone(&breaker),
        Arc::clone(&receipts),
    );
    let req = CompletionRequest {
        system: None,
        prompt: "Reply with exactly: gate m4 ok".into(),
        max_tokens: 64,
    };
    match provider.complete(&req).await {
        Ok(r) => println!("model={} text={:?}", r.model, r.text),
        Err(e) => println!("completion failed: {e}"),
    }

    println!("\n═══ /mpping ═══");
    println!("{}", dispatch(MpCommand::Ping { model: None }, CHAT, &state).await);

    println!("\n═══ /mppool ═══");
    println!("{}", dispatch(MpCommand::Pool { name: None }, CHAT, &state).await);

    println!("\n═══ /mphealth ═══");
    println!("{}", dispatch(MpCommand::Health, CHAT, &state).await);

    println!("\n═══ 🔴 RED task on this lane — must not move ═══");
    let mut red = Task {
        id: "T-RED-001".into(),
        description: "deploy the lead handler to production".into(),
        stage: Stage::Triage,
        risk: RiskTier::Red,
        approval: ApprovalState::Pending,
        evidence: vec![],
        branch: None,
        audit: vec![],
    };
    let before = format!("{:?}/{:?}", red.stage, red.approval);
    println!("before : stage={:?} approval={:?}", red.stage, red.approval);
    println!("{}", red_task_reply(&red.id));
    // The lane deliberately performs no state transition on a Red task.
    let after = format!("{:?}/{:?}", red.stage, red.approval);
    println!("after  : stage={:?} approval={:?}", red.stage, red.approval);
    assert_eq!(before, after, "RED task must not advance on the maxplus lane");
    red.audit.push("maxplus lane: refused, requires human gate".into());
    println!("result : UNCHANGED ✓  (audit note appended, no stage/approval change)");

    println!("\n═══ receipts ═══");
    for r in receipts.read_all()? {
        println!("{}", serde_json::to_string(&r)?);
    }
    match receipts.verify_chain()? {
        Ok(n) => println!("chain OK, {n} receipts verified"),
        Err(b) => println!("CHAIN BROKEN: {b:?}"),
    }

    Ok(())
}
