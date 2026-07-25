use std::process::Command;

use ghostclaw_migration_core::{CommandEnvelope, Engine, MemoryReceiptStore};

#[test]
fn parity_against_python_oracle_when_configured() {
    let Ok(oracle) = std::env::var("LEGACY_PYTHON_ORACLE") else {
        return;
    };
    let raw_command = "/status";
    let mut engine = Engine::new(MemoryReceiptStore::default());
    let rust_response = engine.handle(&CommandEnvelope::cli(raw_command)).unwrap();
    let output = Command::new("python3")
        .arg(oracle)
        .arg(raw_command)
        .output()
        .unwrap();

    assert!(output.status.success());
    assert!(String::from_utf8_lossy(&output.stdout).contains(&rust_response.status));
}
