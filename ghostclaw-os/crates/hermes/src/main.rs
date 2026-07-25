//! GHOSTCLAW Hermes — router binary: queue, state machine driver, axum HTTP+WS API.
//!
//! Approval modes:
//! - /approve: human approval. For RED this is the only thing that advances a task.
//! - /reject:  human rejection.
//!
//! There is no /auto-approve. It existed and was removed — see
//! docs/decisions/P100-RED-AUTO-APPROVE-FINDING.md.

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use ghostclaw_core::{advance, Event, RiskTier, Stage, Task, ApprovalState};
use ghostclaw_providers::{TieredRouter};
use serde::Deserialize;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::info;

#[derive(Clone)]
struct AppState {
    tasks: Arc<RwLock<HashMap<String, Task>>>,
    router: Arc<TieredRouter>,
}

#[derive(Deserialize)]
struct TaskSubmit {
    description: String,
    risk: Option<String>,
}

#[derive(Deserialize)]
struct ApprovalRequest {
    who: String,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt().init();

    let router = TieredRouter::standard();
    info!(
        tiers = router.tier_count(),
        "GHOSTCLAW Hermes starting on http://127.0.0.1:8787"
    );

    let state = AppState {
        tasks: Arc::new(RwLock::new(HashMap::new())),
        router: Arc::new(router),
    };

    let app = Router::new()
        .route("/health", get(health))
        .route("/api/tasks", get(list_tasks).post(submit_task))
        .route("/api/tasks/{id}", get(get_task))
        .route("/api/tasks/{id}/approve", post(approve))
        .route("/api/tasks/{id}/reject", post(reject))
        .route("/api/providers", get(list_providers))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("127.0.0.1:8787").await?;
    axum::serve(listener, app).await?;
    Ok(())
}

async fn health() -> impl IntoResponse {
    Json(serde_json::json!({
        "status": "ok",
        "service": "ghostclaw-hermes",
        "version": "0.2.0",
        "approval_mode": "auto (policy-gated) + manual override",
    }))
}

async fn list_tasks(State(st): State<AppState>) -> impl IntoResponse {
    let tasks = st.tasks.read().await;
    let list: Vec<Task> = tasks.values().cloned().collect();
    Json(list)
}

async fn submit_task(
    State(st): State<AppState>,
    Json(body): Json<TaskSubmit>,
) -> impl IntoResponse {
    let id = format!("gc-{}", uuid::Uuid::new_v4().simple());
    let risk = match body.risk.as_deref() {
        Some("green") => RiskTier::Green,
        Some("yellow") => RiskTier::Yellow,
        Some("red") => RiskTier::Red,
        _ => RiskTier::Green,
    };

    let task = Task {
        id: id.clone(),
        description: body.description,
        stage: Stage::Triage,
        risk: RiskTier::Green,
        approval: ApprovalState::NotRequired,
        evidence: vec![],
        branch: None,
        audit: vec![],
    };

    // TRIAGE → assign risk
    let task = advance(task, Event::Triaged(risk)).unwrap();
    st.tasks.write().await.insert(id.clone(), task);

    Json(serde_json::json!({
        "id": id,
        "message": "Task queued. GREEN/YELLOW auto-approve. RED waits for a human at /approve or /reject.",
    }))
}

async fn get_task(
    State(st): State<AppState>,
    Path(id): Path<String>,
) -> axum::response::Response {
    let tasks = st.tasks.read().await;
    match tasks.get(&id) {
        Some(t) => Json(serde_json::to_value(t.clone()).unwrap()).into_response(),
        None => (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": "not found"}))).into_response(),
    }
}

/// Manual human override — still available as fallback.
async fn approve(
    State(st): State<AppState>,
    Path(id): Path<String>,
    Json(body): Json<ApprovalRequest>,
) -> impl IntoResponse {
    let mut tasks = st.tasks.write().await;
    match tasks.remove(&id) {
        Some(t) => match advance(t, Event::HumanApprove(body.who)) {
            Ok(updated) => {
                tasks.insert(id, updated.clone());
                Json(serde_json::json!({
                    "status": "approved",
                    "task": updated,
                }))
            }
            Err(e) => Json(serde_json::json!({
                "error": e.to_string(),
            })),
        },
        None => Json(serde_json::json!({"error": "not found"})),
    }
}

async fn reject(
    State(st): State<AppState>,
    Path(id): Path<String>,
    Json(body): Json<ApprovalRequest>,
) -> impl IntoResponse {
    let mut tasks = st.tasks.write().await;
    if let Some(t) = tasks.remove(&id) {
        let updated = advance(t, Event::HumanReject(body.who)).unwrap();
        tasks.insert(id, updated.clone());
        Json(serde_json::to_value(&updated).unwrap())
    } else {
        Json(serde_json::json!({"error": "not found"}))
    }
}

async fn list_providers(State(st): State<AppState>) -> impl IntoResponse {
    let names = st.router.provider_names();
    Json(serde_json::json!({
        "providers": names,
        "routing": "sovereign-local → free → paid-frontier (GLM/MaxPlus Fable5)",
    }))
}
