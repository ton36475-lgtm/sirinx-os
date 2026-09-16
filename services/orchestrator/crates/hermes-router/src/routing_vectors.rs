//! Strict model-route configuration types.

use hermes_core::EvidenceHash;
use serde::{Deserialize, Serialize};

/// Logical model role in the Hermes workflow.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ModelRole {
    /// Intake and risk classification.
    Triage,
    /// Artifact production.
    Maker,
    /// Verification and test review.
    Checker,
    /// Final policy review.
    Guard,
}

/// Provider boundary used for data-egress policy.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ProviderKind {
    /// Model runs on the same host or explicitly isolated local network.
    Local,
    /// Cloudflare Workers AI through an approved account binding.
    CloudflareAi,
    /// OpenRouter through an approved provider gate.
    OpenRouter,
    /// Explicit fail-closed marker for an unmodeled provider.
    Unknown,
}

/// One configured model candidate. No endpoint URL or credential is stored in
/// the domain layer; runtime bindings resolve provider connectivity.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct RouteCandidate {
    /// Stable route identifier.
    pub route_id: String,
    /// Workflow role served by the model.
    pub role: ModelRole,
    /// Provider trust boundary.
    pub provider: ProviderKind,
    /// Provider model identifier.
    pub model: String,
    /// Whether operators enabled this candidate.
    pub enabled: bool,
    /// Maximum admitted input tokens.
    pub max_input_tokens: u64,
    /// Maximum admitted output tokens.
    pub max_output_tokens: u64,
    /// Integer micro-unit price per million input tokens.
    pub input_cost_micros_per_million: u64,
    /// Integer micro-unit price per million output tokens.
    pub output_cost_micros_per_million: u64,
    /// Per-request ceiling for this route.
    pub max_request_cost_micros: u64,
}

impl RouteCandidate {
    /// Validates a route before it enters selection.
    pub fn validate(&self) -> Result<(), super::RouterError> {
        if self.route_id.is_empty()
            || self.route_id.len() > 128
            || !self.route_id.bytes().all(|byte| {
                byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.' | b':')
            })
        {
            return Err(super::RouterError::InvalidCandidate);
        }
        if self.model.is_empty() || self.model.len() > 256 {
            return Err(super::RouterError::InvalidCandidate);
        }
        if self.max_input_tokens == 0 || self.max_output_tokens == 0 {
            return Err(super::RouterError::InvalidCandidate);
        }
        if self.provider == ProviderKind::Unknown {
            return Err(super::RouterError::UnknownProvider);
        }
        if self.provider == ProviderKind::Local
            && (self.input_cost_micros_per_million != 0 || self.output_cost_micros_per_million != 0)
        {
            return Err(super::RouterError::InvalidLocalCost);
        }
        Ok(())
    }

    /// Returns whether the route crosses the local trust boundary.
    #[must_use]
    pub const fn is_external(&self) -> bool {
        !matches!(self.provider, ProviderKind::Local)
    }
}

/// External provider approval bound to a policy digest.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct ProviderApproval {
    /// Digest of the explicit provider/data policy approval.
    pub approval_hash: EvidenceHash,
    /// Exact provider admitted by that approval.
    pub provider: ProviderKind,
}
