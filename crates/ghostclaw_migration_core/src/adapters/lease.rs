//! Path lease checker for local-safe adapter scopes.

use crate::schema::escape_json;

/// Lease decision for a candidate path.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LeaseDecision {
    /// Candidate path.
    pub path: String,
    /// Whether the path is allowed.
    pub allowed: bool,
    /// Decision reason.
    pub reason: String,
}

impl LeaseDecision {
    /// Serializes the lease decision to compact JSON for receipts and fixtures.
    pub fn to_json(&self) -> String {
        format!(
            "{{\"path\":\"{}\",\"allowed\":{},\"reason\":\"{}\"}}",
            escape_json(&self.path),
            self.allowed,
            escape_json(&self.reason)
        )
    }
}

/// Checks candidate paths against allow and block patterns.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PathLeaseChecker {
    allowed_patterns: Vec<String>,
    blocked_patterns: Vec<String>,
}

impl PathLeaseChecker {
    /// Creates a path lease checker.
    pub fn new(allowed_patterns: Vec<String>, blocked_patterns: Vec<String>) -> Self {
        Self {
            allowed_patterns,
            blocked_patterns,
        }
    }

    /// Checks one repo-relative path.
    pub fn check(&self, path: &str) -> LeaseDecision {
        if self
            .blocked_patterns
            .iter()
            .any(|pattern| matches_pattern(pattern, path))
        {
            return LeaseDecision {
                path: path.to_string(),
                allowed: false,
                reason: "blocked_path_pattern".to_string(),
            };
        }
        if self
            .allowed_patterns
            .iter()
            .any(|pattern| matches_pattern(pattern, path))
        {
            return LeaseDecision {
                path: path.to_string(),
                allowed: true,
                reason: "allowed_path_pattern".to_string(),
            };
        }
        LeaseDecision {
            path: path.to_string(),
            allowed: false,
            reason: "no_allowed_path_pattern".to_string(),
        }
    }
}

fn matches_pattern(pattern: &str, path: &str) -> bool {
    if let Some(prefix) = pattern.strip_suffix("/**") {
        return path == prefix || path.starts_with(&format!("{prefix}/"));
    }
    if let Some(prefix) = pattern.strip_suffix('*') {
        return path.starts_with(prefix);
    }
    pattern == path
}
