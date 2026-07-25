// services/command-center/src/main.rs
// Hermes Command Center - Omnigent Integration

mod agent_router;
mod evidence_chain;
mod policy_engine;

#[tokio::main]
async fn main() {
    println!("Hermes Command Center listening on :8787");
}
