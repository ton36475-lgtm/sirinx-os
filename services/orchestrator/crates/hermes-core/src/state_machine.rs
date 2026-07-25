//! Evidence-bound Hermes task state machine.

use serde::{Deserialize, Serialize};

use crate::{
    ActorId, CorrelationId, EvidenceHash, ReceiptChain, ReceiptError, RiskTier, TaskId, TaskState,
    TransitionReceipt,
};

/// Maximum number of `CHECKER -> MAKER` repair loops by default.
pub const DEFAULT_MAX_REPAIR_CYCLES: u8 = 3;

/// Evidence that authorizes entry into `EXECUTING`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "kind", rename_all = "SCREAMING_SNAKE_CASE", deny_unknown_fields)]
pub enum ExecutionAuthorization {
    /// LOW work was admitted by a deterministic local policy.
    LocalPolicy {
        /// Hash of the policy decision receipt.
        receipt_hash: EvidenceHash,
    },
    /// MED work resumed from an external durable workflow event.
    WorkflowEvent {
        /// Hash of the workflow event receipt.
        receipt_hash: EvidenceHash,
    },
    /// HIGH work received an explicit, scoped human approval.
    HumanApproval {
        /// Hash of the verified approval grant.
        grant_hash: EvidenceHash,
    },
}

impl ExecutionAuthorization {
    fn evidence_hash(&self) -> &EvidenceHash {
        match self {
            Self::LocalPolicy { receipt_hash } | Self::WorkflowEvent { receipt_hash } => {
                receipt_hash
            }
            Self::HumanApproval { grant_hash } => grant_hash,
        }
    }
}

/// Stateful transition engine with an embedded verified receipt chain.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct StateMachine {
    task_id: TaskId,
    correlation_id: CorrelationId,
    current_state: TaskState,
    tier: RiskTier,
    repair_cycles: u8,
    max_repair_cycles: u8,
    chain: ReceiptChain,
}

impl StateMachine {
    /// Creates a task in `INTAKE` with the default repair limit.
    #[must_use]
    pub fn new(task_id: TaskId, correlation_id: CorrelationId, tier: RiskTier) -> Self {
        Self::with_repair_limit(task_id, correlation_id, tier, DEFAULT_MAX_REPAIR_CYCLES)
    }

    /// Creates a task with an explicit bounded repair limit.
    #[must_use]
    pub fn with_repair_limit(
        task_id: TaskId,
        correlation_id: CorrelationId,
        tier: RiskTier,
        max_repair_cycles: u8,
    ) -> Self {
        Self {
            task_id,
            correlation_id,
            current_state: TaskState::Intake,
            tier,
            repair_cycles: 0,
            max_repair_cycles,
            chain: ReceiptChain::new(),
        }
    }

    /// Returns the current state.
    #[must_use]
    pub const fn current_state(&self) -> TaskState {
        self.current_state
    }

    /// Returns the immutable task risk tier.
    #[must_use]
    pub const fn tier(&self) -> RiskTier {
        self.tier
    }

    /// Returns how many checker repair loops have been consumed.
    #[must_use]
    pub const fn repair_cycles(&self) -> u8 {
        self.repair_cycles
    }

    /// Returns the verified transition history.
    #[must_use]
    pub const fn receipt_chain(&self) -> &ReceiptChain {
        &self.chain
    }

    /// Performs a non-execution state transition and appends its receipt.
    ///
    /// Entry to `EXECUTING` is deliberately unavailable here; callers must use
    /// [`Self::authorize_execution`] with tier-appropriate evidence.
    pub fn transition(
        &mut self,
        to_state: TaskState,
        actor: ActorId,
        occurred_at_ms: u64,
        payload: serde_json::Value,
    ) -> Result<TransitionReceipt, StateMachineError> {
        self.verify_invariants()?;
        if to_state == TaskState::Executing {
            return Err(StateMachineError::ExecutionAuthorizationRequired);
        }
        if !is_valid_non_execution_transition(self.current_state, to_state) {
            return Err(StateMachineError::IllegalTransition {
                from: self.current_state,
                to: to_state,
            });
        }
        if matches!(self.current_state, TaskState::Checker | TaskState::Failed)
            && to_state == TaskState::Maker
        {
            if self.repair_cycles >= self.max_repair_cycles {
                return Err(StateMachineError::RepairLimitExceeded {
                    limit: self.max_repair_cycles,
                });
            }
            self.repair_cycles += 1;
        }
        self.append_transition(to_state, actor, occurred_at_ms, payload)
    }

    /// Enters `EXECUTING` only with authorization matching the immutable tier.
    pub fn authorize_execution(
        &mut self,
        actor: ActorId,
        occurred_at_ms: u64,
        payload: serde_json::Value,
        authorization: ExecutionAuthorization,
    ) -> Result<TransitionReceipt, StateMachineError> {
        self.verify_invariants()?;
        let authorization_matches = matches!(
            (self.tier, self.current_state, &authorization),
            (
                RiskTier::Low,
                TaskState::Guard,
                ExecutionAuthorization::LocalPolicy { .. }
            ) | (
                RiskTier::Medium,
                TaskState::Guard,
                ExecutionAuthorization::WorkflowEvent { .. }
            ) | (
                RiskTier::High,
                TaskState::WaitingApproval,
                ExecutionAuthorization::HumanApproval { .. },
            )
        );
        if !authorization_matches {
            return Err(StateMachineError::AuthorizationMismatch {
                tier: self.tier,
                state: self.current_state,
            });
        }
        let mut envelope = serde_json::Map::new();
        envelope.insert(
            "authorization".to_owned(),
            serde_json::to_value(&authorization)?,
        );
        envelope.insert("payload".to_owned(), payload);
        envelope.insert(
            "authorization_hash".to_owned(),
            serde_json::Value::String(authorization.evidence_hash().to_string()),
        );
        self.append_transition(
            TaskState::Executing,
            actor,
            occurred_at_ms,
            serde_json::Value::Object(envelope),
        )
    }

    /// Verifies persisted state against its complete receipt history.
    pub fn verify_invariants(&self) -> Result<(), StateMachineError> {
        self.chain.verify()?;
        if self.repair_cycles > self.max_repair_cycles {
            return Err(StateMachineError::CorruptState);
        }
        let expected_state = self
            .chain
            .receipts()
            .last()
            .map_or(TaskState::Intake, |receipt| receipt.to_state);
        if self.current_state != expected_state {
            return Err(StateMachineError::CorruptState);
        }
        if let Some(first) = self.chain.receipts().first() {
            if first.task_id != self.task_id || first.correlation_id != self.correlation_id {
                return Err(StateMachineError::CorruptState);
            }
        }
        Ok(())
    }

    fn append_transition(
        &mut self,
        to_state: TaskState,
        actor: ActorId,
        occurred_at_ms: u64,
        payload: serde_json::Value,
    ) -> Result<TransitionReceipt, StateMachineError> {
        let receipt = TransitionReceipt::new(
            self.chain.next_sequence(),
            self.task_id.clone(),
            self.correlation_id.clone(),
            self.current_state,
            to_state,
            actor,
            occurred_at_ms,
            self.chain.head_hash(),
            payload,
        )?;
        self.chain.append(receipt.clone())?;
        self.current_state = to_state;
        Ok(receipt)
    }
}

const fn is_valid_non_execution_transition(from: TaskState, to: TaskState) -> bool {
    match from {
        TaskState::Intake => matches!(to, TaskState::Triage | TaskState::Aborted),
        TaskState::Triage => matches!(to, TaskState::Maker | TaskState::Aborted),
        TaskState::Maker => matches!(to, TaskState::Checker | TaskState::Aborted),
        TaskState::Checker => matches!(
            to,
            TaskState::Maker | TaskState::Guard | TaskState::Stalled | TaskState::Aborted
        ),
        TaskState::Guard => matches!(to, TaskState::WaitingApproval | TaskState::Aborted),
        TaskState::WaitingApproval => matches!(to, TaskState::Aborted),
        TaskState::Executing => {
            matches!(to, TaskState::Done | TaskState::Failed | TaskState::Aborted)
        }
        TaskState::Failed => matches!(
            to,
            TaskState::Maker | TaskState::Stalled | TaskState::Aborted
        ),
        TaskState::Done | TaskState::Stalled | TaskState::Aborted => false,
    }
}

/// State-machine policy or receipt error.
#[derive(Debug, thiserror::Error)]
pub enum StateMachineError {
    /// The requested edge is absent from the state graph.
    #[error("illegal transition from {from:?} to {to:?}")]
    IllegalTransition {
        /// Current state.
        from: TaskState,
        /// Requested state.
        to: TaskState,
    },
    /// Execution must use the authorization-specific API.
    #[error("entry to EXECUTING requires explicit authorization evidence")]
    ExecutionAuthorizationRequired,
    /// The authorization kind or current state does not match task risk.
    #[error("authorization does not match tier {tier:?} in state {state:?}")]
    AuthorizationMismatch {
        /// Immutable task risk.
        tier: RiskTier,
        /// Current task state.
        state: TaskState,
    },
    /// Checker repair loops reached their configured bound.
    #[error("repair cycle limit {limit} exceeded")]
    RepairLimitExceeded {
        /// Maximum admitted repair loops.
        limit: u8,
    },
    /// Persisted aggregate fields disagree with the verified receipt chain.
    #[error("state machine aggregate is inconsistent with its receipt chain")]
    CorruptState,
    /// Receipt hashing or chain verification failed.
    #[error(transparent)]
    Receipt(#[from] ReceiptError),
    /// Authorization evidence could not be serialized.
    #[error("failed to serialize authorization evidence: {0}")]
    Serialization(#[from] serde_json::Error),
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    fn machine(tier: RiskTier) -> StateMachine {
        StateMachine::new(
            TaskId::new("gc-state-test").expect("valid task id"),
            CorrelationId::new("corr-state-test").expect("valid correlation id"),
            tier,
        )
    }

    fn actor() -> ActorId {
        ActorId::new("state-test").expect("valid actor")
    }

    fn advance_to_guard(machine: &mut StateMachine) {
        for (timestamp, state) in [
            TaskState::Triage,
            TaskState::Maker,
            TaskState::Checker,
            TaskState::Guard,
        ]
        .into_iter()
        .enumerate()
        {
            machine
                .transition(state, actor(), timestamp as u64 + 1, json!({}))
                .expect("valid setup transition");
        }
    }

    #[test]
    fn transition_should_reject_illegal_edge() {
        let mut machine = machine(RiskTier::Low);

        let error = machine
            .transition(TaskState::Done, actor(), 1, json!({}))
            .expect_err("illegal edge must fail");

        assert!(matches!(
            error,
            StateMachineError::IllegalTransition {
                from: TaskState::Intake,
                to: TaskState::Done
            }
        ));
    }

    #[test]
    fn repair_cycle_should_stop_at_configured_limit() {
        let mut machine = StateMachine::with_repair_limit(
            TaskId::new("gc-repair-test").expect("valid task id"),
            CorrelationId::new("corr-repair-test").expect("valid correlation id"),
            RiskTier::Low,
            1,
        );
        machine
            .transition(TaskState::Triage, actor(), 1, json!({}))
            .expect("triage transition");
        machine
            .transition(TaskState::Maker, actor(), 2, json!({}))
            .expect("maker transition");
        machine
            .transition(TaskState::Checker, actor(), 3, json!({}))
            .expect("checker transition");
        machine
            .transition(TaskState::Maker, actor(), 4, json!({}))
            .expect("first repair");
        machine
            .transition(TaskState::Checker, actor(), 5, json!({}))
            .expect("second checker");

        let error = machine
            .transition(TaskState::Maker, actor(), 6, json!({}))
            .expect_err("second repair must exceed bound");

        assert!(matches!(
            error,
            StateMachineError::RepairLimitExceeded { limit: 1 }
        ));
    }

    #[test]
    fn high_risk_execution_should_require_waiting_approval_and_human_grant() {
        let mut machine = machine(RiskTier::High);
        advance_to_guard(&mut machine);

        let error = machine
            .authorize_execution(
                actor(),
                5,
                json!({}),
                ExecutionAuthorization::LocalPolicy {
                    receipt_hash: EvidenceHash::genesis(),
                },
            )
            .expect_err("local policy cannot authorize high risk");

        assert!(matches!(
            error,
            StateMachineError::AuthorizationMismatch {
                tier: RiskTier::High,
                state: TaskState::Guard
            }
        ));
    }

    #[test]
    fn high_risk_human_grant_should_create_verified_execution_receipt() {
        let mut machine = machine(RiskTier::High);
        advance_to_guard(&mut machine);
        machine
            .transition(TaskState::WaitingApproval, actor(), 5, json!({}))
            .expect("waiting approval transition");

        machine
            .authorize_execution(
                actor(),
                6,
                json!({"scope": "preview"}),
                ExecutionAuthorization::HumanApproval {
                    grant_hash: EvidenceHash::genesis(),
                },
            )
            .expect("human approval should authorize execution");

        assert!(machine.receipt_chain().verify().is_ok());
    }

    #[test]
    fn terminal_state_should_reject_further_transitions() {
        let mut machine = machine(RiskTier::Low);
        machine
            .transition(TaskState::Aborted, actor(), 1, json!({}))
            .expect("abort transition");

        let result = machine.transition(TaskState::Triage, actor(), 2, json!({}));

        assert!(result.is_err());
    }

    #[test]
    fn transition_should_reject_tampered_persisted_state() {
        let mut machine = machine(RiskTier::Low);
        machine
            .transition(TaskState::Triage, actor(), 1, json!({}))
            .expect("triage transition");
        machine.current_state = TaskState::Guard;

        let error = machine
            .transition(TaskState::Aborted, actor(), 2, json!({}))
            .expect_err("aggregate tampering must fail");

        assert!(matches!(error, StateMachineError::CorruptState));
    }
}
