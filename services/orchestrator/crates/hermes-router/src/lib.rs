//! Evidence-producing model router with integer budget enforcement.

mod routing_vectors;

use hermes_core::{canonical_json_bytes, hash_bytes, EvidenceHash, RiskTier, TaskId};
pub use routing_vectors::{ModelRole, ProviderApproval, ProviderKind, RouteCandidate};
use serde::{Deserialize, Serialize};

/// Router policy shared by all candidates.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct RoutingPolicy {
    /// Daily integer cost ceiling.
    pub daily_cap_micros: u64,
    /// Whether any external provider can be considered.
    pub external_providers_enabled: bool,
    /// Ordered deterministic candidate list.
    pub candidates: Vec<RouteCandidate>,
}

/// One model routing request.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct RouteRequest {
    /// Task requesting inference.
    pub task_id: TaskId,
    /// Workflow role.
    pub role: ModelRole,
    /// Immutable task risk tier.
    pub tier: RiskTier,
    /// Estimated input tokens.
    pub input_tokens: u64,
    /// Maximum output tokens.
    pub output_tokens: u64,
    /// Whether the prompt contains source, customer, credential-adjacent, or
    /// otherwise non-exportable data.
    pub sensitive_data: bool,
    /// Exact external provider approval, if one exists.
    pub provider_approval: Option<ProviderApproval>,
}

/// Daily integer budget state. Persistence adapters must update it atomically.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct BudgetLedger {
    /// Operator/runtime-defined UTC day key.
    pub day_key: String,
    /// Reserved or consumed integer micro-units.
    pub spent_micros: u64,
}

impl BudgetLedger {
    /// Creates a validated budget ledger.
    pub fn new(day_key: impl Into<String>, spent_micros: u64) -> Result<Self, RouterError> {
        let day_key = day_key.into();
        if day_key.len() != 10
            || day_key.as_bytes().get(4) != Some(&b'-')
            || day_key.as_bytes().get(7) != Some(&b'-')
            || !day_key
                .bytes()
                .enumerate()
                .all(|(index, byte)| matches!(index, 4 | 7) || byte.is_ascii_digit())
        {
            return Err(RouterError::InvalidDayKey);
        }
        Ok(Self {
            day_key,
            spent_micros,
        })
    }

    fn reserve(&mut self, amount: u64, daily_cap: u64) -> Result<(u64, u64), RouterError> {
        let before = self.spent_micros;
        let after = before
            .checked_add(amount)
            .ok_or(RouterError::BudgetOverflow)?;
        if after > daily_cap {
            return Err(RouterError::DailyBudgetExceeded);
        }
        self.spent_micros = after;
        Ok((before, after))
    }
}

/// Complete route and budget decision receipt.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct RouteReceipt {
    /// Task receiving the model route.
    pub task_id: TaskId,
    /// Selected configured route.
    pub route_id: String,
    /// Provider boundary.
    pub provider: ProviderKind,
    /// Selected model identifier.
    pub model: String,
    /// Reserved integer cost estimate.
    pub estimated_cost_micros: u64,
    /// Daily spend before reservation.
    pub budget_before_micros: u64,
    /// Daily spend after reservation.
    pub budget_after_micros: u64,
    /// External provider approval hash, when applicable.
    pub provider_approval_hash: Option<EvidenceHash>,
    /// Digest of the exact request.
    pub request_hash: EvidenceHash,
    /// Digest of all preceding receipt fields.
    pub receipt_hash: EvidenceHash,
}

#[derive(Serialize)]
#[serde(deny_unknown_fields)]
struct UnsignedRouteReceipt<'a> {
    task_id: &'a TaskId,
    route_id: &'a str,
    provider: ProviderKind,
    model: &'a str,
    estimated_cost_micros: u64,
    budget_before_micros: u64,
    budget_after_micros: u64,
    provider_approval_hash: &'a Option<EvidenceHash>,
    request_hash: &'a EvidenceHash,
}

/// Stateless route selector.
#[derive(Debug, Clone, Copy, Default)]
pub struct Router;

impl Router {
    /// Selects the first eligible configured candidate and atomically reserves
    /// its estimated cost in the supplied ledger.
    pub fn route(
        policy: &RoutingPolicy,
        request: &RouteRequest,
        budget: &mut BudgetLedger,
    ) -> Result<RouteReceipt, RouterError> {
        if request.input_tokens == 0 || request.output_tokens == 0 {
            return Err(RouterError::InvalidTokenEstimate);
        }
        if request.sensitive_data && request.provider_approval.is_some() {
            return Err(RouterError::SensitiveDataCannotLeaveHost);
        }
        let request_value = serde_json::to_value(request)?;
        let request_hash = hash_bytes(
            b"hermes.route-request.v1",
            &[&canonical_json_bytes(&request_value)?],
        );
        for candidate in &policy.candidates {
            candidate.validate()?;
            if !candidate.enabled || candidate.role != request.role {
                continue;
            }
            if request.input_tokens > candidate.max_input_tokens
                || request.output_tokens > candidate.max_output_tokens
            {
                continue;
            }
            let provider_approval_hash = if candidate.is_external() {
                if !policy.external_providers_enabled || request.sensitive_data {
                    continue;
                }
                let approval = request
                    .provider_approval
                    .as_ref()
                    .filter(|approval| approval.provider == candidate.provider);
                let Some(approval) = approval else {
                    continue;
                };
                Some(approval.approval_hash.clone())
            } else {
                None
            };
            let estimated_cost_micros = estimate_cost(candidate, request)?;
            if estimated_cost_micros > candidate.max_request_cost_micros {
                continue;
            }
            let (budget_before_micros, budget_after_micros) =
                budget.reserve(estimated_cost_micros, policy.daily_cap_micros)?;
            let unsigned = UnsignedRouteReceipt {
                task_id: &request.task_id,
                route_id: &candidate.route_id,
                provider: candidate.provider,
                model: &candidate.model,
                estimated_cost_micros,
                budget_before_micros,
                budget_after_micros,
                provider_approval_hash: &provider_approval_hash,
                request_hash: &request_hash,
            };
            let value = serde_json::to_value(unsigned)?;
            let receipt_hash = hash_bytes(
                b"hermes.route-receipt.v1",
                &[&canonical_json_bytes(&value)?],
            );
            return Ok(RouteReceipt {
                task_id: request.task_id.clone(),
                route_id: candidate.route_id.clone(),
                provider: candidate.provider,
                model: candidate.model.clone(),
                estimated_cost_micros,
                budget_before_micros,
                budget_after_micros,
                provider_approval_hash,
                request_hash,
                receipt_hash,
            });
        }
        Err(RouterError::NoEligibleRoute)
    }
}

fn estimate_cost(candidate: &RouteCandidate, request: &RouteRequest) -> Result<u64, RouterError> {
    let input = u128::from(request.input_tokens)
        .checked_mul(u128::from(candidate.input_cost_micros_per_million))
        .ok_or(RouterError::CostOverflow)?;
    let output = u128::from(request.output_tokens)
        .checked_mul(u128::from(candidate.output_cost_micros_per_million))
        .ok_or(RouterError::CostOverflow)?;
    let total = input.checked_add(output).ok_or(RouterError::CostOverflow)?;
    let rounded = total
        .checked_add(999_999)
        .ok_or(RouterError::CostOverflow)?
        / 1_000_000;
    u64::try_from(rounded).map_err(|_| RouterError::CostOverflow)
}

/// Route configuration, data-policy, or budget rejection.
#[derive(Debug, thiserror::Error)]
pub enum RouterError {
    /// A candidate has malformed identity or limits.
    #[error("route candidate is invalid")]
    InvalidCandidate,
    /// Unknown providers fail closed.
    #[error("route candidate uses an unknown provider")]
    UnknownProvider,
    /// Local routes cannot declare remote provider charges.
    #[error("local route cannot declare provider token cost")]
    InvalidLocalCost,
    /// Day key must be a strict `YYYY-MM-DD` wire value.
    #[error("budget ledger day key is invalid")]
    InvalidDayKey,
    /// Token estimates must be positive.
    #[error("route token estimates must be positive")]
    InvalidTokenEstimate,
    /// Sensitive data never leaves the host through this router.
    #[error("sensitive route data cannot use an external provider")]
    SensitiveDataCannotLeaveHost,
    /// No configured route met role, token, data, provider, and cost policy.
    #[error("no eligible model route")]
    NoEligibleRoute,
    /// Cost arithmetic overflowed.
    #[error("route cost calculation overflow")]
    CostOverflow,
    /// Budget arithmetic overflowed.
    #[error("budget ledger overflow")]
    BudgetOverflow,
    /// Route reservation would exceed the daily cap.
    #[error("daily model budget exceeded")]
    DailyBudgetExceeded,
    /// Strict evidence serialization failed.
    #[error("failed to serialize route evidence: {0}")]
    Serialization(#[from] serde_json::Error),
}

#[cfg(test)]
mod tests {
    use super::*;

    fn local_candidate() -> RouteCandidate {
        RouteCandidate {
            route_id: "local-checker".to_owned(),
            role: ModelRole::Checker,
            provider: ProviderKind::Local,
            model: "qwen-local".to_owned(),
            enabled: true,
            max_input_tokens: 16_000,
            max_output_tokens: 4_000,
            input_cost_micros_per_million: 0,
            output_cost_micros_per_million: 0,
            max_request_cost_micros: 0,
        }
    }

    fn external_candidate() -> RouteCandidate {
        RouteCandidate {
            route_id: "remote-checker".to_owned(),
            role: ModelRole::Checker,
            provider: ProviderKind::CloudflareAi,
            model: "approved-model".to_owned(),
            enabled: true,
            max_input_tokens: 16_000,
            max_output_tokens: 4_000,
            input_cost_micros_per_million: 1_000,
            output_cost_micros_per_million: 2_000,
            max_request_cost_micros: 100,
        }
    }

    fn request() -> RouteRequest {
        RouteRequest {
            task_id: TaskId::new("gc-route-test").expect("valid task id"),
            role: ModelRole::Checker,
            tier: RiskTier::Medium,
            input_tokens: 1_000,
            output_tokens: 500,
            sensitive_data: false,
            provider_approval: None,
        }
    }

    #[test]
    fn external_route_should_require_exact_provider_approval() {
        let policy = RoutingPolicy {
            daily_cap_micros: 1_000,
            external_providers_enabled: true,
            candidates: vec![external_candidate()],
        };
        let mut budget = BudgetLedger::new("2026-07-14", 0).expect("valid ledger");

        let error = Router::route(&policy, &request(), &mut budget)
            .expect_err("external route without approval must fail");

        assert!(matches!(error, RouterError::NoEligibleRoute));
    }

    #[test]
    fn sensitive_data_should_use_local_route_only() {
        let policy = RoutingPolicy {
            daily_cap_micros: 1_000,
            external_providers_enabled: true,
            candidates: vec![external_candidate(), local_candidate()],
        };
        let mut request = request();
        request.sensitive_data = true;
        let mut budget = BudgetLedger::new("2026-07-14", 0).expect("valid ledger");

        let receipt = Router::route(&policy, &request, &mut budget)
            .expect("local route should admit sensitive data");

        assert_eq!(receipt.provider, ProviderKind::Local);
    }

    #[test]
    fn route_should_reserve_integer_budget_and_emit_receipt() {
        let policy = RoutingPolicy {
            daily_cap_micros: 1_000,
            external_providers_enabled: true,
            candidates: vec![external_candidate()],
        };
        let mut request = request();
        request.provider_approval = Some(ProviderApproval {
            approval_hash: EvidenceHash::genesis(),
            provider: ProviderKind::CloudflareAi,
        });
        let mut budget = BudgetLedger::new("2026-07-14", 10).expect("valid ledger");

        let receipt = Router::route(&policy, &request, &mut budget)
            .expect("approved external route should pass");

        assert_eq!(receipt.budget_after_micros, 12);
    }

    #[test]
    fn route_should_fail_when_daily_budget_is_exceeded() {
        let policy = RoutingPolicy {
            daily_cap_micros: 11,
            external_providers_enabled: true,
            candidates: vec![external_candidate()],
        };
        let mut request = request();
        request.provider_approval = Some(ProviderApproval {
            approval_hash: EvidenceHash::genesis(),
            provider: ProviderKind::CloudflareAi,
        });
        let mut budget = BudgetLedger::new("2026-07-14", 10).expect("valid ledger");

        let error =
            Router::route(&policy, &request, &mut budget).expect_err("route should exceed cap");

        assert!(matches!(error, RouterError::DailyBudgetExceeded));
    }
}
