//! GHOSTCLAW Hermes — router binary: queue, state machine driver, axum HTTP+WS API.
//!
//! Approval modes:
//! - /auto-approve: automated policy-gated approval (evidence + secrets + cost)
//! - /approve:      manual human override (still available as fallback)
//! - /reject:       manual human rejection

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use ghostclaw_core::{advance, AutoPolicy, Event, RiskTier, Stage, Task, ApprovalState};
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

#[derive(Deserialize)]
struct AutoApproveRequest {
    /// Override policy conditions (all default to true)
    #[serde(default)]
    evidence_passed: Option<bool>,
    #[serde(default)]
    secrets_clean: Option<bool>,
    #[serde(default)]
    cost_within_budget: Option<bool>,
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
        .route("/api/tasks/{id}/auto-approve", post(auto_approve))
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
        "message": "Task queued. GREEN/YELLOW auto-approve. RED auto-approves if policy passes (evidence+secrets+cost) — fallback: /approve for manual.",
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

/// Automated approval — policy-gated. All conditions must pass.
/// If any condition fails, task stays Pending and returns the block reason.
async fn auto_approve(
    State(st): State<AppState>,
    Path(id): Path<String>,
    Json(body): Json<AutoApproveRequest>,
) -> impl IntoResponse {
    let mut tasks = st.tasks.write().await;
    match tasks.remove(&id) {
        Some(t) => {
            let policy = AutoPolicy {
                evidence_passed: body.evidence_passed.unwrap_or(true),
                secrets_clean: body.secrets_clean.unwrap_or(true),
                cost_within_budget: body.cost_within_budget.unwrap_or(true),
                policy_version: "auto-v1".into(),
            };

            let t_clone = t.clone();
            match advance(t, Event::AutoApproveAttempt(policy)) {
                Ok(updated) => {
                    let is_done = updated.stage == Stage::Done;
                    tasks.insert(id.clone(), updated.clone());
                    Json(serde_json::json!({
                        "status": if is_done { "auto-approved" } else { "pending" },
                        "task": updated,
                    }))
                }
                Err(e) => {
                    // Put task back without advancing — still pending
                    tasks.insert(id.clone(), t_clone.clone());
                    Json(serde_json::json!({
                        "status": "blocked",
                        "error": e.to_string(),
                        "task": t_clone,
                        "hint": "Auto-approve blocked. Use /approve for manual override.",
                    }))
                }
            }
        }
        None => Json(serde_json::json!({"error": "not found"})),
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
