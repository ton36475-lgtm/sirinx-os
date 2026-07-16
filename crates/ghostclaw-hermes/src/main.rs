// crates/ghostclaw-hermes/src/main.rs
// Stage 3: Hermes Router Binary

use axum::{routing::{get, post}, Router};
use ghostclaw_core::advance;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let app = Router::new()
        .route("/api/tasks", get(list_tasks).post(submit_task))
        .route("/api/tasks/:id/approve", post(approve_task))
        .route("/api/tasks/:id/reject", post(reject_task))
        .route("/ws", get(ws_handler));
    
    let listener = tokio::net::TcpListener::bind("127.0.0.1:8787").await?;
    println!("Hermes listening on http://127.0.0.1:8787");
    axum::serve(listener, app).await?;
    Ok(())
}

// Handlers - stubs pending verification
async fn list_tasks() -> &'static str { "[]" }
async fn submit_task() -> &'static str { "task submitted" }
async fn approve_task() -> &'static str { "approved" }
async fn reject_task() -> &'static str { "rejected" }
async fn ws_handler() -> &'static str { "ws connected" }