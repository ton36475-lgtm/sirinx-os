//! Fail-closed action classification and dispatch planning.
//!
//! This crate never performs an effect. It produces an evidence-bound plan
//! that a persistence/runtime adapter can execute after state authorization.

use hermes_core::{
    canonical_json_bytes, hash_bytes, ActionImpact, ActionManifest, ActionManifestError,
    ActionType, EvidenceHash, RiskTier, TaskId, TaskState,
};
use hermes_governance::VerifiedApproval;
use serde::{Deserialize, Serialize};

/// Stable reasons supporting a risk classification.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum RiskReason {
    /// The action is strictly read-only.
    ReadOnly,
    /// The action writes only to an approved local scope.
    LocalWrite,
    /// An action type is absent from the modeled safe vocabulary.
    UnknownAction,
    /// Network access can transfer data outside the local process.
    ExternalNetwork,
    /// Money or paid quota may be consumed.
    Spend,
    /// A message can reach an external person or system.
    ExternalMessage,
    /// Customer data is present.
    CustomerData,
    /// Secret material is accessed.
    SecretAccess,
    /// A production target is mutated.
    Production,
    /// An effect may be irreversible.
    Destructive,
    /// The action category itself requires an exact gate.
    GatedActionType,
}

/// Auditable risk classification.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct RiskClassification {
    /// Resulting tier.
    pub tier: RiskTier,
    /// Non-empty stable reason set.
    pub reasons: Vec<RiskReason>,
}

/// Classifies a strict action manifest without a permissive fallback.
pub fn classify_tier(manifest: &ActionManifest) -> Result<RiskClassification, DispatchError> {
    manifest.validate()?;
    if manifest.action_type == ActionType::ReadOnly {
        return Ok(RiskClassification {
            tier: RiskTier::Low,
            reasons: vec![RiskReason::ReadOnly],
        });
    }

    let local_write_impact = ActionImpact {
        writes_files: true,
        ..ActionImpact::default()
    };
    if manifest.action_type == ActionType::LocalWrite && manifest.impact == local_write_impact {
        return Ok(RiskClassification {
            tier: RiskTier::Medium,
            reasons: vec![RiskReason::LocalWrite],
        });
    }

    let mut reasons = Vec::new();
    if manifest.action_type == ActionType::Unknown {
        reasons.push(RiskReason::UnknownAction);
    }
    if manifest.impact.external_network {
        reasons.push(RiskReason::ExternalNetwork);
    }
    if manifest.impact.spends_money {
        reasons.push(RiskReason::Spend);
    }
    if manifest.impact.sends_messages {
        reasons.push(RiskReason::ExternalMessage);
    }
    if manifest.impact.customer_data {
        reasons.push(RiskReason::CustomerData);
    }
    if manifest.impact.accesses_secrets {
        reasons.push(RiskReason::SecretAccess);
    }
    if manifest.impact.production {
        reasons.push(RiskReason::Production);
    }
    if manifest.impact.destructive {
        reasons.push(RiskReason::Destructive);
    }
    if manifest.action_type != ActionType::Unknown {
        reasons.push(RiskReason::GatedActionType);
    }
    reasons.sort_unstable();
    reasons.dedup();
    Ok(RiskClassification {
        tier: RiskTier::High,
        reasons,
    })
}

/// Effect-free dispatch decision.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "kind", rename_all = "SCREAMING_SNAKE_CASE", deny_unknown_fields)]
pub enum DispatchDecision {
    /// LOW work may enter execution with a local policy receipt.
    ExecuteLocalPolicy,
    /// MED work must pause in a durable Workflow and resume from an event.
    AwaitWorkflowEvent {
        /// Stable event name expected by the workflow adapter.
        event_type: String,
    },
    /// HIGH work remains gated until a matching approval is consumed.
    AwaitApproval {
        /// Exact action digest that an approval grant must bind.
        action_hash: EvidenceHash,
    },
    /// HIGH work has a verified one-time approval.
    ExecuteApproved {
        /// Digest of the consumed grant used by the state receipt.
        grant_hash: EvidenceHash,
    },
}

/// Evidence-bound dispatch plan.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct DispatchPlan {
    /// Planned task.
    pub task_id: TaskId,
    /// Exact action digest.
    pub action_hash: EvidenceHash,
    /// Audited risk classification.
    pub classification: RiskClassification,
    /// Effect-free next decision.
    pub decision: DispatchDecision,
    /// Digest of all preceding plan fields.
    pub receipt_hash: EvidenceHash,
}

#[derive(Serialize)]
#[serde(deny_unknown_fields)]
struct UnsignedDispatchPlan<'a> {
    task_id: &'a TaskId,
    action_hash: &'a EvidenceHash,
    classification: &'a RiskClassification,
    decision: &'a DispatchDecision,
}

/// Stateless dispatch planner.
#[derive(Debug, Clone, Copy, Default)]
pub struct Dispatcher;

impl Dispatcher {
    /// Produces a plan for a task at the policy guard boundary.
    pub fn plan(
        task_id: TaskId,
        current_state: TaskState,
        manifest: &ActionManifest,
        approval: Option<&VerifiedApproval>,
    ) -> Result<DispatchPlan, DispatchError> {
        let classification = classify_tier(manifest)?;
        let action_hash = manifest.evidence_hash()?;
        let decision = match classification.tier {
            RiskTier::Low => {
                require_state(current_state, TaskState::Guard)?;
                if approval.is_some() {
                    return Err(DispatchError::UnexpectedApproval);
                }
                DispatchDecision::ExecuteLocalPolicy
            }
            RiskTier::Medium => {
                require_state(current_state, TaskState::Guard)?;
                if approval.is_some() {
                    return Err(DispatchError::UnexpectedApproval);
                }
                DispatchDecision::AwaitWorkflowEvent {
                    event_type: "HERMES_MED_POLICY_RELEASE_V1".to_owned(),
                }
            }
            RiskTier::High => match approval {
                None => {
                    if !matches!(current_state, TaskState::Guard | TaskState::WaitingApproval) {
                        return Err(DispatchError::InvalidState {
                            expected: TaskState::Guard,
                            actual: current_state,
                        });
                    }
                    DispatchDecision::AwaitApproval {
                        action_hash: action_hash.clone(),
                    }
                }
                Some(approval) => {
                    require_state(current_state, TaskState::WaitingApproval)?;
                    if approval.task_id() != &task_id || approval.action_hash() != &action_hash {
                        return Err(DispatchError::ApprovalScopeMismatch);
                    }
                    if manifest.impact.spends_money {
                        let requested = manifest
                            .max_cost_micros
                            .ok_or(DispatchError::MissingCostLimit)?;
                        let approved = approval
                            .max_cost_micros()
                            .ok_or(DispatchError::ApprovalCostLimitMissing)?;
                        if requested > approved {
                            return Err(DispatchError::ApprovalCostLimitExceeded);
                        }
                    }
                    DispatchDecision::ExecuteApproved {
                        grant_hash: approval.grant_hash().clone(),
                    }
                }
            },
        };
        let unsigned = UnsignedDispatchPlan {
            task_id: &task_id,
            action_hash: &action_hash,
            classification: &classification,
            decision: &decision,
        };
        let value = serde_json::to_value(unsigned)?;
        let receipt_hash = hash_bytes(
            b"hermes.dispatch-plan.v1",
            &[&canonical_json_bytes(&value)?],
        );
        Ok(DispatchPlan {
            task_id,
            action_hash,
            classification,
            decision,
            receipt_hash,
        })
    }
}

fn require_state(actual: TaskState, expected: TaskState) -> Result<(), DispatchError> {
    if actual != expected {
        return Err(DispatchError::InvalidState { expected, actual });
    }
    Ok(())
}

/// Manifest, state, approval, or receipt planning error.
#[derive(Debug, thiserror::Error)]
pub enum DispatchError {
    /// Strict manifest validation failed.
    #[error(transparent)]
    InvalidManifest(#[from] ActionManifestError),
    /// Planning is only admitted at the expected state boundary.
    #[error("dispatch expected state {expected:?}, found {actual:?}")]
    InvalidState {
        /// Required task state.
        expected: TaskState,
        /// Current task state.
        actual: TaskState,
    },
    /// LOW/MED planning must not silently consume an unrelated grant.
    #[error("approval was supplied for an action that does not consume it")]
    UnexpectedApproval,
    /// Verified approval does not match task and action digest.
    #[error("verified approval scope does not match dispatch action")]
    ApprovalScopeMismatch,
    /// Paid action omitted its request cap.
    #[error("paid dispatch action is missing max_cost_micros")]
    MissingCostLimit,
    /// Paid approval omitted its cap.
    #[error("approval is missing a cost limit for paid work")]
    ApprovalCostLimitMissing,
    /// Requested cost exceeds the approved ceiling.
    #[error("requested cost exceeds approval cost limit")]
    ApprovalCostLimitExceeded,
    /// Strict evidence serialization failed.
    #[error("failed to serialize dispatch evidence: {0}")]
    Serialization(#[from] serde_json::Error),
}

#[cfg(test)]
mod tests {
    use hermes_core::{ActionTarget, IdempotencyKey};

    use super::*;

    fn manifest(action_type: ActionType, impact: ActionImpact) -> ActionManifest {
        ActionManifest {
            action_type,
            targets: vec![ActionTarget::new("repo/src").expect("valid target")],
            impact,
            max_cost_micros: None,
            idempotency_key: IdempotencyKey::new("request-dispatch-0001")
                .expect("valid idempotency key"),
        }
    }

    #[test]
    fn unknown_action_should_fail_closed_to_high() {
        let classification = classify_tier(&manifest(ActionType::Unknown, ActionImpact::default()))
            .expect("unknown is represented explicitly");

        assert_eq!(classification.tier, RiskTier::High);
    }

    #[test]
    fn scoped_local_write_should_require_medium_workflow() {
        let action = manifest(
            ActionType::LocalWrite,
            ActionImpact {
                writes_files: true,
                ..ActionImpact::default()
            },
        );

        let plan = Dispatcher::plan(
            TaskId::new("gc-dispatch-test").expect("valid task id"),
            TaskState::Guard,
            &action,
            None,
        )
        .expect("local write should produce a workflow plan");

        assert!(matches!(
            plan.decision,
            DispatchDecision::AwaitWorkflowEvent { .. }
        ));
    }

    #[test]
    fn external_network_should_require_high_approval() {
        let action = manifest(
            ActionType::ProviderCall,
            ActionImpact {
                external_network: true,
                ..ActionImpact::default()
            },
        );

        let plan = Dispatcher::plan(
            TaskId::new("gc-dispatch-test").expect("valid task id"),
            TaskState::Guard,
            &action,
            None,
        )
        .expect("gated action should return waiting plan");

        assert!(matches!(
            plan.decision,
            DispatchDecision::AwaitApproval { .. }
        ));
    }

    #[test]
    fn dispatch_should_reject_execution_from_wrong_state() {
        let action = manifest(ActionType::ReadOnly, ActionImpact::default());

        let error = Dispatcher::plan(
            TaskId::new("gc-dispatch-test").expect("valid task id"),
            TaskState::Triage,
            &action,
            None,
        )
        .expect_err("triage cannot dispatch");

        assert!(matches!(error, DispatchError::InvalidState { .. }));
    }
}
