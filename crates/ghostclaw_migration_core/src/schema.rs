//! Schema types shared by parser, policy, engine, and receipts.

use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::error::{MigrationError, Result};
use crate::redaction::redact_sensitive;

static NEXT_RECEIPT_SEQUENCE: AtomicU64 = AtomicU64::new(1);

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
            escape_json(&redact_sensitive(&self.task)),
            escape_json(&self.status),
            self.created_at_ms
        )
    }

    /// Parses route jobs written by [`RouteJob::to_json_line`].
    pub fn from_json_line(line: &str) -> Result<Self> {
        let lane_name =
            extract_string(line, "lane").ok_or(MigrationError::MissingArgument("lane"))?;
        let job = Self {
            id: extract_string(line, "id").ok_or(MigrationError::MissingArgument("id"))?,
            lane: Lane::parse(&lane_name)?,
            task: extract_string(line, "task").ok_or(MigrationError::MissingArgument("task"))?,
            status: extract_string(line, "status")
                .ok_or(MigrationError::MissingArgument("status"))?,
            created_at_ms: extract_number(line, "created_at_ms")
                .ok_or(MigrationError::MissingArgument("created_at_ms"))?,
        };
        validate_persisted_timestamp(job.created_at_ms)?;
        require_canonical_json_line(line, &job.to_json_line(), "route_job")?;
        Ok(job)
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
        let created_at_ms = now_millis();
        Self {
            id: format!(
                "rcpt-{created_at_ms}-{}",
                NEXT_RECEIPT_SEQUENCE.fetch_add(1, Ordering::Relaxed)
            ),
            command_kind: command_kind.into(),
            status: status.into(),
            redacted_command: redact_sensitive(raw_command),
            lane: lane.map(|value| value.as_str().to_string()),
            task: task.map(redact_sensitive),
            reason: reason.map(|value| redact_sensitive(&value)),
            created_at_ms,
        }
    }

    /// Serializes to one-line JSON without external dependencies.
    pub fn to_json_line(&self) -> String {
        format!(
            "{{\"id\":\"{}\",\"command_kind\":\"{}\",\"status\":\"{}\",\"redacted_command\":\"{}\",\"lane\":{},\"task\":{},\"reason\":{},\"created_at_ms\":{}}}",
            escape_json(&self.id),
            escape_json(&self.command_kind),
            escape_json(&self.status),
            escape_json(&redact_sensitive(&self.redacted_command)),
            option_json(self.lane.as_deref()),
            redacted_option_json(self.task.as_deref()),
            redacted_option_json(self.reason.as_deref()),
            self.created_at_ms
        )
    }

    /// Parses receipts written by [`Receipt::to_json_line`].
    pub fn from_json_line(line: &str) -> Result<Self> {
        let receipt = Self {
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
            created_at_ms: extract_number(line, "created_at_ms")
                .ok_or(MigrationError::MissingArgument("created_at_ms"))?,
        };
        validate_persisted_timestamp(receipt.created_at_ms)?;
        require_canonical_json_line(line, &receipt.to_json_line(), "receipt")?;
        Ok(receipt)
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
            '\u{08}' => output.push_str("\\b"),
            '\u{0c}' => output.push_str("\\f"),
            ch if ch <= '\u{1f}' => {
                const HEX: &[u8; 16] = b"0123456789abcdef";
                let code = ch as u8;
                output.push_str("\\u00");
                output.push(HEX[(code >> 4) as usize] as char);
                output.push(HEX[(code & 0x0f) as usize] as char);
            }
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

/// Emits a redacted JSON string or null at a persistence boundary.
pub fn redacted_option_json(value: Option<&str>) -> String {
    value.map_or_else(
        || "null".to_string(),
        |text| format!("\"{}\"", escape_json(&redact_sensitive(text))),
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

fn validate_persisted_timestamp(created_at_ms: u128) -> Result<()> {
    if created_at_ms == 0 {
        return Err(MigrationError::InvalidArgument {
            name: "created_at_ms",
            value: "zero".to_string(),
        });
    }
    Ok(())
}

fn require_canonical_json_line(
    actual: &str,
    expected: &str,
    record_name: &'static str,
) -> Result<()> {
    if actual != expected {
        return Err(MigrationError::InvalidArgument {
            name: record_name,
            value: "non_canonical_jsonl".to_string(),
        });
    }
    Ok(())
}

fn read_json_string_at(line: &str, start: usize) -> Option<String> {
    let mut output = String::new();
    let mut chars = line[start..].chars();
    while let Some(ch) = chars.next() {
        match ch {
            '\\' => match chars.next()? {
                'n' => output.push('\n'),
                'r' => output.push('\r'),
                't' => output.push('\t'),
                'b' => output.push('\u{08}'),
                'f' => output.push('\u{0c}'),
                '\\' => output.push('\\'),
                '/' => output.push('/'),
                '"' => output.push('"'),
                'u' => {
                    let mut value = 0u32;
                    for _ in 0..4 {
                        value = value.checked_mul(16)? + chars.next()?.to_digit(16)?;
                    }
                    output.push(char::from_u32(value)?);
                }
                _ => return None,
            },
            '"' => return Some(output),
            control if control <= '\u{1f}' => return None,
            other => output.push(other),
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::{escape_json, Receipt, RouteJob};

    #[test]
    fn json_escape_should_cover_all_ascii_control_characters() {
        let escaped = escape_json("a\u{0}b\u{08}c\u{0c}d");

        assert_eq!(escaped, "a\\u0000b\\bc\\fd");
    }

    #[test]
    fn receipt_json_should_round_trip_control_characters() {
        let receipt = Receipt {
            id: "control\u{0}id".to_string(),
            command_kind: "test".to_string(),
            status: "ok".to_string(),
            redacted_command: "safe".to_string(),
            lane: None,
            task: None,
            reason: Some("line\u{08}break".to_string()),
            created_at_ms: 1,
        };

        assert_eq!(
            Receipt::from_json_line(&receipt.to_json_line()).unwrap(),
            receipt
        );
    }

    #[test]
    fn persisted_records_should_require_timestamps() {
        assert!(RouteJob::from_json_line(
            "{\"id\":\"job\",\"lane\":\"review\",\"task\":\"inspect\",\"status\":\"queued\"}"
        )
        .is_err());
        assert!(Receipt::from_json_line(
            "{\"id\":\"receipt\",\"command_kind\":\"status\",\"status\":\"ok\",\"redacted_command\":\"/status\",\"lane\":null,\"task\":null,\"reason\":null}"
        )
        .is_err());
    }

    #[test]
    fn persisted_records_should_reject_zero_timestamps() {
        assert!(RouteJob::from_json_line(
            "{\"id\":\"job\",\"lane\":\"review\",\"task\":\"inspect\",\"status\":\"queued\",\"created_at_ms\":0}"
        )
        .is_err());
        assert!(Receipt::from_json_line(
            "{\"id\":\"receipt\",\"command_kind\":\"status\",\"status\":\"ok\",\"redacted_command\":\"/status\",\"lane\":null,\"task\":null,\"reason\":null,\"created_at_ms\":0}"
        )
        .is_err());
    }

    #[test]
    fn persisted_records_should_reject_trailing_content() {
        assert!(RouteJob::from_json_line(
            "{\"id\":\"job\",\"lane\":\"review\",\"task\":\"inspect\",\"status\":\"queued\",\"created_at_ms\":1} trailing"
        )
        .is_err());
        assert!(Receipt::from_json_line(
            "{\"id\":\"receipt\",\"command_kind\":\"status\",\"status\":\"ok\",\"redacted_command\":\"/status\",\"lane\":null,\"task\":null,\"reason\":null,\"created_at_ms\":1} trailing"
        )
        .is_err());
    }

    #[test]
    fn persisted_records_should_reject_duplicate_keys() {
        assert!(RouteJob::from_json_line(
            "{\"id\":\"job\",\"id\":\"shadow\",\"lane\":\"review\",\"task\":\"inspect\",\"status\":\"queued\",\"created_at_ms\":1}"
        )
        .is_err());
        assert!(Receipt::from_json_line(
            "{\"id\":\"receipt\",\"id\":\"shadow\",\"command_kind\":\"status\",\"status\":\"ok\",\"redacted_command\":\"/status\",\"lane\":null,\"task\":null,\"reason\":null,\"created_at_ms\":1}"
        )
        .is_err());
    }

    #[test]
    fn generated_receipt_ids_should_be_unique_within_one_process() {
        let first = Receipt::new("test", "ok", "/status", None, None, None);
        let second = Receipt::new("test", "ok", "/status", None, None, None);

        assert_ne!(first.id, second.id);
    }

    #[test]
    fn receipt_serialization_should_redact_directly_constructed_fields() {
        let receipt = Receipt {
            id: "direct".to_string(),
            command_kind: "test".to_string(),
            status: "blocked".to_string(),
            redacted_command: "Authorization: Bearer abc123".to_string(),
            lane: None,
            task: Some("api_key raw-key".to_string()),
            reason: Some("token=raw-token".to_string()),
            created_at_ms: 1,
        };
        let json = receipt.to_json_line();

        assert!(!json.contains("abc123"));
        assert!(!json.contains("raw-key"));
        assert!(!json.contains("raw-token"));
        assert!(json.contains("[REDACTED_SECRET]"));
    }
}
