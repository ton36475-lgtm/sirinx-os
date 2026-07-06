//! Error types for the GhostClaw migration core.

use std::fmt::{Display, Formatter};

/// Crate-level result type.
pub type Result<T> = std::result::Result<T, MigrationError>;

/// Typed errors returned by deterministic command parsing and receipt IO.
#[derive(Debug)]
pub enum MigrationError {
    /// Command input was empty.
    EmptyCommand,
    /// Command name is not part of the frozen contract.
    UnknownCommand(String),
    /// Route lane is not part of the frozen lane contract.
    InvalidLane(String),
    /// A required argument was missing.
    MissingArgument(&'static str),
    /// Policy guard blocked the command.
    Blocked(String),
    /// System clock failed.
    Time,
    /// File IO failed.
    Io(std::io::Error),
}

impl Display for MigrationError {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::EmptyCommand => f.write_str("empty command"),
            Self::UnknownCommand(command) => write!(f, "unknown command: {command}"),
            Self::InvalidLane(lane) => write!(f, "invalid lane: {lane}"),
            Self::MissingArgument(name) => write!(f, "missing argument: {name}"),
            Self::Blocked(reason) => write!(f, "blocked by policy: {reason}"),
            Self::Time => f.write_str("system time error"),
            Self::Io(err) => write!(f, "io error: {err}"),
        }
    }
}

impl std::error::Error for MigrationError {}

impl From<std::io::Error> for MigrationError {
    fn from(value: std::io::Error) -> Self {
        Self::Io(value)
    }
}
