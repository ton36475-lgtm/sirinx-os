//! Python oracle fixture definitions for P101.
//!
//! This module does not import Python or execute `hermes_command_center.py`.
//! It only describes the fixture shapes that a future gated extractor can
//! produce from pure legacy functions.

use crate::redaction::redact_sensitive;
use crate::schema::{escape_json, option_json};

/// One expected legacy behavior fixture.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PythonOracleCase {
    /// Stable case name.
    pub name: String,
    /// Legacy pure function name.
    pub function_name: String,
    /// Redacted input sample.
    pub input: String,
    /// Expected normalized output.
    pub expected: String,
}

impl PythonOracleCase {
    /// Creates one redacted oracle case.
    pub fn new(
        name: impl Into<String>,
        function_name: impl Into<String>,
        input: impl AsRef<str>,
        expected: impl AsRef<str>,
    ) -> Self {
        Self {
            name: name.into(),
            function_name: function_name.into(),
            input: redact_sensitive(input.as_ref()),
            expected: normalize_python_oracle_value(expected.as_ref()),
        }
    }

    /// Serializes to compact JSON.
    pub fn to_json(&self) -> String {
        format!(
            "{{\"name\":\"{}\",\"function_name\":\"{}\",\"input\":\"{}\",\"expected\":\"{}\"}}",
            escape_json(&self.name),
            escape_json(&self.function_name),
            escape_json(&self.input),
            escape_json(&self.expected)
        )
    }
}

/// Fixture set for comparing Rust behavior to legacy Python pure functions.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PythonOracleFixtureSet {
    /// Source module name or path.
    pub source_module: String,
    /// Whether this fixture set was produced by live Python execution.
    pub executed_live: bool,
    /// Optional note for future extraction gates.
    pub note: Option<String>,
    /// Expected behavior cases.
    pub cases: Vec<PythonOracleCase>,
}

impl PythonOracleFixtureSet {
    /// Serializes to compact JSON.
    pub fn to_json(&self) -> String {
        let cases = self
            .cases
            .iter()
            .map(PythonOracleCase::to_json)
            .collect::<Vec<_>>()
            .join(",");
        format!(
            "{{\"source_module\":\"{}\",\"executed_live\":{},\"note\":{},\"cases\":[{}]}}",
            escape_json(&self.source_module),
            self.executed_live,
            option_json(self.note.as_deref()),
            cases
        )
    }
}

/// Returns the P101 local-only fixture contract for Hermes Python parity.
pub fn default_hermes_command_center_fixtures() -> PythonOracleFixtureSet {
    PythonOracleFixtureSet {
        source_module: "hermes_command_center.py".to_string(),
        executed_live: false,
        note: Some("fixture_contract_only_no_python_execution".to_string()),
        cases: vec![
            PythonOracleCase::new(
                "classify_model_fable",
                "classify_model",
                "fable5",
                "planner",
            ),
            PythonOracleCase::new("is_risky_push", "is_risky", "git push origin main", "true"),
            PythonOracleCase::new(
                "receipt_shape",
                "write_receipt",
                "route backend_core token=abc123",
                "redacted_receipt_json",
            ),
            PythonOracleCase::new(
                "codex_error_string",
                "run_codex",
                "provider failed after retries",
                "codex_provider_error",
            ),
        ],
    }
}

/// Normalizes expected values for fixture comparisons.
pub fn normalize_python_oracle_value(value: &str) -> String {
    redact_sensitive(value)
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}
