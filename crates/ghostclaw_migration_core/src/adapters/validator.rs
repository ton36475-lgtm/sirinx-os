//! Validator result model for deterministic local checks.

use crate::adapters::traits::ValidatorAdapter;
use crate::error::Result;
use crate::redaction::redact_sensitive;
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

/// Deterministic validator adapter backed by static local checks.
#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct StaticValidatorAdapter {
    checks: Vec<ValidationCheck>,
}

impl StaticValidatorAdapter {
    /// Creates a validator adapter from already-collected local checks.
    pub fn new(checks: Vec<ValidationCheck>) -> Self {
        Self { checks }
    }
}

impl ValidatorAdapter for StaticValidatorAdapter {
    fn validate(&self, target_id: &str) -> Result<ValidatorResult> {
        Ok(ValidatorResult::from_checks(target_id, self.checks.clone()))
    }

    fn executed_live(&self) -> bool {
        false
    }
}

impl ValidatorResult {
    /// Builds a result from deterministic checks.
    pub fn from_checks(target_id: impl Into<String>, checks: Vec<ValidationCheck>) -> Self {
        let checks = checks
            .into_iter()
            .map(|mut check| {
                check.evidence = check.evidence.as_deref().map(redact_sensitive);
                check
            })
            .collect::<Vec<_>>();
        let status = if !checks.is_empty() && checks.iter().all(|check| check.passed) {
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

#[cfg(test)]
mod tests {
    use super::{ValidationCheck, ValidatorResult};

    #[test]
    fn empty_check_set_should_fail_closed() {
        let result = ValidatorResult::from_checks("empty", Vec::new());

        assert_eq!(result.status, "failed");
        assert!(!result.executed_live);
    }

    #[test]
    fn validation_evidence_should_be_redacted_on_ingest() {
        let result = ValidatorResult::from_checks(
            "redaction",
            vec![ValidationCheck {
                name: "provider_check".to_string(),
                passed: false,
                evidence: Some("api_key abc123".to_string()),
            }],
        );

        assert_eq!(
            result.checks[0].evidence.as_deref(),
            Some("api_key [REDACTED_SECRET]")
        );
    }
}
