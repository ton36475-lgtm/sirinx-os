//! Frozen command parser for the migration core.

use crate::error::{MigrationError, Result};
use crate::schema::Lane;

/// Parsed command variants supported by P085.
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ParsedCommand {
    /// Report local-safe control-plane status.
    Status,
    /// Return placeholder quota/provider status.
    Quota,
    /// List queued route jobs.
    Pending,
    /// Read recent append-only receipts.
    Receipts { limit: usize },
    /// Queue route intent only, with no live worker execution.
    Route { lane: Lane, task: String },
}

/// Parses a raw command into the frozen command contract.
pub fn parse_command(raw: &str) -> Result<ParsedCommand> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err(MigrationError::EmptyCommand);
    }
    let mut parts = trimmed.split_whitespace();
    let Some(command) = parts.next() else {
        return Err(MigrationError::EmptyCommand);
    };
    match command {
        "/status" => Ok(ParsedCommand::Status),
        "/quota" => Ok(ParsedCommand::Quota),
        "/pending" => Ok(ParsedCommand::Pending),
        "/receipts" => {
            let limit = parts
                .next()
                .and_then(|value| value.parse().ok())
                .unwrap_or(10);
            Ok(ParsedCommand::Receipts { limit })
        }
        "/route" => parse_route(parts.collect::<Vec<_>>().as_slice()),
        other => Err(MigrationError::UnknownCommand(other.to_string())),
    }
}

fn parse_route(parts: &[&str]) -> Result<ParsedCommand> {
    let Some(lane_name) = parts.first() else {
        return Err(MigrationError::MissingArgument("lane"));
    };
    let lane = Lane::parse(lane_name)?;
    if parts.len() < 2 {
        return Err(MigrationError::MissingArgument("task"));
    }
    Ok(ParsedCommand::Route {
        lane,
        task: parts[1..].join(" "),
    })
}
