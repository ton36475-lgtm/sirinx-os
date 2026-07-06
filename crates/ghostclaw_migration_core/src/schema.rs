//! Schema types shared by parser, policy, engine, and receipts.

use std::time::{SystemTime, UNIX_EPOCH};

use crate::error::{MigrationError, Result};
use crate::redaction::redact_sensitive;

/// Origin-normalized command envelope.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommandEnvelope {
    /// Raw command text, for example `/route backend_core scan safely`.
    pub raw: String,
    /// Caller identity. Keep this non-secret and redacted at adapter boundaries.
    pub requester: String,
    /// Source surface, for example `telegram`, `cli`, or `codex-sidebar`.
    pub source: String,
    /// Optional working directory supplied by an adapter.
    pub cwd: Option<String>,
}

impl CommandEnvelope {
    /// Builds a CLI command envelope.
    pub fn cli(raw: impl Into<String>) -> Self {
        Self {
            raw: raw.into(),
            requester: "local_operator".to_string(),
            source: "cli".to_string(),
            cwd: None,
        }
    }
}

/// Canonical build/review lanes preserved from the GhostClaw packet contract.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Lane {
    BackendCore,
    DatabaseSchema,
    ServiceLogic,
    ApiContract,
    ApiHandler,
    ApiClientWiring,
    FrontendState,
    Components,
    Pages,
    LocalUat,
    Review,
}

impl Lane {
    /// Parses lane names and common aliases.
    pub fn parse(value: &str) -> Result<Self> {
        match normalize_lane(value).as_str() {
            "backend_core" | "backend" => Ok(Self::BackendCore),
            "database_schema" | "database" | "db_schema" => Ok(Self::DatabaseSchema),
            "service_logic" | "service" => Ok(Self::ServiceLogic),
            "api_contract" | "contract" => Ok(Self::ApiContract),
            "api_handler" | "handler" | "route_handler" => Ok(Self::ApiHandler),
            "api_client_wiring" | "api_client" | "client_wiring" => Ok(Self::ApiClientWiring),
            "frontend_state" | "state" | "hooks" => Ok(Self::FrontendState),
            "components" | "component" => Ok(Self::Components),
            "pages" | "page" => Ok(Self::Pages),
            "local_uat" | "uat" => Ok(Self::LocalUat),
            "review" | "reviewer" => Ok(Self::Review),
            _ => Err(MigrationError::InvalidLane(value.to_string())),
        }
    }

    /// Stable lane identifier for JSON responses and receipts.
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::BackendCore => "backend_core",
            Self::DatabaseSchema => "database_schema",
            Self::ServiceLogic => "service_logic",
            Self::ApiContract => "api_contract",
            Self::ApiHandler => "api_handler",
            Self::ApiClientWiring => "api_client_wiring",
            Self::FrontendState => "frontend_state",
            Self::Components => "components",
            Self::Pages => "pages",
            Self::LocalUat => "local_uat",
            Self::Review => "review",
        }
    }
}

fn normalize_lane(value: &str) -> String {
    value.trim().to_ascii_lowercase().replace('-', "_")
}

/// Queued route intent. This is not live execution.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RouteJob {
    /// Local route-job id.
    pub id: String,
    /// Selected lane.
    pub lane: Lane,
    /// Redacted task text.
    pub task: String,
    /// Local queue status.
    pub status: String,
    /// Unix timestamp in milliseconds.
    pub created_at_ms: u128,
}

impl RouteJob {
    /// Creates a queued route job with redacted task text.
    pub fn new(id: String, lane: Lane, task: &str) -> Self {
        Self {
            id,
            lane,
            task: redact_sensitive(task),
            status: "queued_local_safe_no_execution".to_string(),
            created_at_ms: now_millis(),
        }
    }

    /// Serializes to one-line JSON without external dependencies.
    pub fn to_json_line(&self) -> String {
        format!(
            "{{\"id\":\"{}\",\"lane\":\"{}\",\"task\":\"{}\",\"status\":\"{}\",\"created_at_ms\":{}}}",
            escape_json(&self.id),
            self.lane.as_str(),
            escape_json(&self.task),
            escape_json(&self.status),
            self.created_at_ms
        )
    }

    /// Parses route jobs written by [`RouteJob::to_json_line`].
    pub fn from_json_line(line: &str) -> Result<Self> {
        let lane_name =
            extract_string(line, "lane").ok_or(MigrationError::MissingArgument("lane"))?;
        Ok(Self {
            id: extract_string(line, "id").ok_or(MigrationError::MissingArgument("id"))?,
            lane: Lane::parse(&lane_name)?,
            task: extract_string(line, "task").ok_or(MigrationError::MissingArgument("task"))?,
            status: extract_string(line, "status")
                .ok_or(MigrationError::MissingArgument("status"))?,
            created_at_ms: extract_number(line, "created_at_ms").unwrap_or_default(),
        })
    }
}

/// Append-only receipt written after every handled command.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Receipt {
    /// Receipt id.
    pub id: String,
    /// Command kind, for example `status`, `route`, or `blocked`.
    pub command_kind: String,
    /// Receipt status.
    pub status: String,
    /// Redacted original command.
    pub redacted_command: String,
    /// Optional lane.
    pub lane: Option<String>,
    /// Optional queued task summary.
    pub task: Option<String>,
    /// Optional block or error reason.
    pub reason: Option<String>,
    /// Unix timestamp in milliseconds.
    pub created_at_ms: u128,
}

impl Receipt {
    /// Builds a receipt from command handling output.
    pub fn new(
        command_kind: impl Into<String>,
        status: impl Into<String>,
        raw_command: &str,
        lane: Option<Lane>,
        task: Option<&str>,
        reason: Option<String>,
    ) -> Self {
        Self {
            id: format!("rcpt-{}", now_millis()),
            command_kind: command_kind.into(),
            status: status.into(),
            redacted_command: redact_sensitive(raw_command),
            lane: lane.map(|value| value.as_str().to_string()),
            task: task.map(redact_sensitive),
            reason,
            created_at_ms: now_millis(),
        }
    }

    /// Serializes to one-line JSON without external dependencies.
    pub fn to_json_line(&self) -> String {
        format!(
            "{{\"id\":\"{}\",\"command_kind\":\"{}\",\"status\":\"{}\",\"redacted_command\":\"{}\",\"lane\":{},\"task\":{},\"reason\":{},\"created_at_ms\":{}}}",
            escape_json(&self.id),
            escape_json(&self.command_kind),
            escape_json(&self.status),
            escape_json(&self.redacted_command),
            option_json(self.lane.as_deref()),
            option_json(self.task.as_deref()),
            option_json(self.reason.as_deref()),
            self.created_at_ms
        )
    }

    /// Parses receipts written by [`Receipt::to_json_line`].
    pub fn from_json_line(line: &str) -> Result<Self> {
        Ok(Self {
            id: extract_string(line, "id").ok_or(MigrationError::MissingArgument("id"))?,
            command_kind: extract_string(line, "command_kind")
                .ok_or(MigrationError::MissingArgument("command_kind"))?,
            status: extract_string(line, "status")
                .ok_or(MigrationError::MissingArgument("status"))?,
            redacted_command: extract_string(line, "redacted_command")
                .ok_or(MigrationError::MissingArgument("redacted_command"))?,
            lane: extract_nullable_string(line, "lane"),
            task: extract_nullable_string(line, "task"),
            reason: extract_nullable_string(line, "reason"),
            created_at_ms: extract_number(line, "created_at_ms").unwrap_or_default(),
        })
    }
}

/// Returns the current Unix time in milliseconds. Falls back to `0` on clock error.
pub fn now_millis() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |duration| duration.as_millis())
}

/// Escapes a string for simple JSON emission.
pub fn escape_json(value: &str) -> String {
    let mut output = String::with_capacity(value.len());
    for ch in value.chars() {
        match ch {
            '\\' => output.push_str("\\\\"),
            '"' => output.push_str("\\\""),
            '\n' => output.push_str("\\n"),
            '\r' => output.push_str("\\r"),
            '\t' => output.push_str("\\t"),
            _ => output.push(ch),
        }
    }
    output
}

/// Emits a JSON string or null.
pub fn option_json(value: Option<&str>) -> String {
    value.map_or_else(
        || "null".to_string(),
        |text| format!("\"{}\"", escape_json(text)),
    )
}

fn extract_string(line: &str, key: &str) -> Option<String> {
    let needle = format!("\"{key}\":\"");
    let start = line.find(&needle)? + needle.len();
    read_json_string_at(line, start)
}

fn extract_nullable_string(line: &str, key: &str) -> Option<String> {
    extract_string(line, key)
}

fn extract_number(line: &str, key: &str) -> Option<u128> {
    let needle = format!("\"{key}\":");
    let start = line.find(&needle)? + needle.len();
    let tail = &line[start..];
    let digits: String = tail.chars().take_while(char::is_ascii_digit).collect();
    digits.parse().ok()
}

fn read_json_string_at(line: &str, start: usize) -> Option<String> {
    let mut escaped = false;
    let mut output = String::new();
    for ch in line[start..].chars() {
        if escaped {
            match ch {
                'n' => output.push('\n'),
                'r' => output.push('\r'),
                't' => output.push('\t'),
                '\\' => output.push('\\'),
                '"' => output.push('"'),
                other => output.push(other),
            }
            escaped = false;
            continue;
        }
        match ch {
            '\\' => escaped = true,
            '"' => return Some(output),
            other => output.push(other),
        }
    }
    None
}
