use std::path::PathBuf;

use ghostclaw_migration_core::adapters::cli::run_cli_command;

fn main() {
    let raw_command = std::env::args().skip(1).collect::<Vec<_>>().join(" ");
    if raw_command.trim().is_empty() {
        eprintln!("usage: ghostclaw_migration_core '<command>'");
        std::process::exit(2);
    }
    let receipt_path = std::env::var("GHOSTCLAW_RUST_RECEIPT_PATH")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from(".ghostclaw_rust_migration/receipts.jsonl"));
    match run_cli_command(&raw_command, receipt_path) {
        Ok(response) => println!("{}", response.to_json()),
        Err(error) => {
            eprintln!("{error}");
            std::process::exit(1);
        }
    }
}
