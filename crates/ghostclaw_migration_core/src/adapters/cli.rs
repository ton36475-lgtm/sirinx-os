//! CLI adapter for local smoke tests.

use std::path::PathBuf;

use crate::engine::{Engine, EngineResponse};
use crate::error::Result;
use crate::receipt::FileReceiptStore;
use crate::schema::CommandEnvelope;

/// Runs one CLI command against a file-backed receipt store.
pub fn run_cli_command(raw_command: &str, receipt_path: PathBuf) -> Result<EngineResponse> {
    let store = FileReceiptStore::new(receipt_path);
    let mut engine = Engine::new(store);
    engine.handle(&CommandEnvelope::cli(raw_command))
}
