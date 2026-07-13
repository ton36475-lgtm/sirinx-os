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

const DEFAULT_RECEIPT_LIMIT: usize = 10;
const MAX_RECEIPT_LIMIT: usize = 100;

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
    let arguments = parts.collect::<Vec<_>>();
    match command {
        "/status" => parse_without_arguments(&arguments, ParsedCommand::Status),
        "/quota" => parse_without_arguments(&arguments, ParsedCommand::Quota),
        "/pending" => parse_without_arguments(&arguments, ParsedCommand::Pending),
        "/receipts" => parse_receipts(&arguments),
        "/route" => parse_route(&arguments),
        other => Err(MigrationError::UnknownCommand(other.to_string())),
    }
}

fn parse_without_arguments(arguments: &[&str], command: ParsedCommand) -> Result<ParsedCommand> {
    if let Some(argument) = arguments.first() {
        return Err(MigrationError::UnexpectedArgument((*argument).to_string()));
    }
    Ok(command)
}

fn parse_receipts(arguments: &[&str]) -> Result<ParsedCommand> {
    if arguments.len() > 1 {
        return Err(MigrationError::UnexpectedArgument(arguments[1].to_string()));
    }
    let limit = match arguments.first() {
        Some(value) => value
            .parse::<usize>()
            .ok()
            .filter(|parsed| *parsed <= MAX_RECEIPT_LIMIT)
            .ok_or_else(|| MigrationError::InvalidArgument {
                name: "limit",
                value: (*value).to_string(),
            })?,
        None => DEFAULT_RECEIPT_LIMIT,
    };
    Ok(ParsedCommand::Receipts { limit })
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
