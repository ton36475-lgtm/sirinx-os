//! GhostClaw Rust Migration Core.
//!
//! This crate owns the deterministic control-plane core for the P085 migration
//! packet: command parsing, hard policy blocks, route intent creation, secret
//! redaction, and append-only receipts. It deliberately does not start live
//! Telegram runtimes, execute Codex, mutate Cloudflare/R2, push Git, deploy, or
//! read secrets.

pub mod adapters;
pub mod command;
pub mod engine;
pub mod error;
pub mod policy;
pub mod python_compat;
pub mod python_oracle;
pub mod receipt;
pub mod redaction;
pub mod schema;

pub use command::{parse_command, ParsedCommand};
pub use engine::{Engine, EngineResponse};
pub use error::MigrationError;
pub use policy::{PolicyDecision, PolicyGuard};
pub use receipt::{FileReceiptStore, MemoryReceiptStore, ReceiptStore};
pub use schema::{CommandEnvelope, Lane, Receipt, RouteJob};
