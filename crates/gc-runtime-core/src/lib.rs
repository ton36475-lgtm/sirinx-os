//! # GC Runtime Core — Rust Engine
//!
//! Lightweight Rust runtime for GC Fleet:
//! - **Vector Store**: Memory-mapped, zero-copy vector storage
//! - **RAG Engine**: Lightweight semantic search over knowledge
//! - **Harness Trainer**: Self-evaluation & capability improvement
//!
//! Design: zero heavy dependencies, minimal memory, fast cold start.
//! All I/O is via stdin/stdout JSON-LD protocol (no HTTP in core).

mod vector;
mod rag;
mod harness;
mod store;

pub use vector::*;
pub use rag::*;
pub use harness::*;
pub use store::*;

/// Core result type
pub type Result<T> = std::result::Result<T, Error>;

/// Core error type
#[derive(Debug)]
pub enum Error {
    Io(std::io::Error),
    Serde(serde_json::Error),
    NotFound(String),
    InvalidInput(String),
}

impl std::fmt::Display for Error {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Error::Io(e) => write!(f, "I/O error: {}", e),
            Error::Serde(e) => write!(f, "serialization error: {}", e),
            Error::NotFound(s) => write!(f, "not found: {}", s),
            Error::InvalidInput(s) => write!(f, "invalid input: {}", s),
        }
    }
}

impl std::error::Error for Error {}

impl From<std::io::Error> for Error {
    fn from(e: std::io::Error) -> Self { Error::Io(e) }
}

impl From<serde_json::Error> for Error {
    fn from(e: serde_json::Error) -> Self { Error::Serde(e) }
}
