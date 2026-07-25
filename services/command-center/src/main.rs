// services/command-center/src/main.rs
// Hermes Command Center - Omnigent Integration

mod agent_router;
mod policy_engine;
mod evidence_chain;

#[tokio::main]
async fn main() {
    println!("Hermes Command Center listening on :8787");
}