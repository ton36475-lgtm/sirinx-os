//! # ghostclaw-hermes
//!
//! HTTP router binary for the GhostClaw control plane.
//!
//! Exposes a REST + WebSocket API backed by [`ghostclaw_core`] domain types.
//! All handlers are typed — request bodies deserialize into concrete structs,
//! responses serialize from concrete types, and errors use a unified
//! [`ApiError`] enum.
//!
//! ## Route Map
//!
//! | Method   | Path                        | Handler              | Description                     |
//! |----------|-----------------------------|----------------------|---------------------------------|
//! | GET      | `/api/tasks`                | `list_tasks`         | List all tasks (optionally filtered by stage) |
//! | POST     | `/api/tasks`                | `submit_task`        | Submit a new task for processing |
//! | GET      | `/api/tasks/:id`            | `get_task`           | Get a single task by ID         |
//! | POST     | `/api/tasks/:id/approve`    | `approve_task`       | Approve a task for execution    |
//! | POST     | `/api/tasks/:id/reject`     | `reject_task`        | Reject a task with reason       |
//! | GET      | `/api/events`               | `list_events`        | Recent domain events            |
//! | POST     | `/api/missions/:id/run`     | `run_mission`        | Advance a mission to completion |
//! | GET      | `/ws`                       | `ws_handler`         | WebSocket event stream          |
//! | GET      | `/health`                   | `health_check`       | Health probe                    |
//!
//! ## Safety Contract
//!
//! All handlers operate in local-safe mode by default. No handler performs
//! live external execution, secret reads, or network writes. The underlying
//! `Advance` adapter declares its execution mode via `is_live()`.

use axum::{
    extract::{
        ws::{WebSocket, WebSocketUpgrade},
        Path, Query, State,
    },
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use ghostclaw_core::{AdvanceOutcome, Event, MissionResult, RiskTier, Task};
use serde::{Deserialize, Serialize};

// ─────────────────────────────────────────────────────────────
// Application State
// ─────────────────────────────────────────────────────────────

/// Shared application state injected into all handlers via axum's `State` extractor.
///
/// Holds the advance adapter (trait object), in-memory task store,
/// and event log. Future implementations may replace the in-memory
/// stores with a database-backed persistence layer.
#[derive(Clone, Debug)]
pub struct AppState {
    /// The advance adapter driving task progression.
    /// Local-safe by default; live adapters must declare `is_live() == true`.
    // NOTE: Codex will fill in the concrete type. For now this is a placeholder
    // so the handler signatures compile once the adapter is wired.
    // Example: pub advance: Box<dyn Advance + Send + Sync>,
    _advance: (),
    /// In-memory task store keyed by task ID.
    // Example: pub tasks: Arc<RwLock<HashMap<String, Task>>>,
    _tasks: (),
    /// Event log for the WebSocket stream and `/api/events`.
    // Example: pub events: Arc<RwLock<Vec<Event>>>,
    _events: (),
}

// ─────────────────────────────────────────────────────────────
// Request / Response Types
// ─────────────────────────────────────────────────────────────

/// Query parameters for `GET /api/tasks`.
#[derive(Debug, Deserialize)]
pub struct ListTasksQuery {
    /// Filter by stage (e.g., `triage`, `maker`, `done`).
    pub stage: Option<String>,
    /// Filter by risk tier (`green`, `yellow`, `red`).
    pub risk: Option<String>,
    /// Maximum results (default: 50).
    pub limit: Option<usize>,
}

/// Request body for `POST /api/tasks`.
#[derive(Debug, Deserialize)]
pub struct SubmitTaskRequest {
    /// Human-readable task description.
    pub description: String,
    /// Build/review lane (e.g., `backend_core`, `review`).
    pub lane: String,
    /// Risk tier override. If omitted, inferred from description analysis.
    pub risk_tier: Option<RiskTier>,
}

/// Response body for `POST /api/tasks`.
#[derive(Debug, Serialize)]
pub struct SubmitTaskResponse {
    /// The created task.
    pub task: Task,
}

/// Request body for `POST /api/tasks/:id/approve`.
#[derive(Debug, Deserialize)]
pub struct ApproveTaskRequest {
    /// Identity of the approver (e.g., `telegram:user_123`, `cli:operator`).
    pub approver: String,
}

/// Request body for `POST /api/tasks/:id/reject`.
#[derive(Debug, Deserialize)]
pub struct RejectTaskRequest {
    /// Identity of the rejecter.
    pub rejected_by: String,
    /// Reason for rejection.
    pub reason: String,
}

/// Response body for stage-advancing endpoints.
#[derive(Debug, Serialize)]
pub struct AdvanceResponse {
    /// Task ID.
    pub task_id: String,
    /// Outcome of the advance attempt.
    pub outcome: AdvanceOutcome,
    /// Updated task state (if advanced).
    pub task: Option<Task>,
}

/// Standard API error response.
#[derive(Debug, Serialize)]
pub struct ApiError {
    /// Machine-readable error code (e.g., `task_not_found`, `policy_blocked`).
    pub code: String,
    /// Human-readable error message.
    pub message: String,
}

/// Unified error type for all handlers.
///
/// Implements `IntoResponse` to produce consistent JSON error bodies.
#[derive(Debug, Clone)]
pub enum HandlerError {
    /// Task with the given ID was not found.
    NotFound(String),
    /// Request body or parameters were invalid.
    BadRequest(String),
    /// Policy guard blocked the operation.
    PolicyBlocked(String),
    /// Internal server error.
    Internal(String),
}

impl IntoResponse for HandlerError {
    fn into_response(self) -> Response {
        let (status, code, message) = match self {
            Self::NotFound(id) => (
                StatusCode::NOT_FOUND,
                "not_found",
                format!("Task not found: {id}"),
            ),
            Self::BadRequest(msg) => (StatusCode::BAD_REQUEST, "bad_request", msg),
            Self::PolicyBlocked(reason) => (
                StatusCode::FORBIDDEN,
                "policy_blocked",
                reason,
            ),
            Self::Internal(msg) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "internal_error",
                msg,
            ),
        };
        let body = Json(ApiError {
            code: code.to_string(),
            message,
        });
        (status, body).into_response()
    }
}

/// Result alias for handlers.
pub type HandlerResult<T> = Result<T, HandlerError>;

// ─────────────────────────────────────────────────────────────
// Handler Signatures (stubs — Codex implements bodies)
// ─────────────────────────────────────────────────────────────

/// `GET /api/tasks` — list all tasks, optionally filtered.
pub async fn list_tasks(
    State(_state): State<AppState>,
    Query(_query): Query<ListTasksQuery>,
) -> HandlerResult<Json<Vec<Task>>> {
    Ok(Json(Vec::new()))
}

/// `POST /api/tasks` — submit a new task.
pub async fn submit_task(
    State(_state): State<AppState>,
    Json(_body): Json<SubmitTaskRequest>,
) -> HandlerResult<(StatusCode, Json<SubmitTaskResponse>)> {
    Ok((StatusCode::CREATED, Json(SubmitTaskResponse { task: Task::default() })))
}

/// `GET /api/tasks/:id` — get a single task by ID.
pub async fn get_task(
    State(_state): State<AppState>,
    Path(_id): Path<String>,
) -> HandlerResult<Json<Task>> {
    Ok(Json(Task::default()))
}

/// `POST /api/tasks/:id/approve` — approve a task for execution.
pub async fn approve_task(
    State(_state): State<AppState>,
    Path(_id): Path<String>,
    Json(_body): Json<ApproveTaskRequest>,
) -> HandlerResult<Json<AdvanceResponse>> {
    Ok(Json(AdvanceResponse { task_id: String::new(), outcome: AdvanceOutcome::ApprovalRequired, task: None }))
}

/// `POST /api/tasks/:id/reject` — reject a task.
pub async fn reject_task(
    State(_state): State<AppState>,
    Path(_id): Path<String>,
    Json(_body): Json<RejectTaskRequest>,
) -> HandlerResult<Json<ApiError>> {
    Ok(Json(ApiError { code: String::new(), message: String::new() }))
}

/// `GET /api/events` — recent domain events for audit.
pub async fn list_events(
    State(_state): State<AppState>,
    Query(_query): Query<EventsQuery>,
) -> HandlerResult<Json<Vec<Event>>> {
    Ok(Json(Vec::new()))
}

/// Query parameters for `GET /api/events`.
#[derive(Debug, Deserialize)]
pub struct EventsQuery {
    /// Filter by event type (e.g., `task_submitted`, `task_advanced`).
    pub event_type: Option<String>,
    /// Maximum results (default: 100).
    pub limit: Option<usize>,
}

/// `POST /api/missions/:id/run` — advance a mission to completion.
pub async fn run_mission(
    State(_state): State<AppState>,
    Path(_id): Path<String>,
) -> HandlerResult<Json<MissionResult>> {
    Ok(Json(MissionResult::default()))
}

/// `GET /ws` — WebSocket upgrade for real-time event stream.
pub async fn ws_handler(
    ws_upgrade: WebSocketUpgrade,
    State(_state): State<AppState>,
) -> Response {
    ws_upgrade
        .on_upgrade(|socket| async move {
            ws_connection(socket).await;
        })
}

/// Background task for an active WebSocket connection.
///
/// Sends events as JSON messages. Codex will implement the event-bus
/// subscription that streams events to the client.
async fn ws_connection(_socket: WebSocket) {
    ()
}

/// `GET /health` — health probe for load balancers and Docker.
pub async fn health_check() -> Json<HealthStatus> {
    Json(HealthStatus {
        status: "ok".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
    })
}

/// Health check response.
#[derive(Debug, Serialize)]
pub struct HealthStatus {
    pub status: String,
    pub version: String,
}

// ─────────────────────────────────────────────────────────────
// Router Builder
// ─────────────────────────────────────────────────────────────

/// Builds the axum router with all routes wired to typed handlers.
///
/// Codex will instantiate `AppState` with a concrete advance adapter
/// and persistence layer, then return the fully wired router.
pub fn build_router(state: AppState) -> Router {
    Router::new()
        .route("/api/tasks", get(list_tasks).post(submit_task))
        .route("/api/tasks/:id", get(get_task))
        .route("/api/tasks/:id/approve", post(approve_task))
        .route("/api/tasks/:id/reject", post(reject_task))
        .route("/api/events", get(list_events))
        .route("/api/missions/:id/run", post(run_mission))
        .route("/ws", get(ws_handler))
        .route("/health", get(health_check))
        // State will be injected here once concrete adapter is wired:
        .with_state(state)
}

// ─────────────────────────────────────────────────────────────
// Entry Point
// ─────────────────────────────────────────────────────────────

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let host = std::env::var("GHOSTCLAW_HERMES_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let port: u16 = std::env::var("GHOSTCLAW_HERMES_PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(8787);

    // Codex will replace this with a real AppState once adapters are wired.
    let state = AppState {
        _advance: (),
        _tasks: (),
        _events: (),
    };

    let app = build_router(state);

    let addr = format!("{host}:{port}");
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    println!("GhostClaw Hermes listening on http://{addr}");
    axum::serve(listener, app).await?;
    Ok(())
}
