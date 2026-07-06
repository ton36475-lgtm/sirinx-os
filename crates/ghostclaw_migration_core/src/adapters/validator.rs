//! Validator result model for deterministic local checks.

use crate::schema::{escape_json, option_json};

/// One deterministic validation check.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ValidationCheck {
    /// Check name.
    pub name: String,
    /// Whether the check passed.
    pub passed: bool,
    /// Optional evidence path or note.
    pub evidence: Option<String>,
}

/// Aggregated validation result.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ValidatorResult {
    /// Packet or job id being validated.
    pub target_id: String,
    /// Aggregated status.
    pub status: String,
    /// Checks used to decide the status.
    pub checks: Vec<ValidationCheck>,
    /// Whether live execution was performed.
    pub executed_live: bool,
}

impl ValidatorResult {
    /// Builds a result from deterministic checks.
    pub fn from_checks(target_id: impl Into<String>, checks: Vec<ValidationCheck>) -> Self {
        let status = if checks.iter().all(|check| check.passed) {
            "pass"
        } else {
            "failed"
        };
        Self {
            target_id: target_id.into(),
            status: status.to_string(),
            checks,
            executed_live: false,
        }
    }

    /// Serializes to compact JSON.
    pub fn to_json(&self) -> String {
        let checks = self
            .checks
            .iter()
            .map(|check| {
                format!(
                    "{{\"name\":\"{}\",\"passed\":{},\"evidence\":{}}}",
                    escape_json(&check.name),
                    check.passed,
                    option_json(check.evidence.as_deref())
                )
            })
            .collect::<Vec<_>>()
            .join(",");
        format!(
            "{{\"target_id\":\"{}\",\"status\":\"{}\",\"executed_live\":{},\"checks\":[{}]}}",
            escape_json(&self.target_id),
            escape_json(&self.status),
            self.executed_live,
            checks
        )
    }
}
