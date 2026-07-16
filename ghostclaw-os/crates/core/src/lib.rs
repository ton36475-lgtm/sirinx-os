//! GHOSTCLAW Core — domain types, governance state machine, evidence.
//!
//! This crate has NO I/O. Governance decisions are pure functions.
//!
//! Approval modes:
//! - Green:  auto-approve at GUARD
//! - Yellow: auto-approve after abort window
//! - Red:   auto-approve IF policy conditions met (evidence passed + safety checks + audit recorded)
//!          Manual override still available via HumanApprove/HumanReject.

use serde::{Deserialize, Serialize};

// ─── Risk Tiers ─────────────────────────────────────────────────────────────

/// Three-tier risk policy.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum RiskTier {
    Green,
    Yellow,
    Red,
}

/// The four hard-coded pipeline stages, in order.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum Stage {
    Triage,
    Maker,
    Checker,
    Guard,
    Done,
    Aborted,
}

// ─── Evidence ────────────────────────────────────────────────────────────────

/// Raw, verifiable evidence captured from a real process.
/// This is NOT an agent's claim — it is captured stdout/stderr + exit code.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Evidence {
    pub command: String,
    pub exit_code: i32,
    pub stdout: String,
    pub stderr: String,
}

impl Evidence {
    /// The ONLY definition of "passed". Exit code, not text analysis.
    pub fn passed(&self) -> bool {
        self.exit_code == 0
    }
}

// ─── Approval ────────────────────────────────────────────────────────────────

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum ApprovalState {
    NotRequired,
    Pending,
    ApprovedBy(String),
    Rejected(String),
}

// ─── Auto-Approve Policy ────────────────────────────────────────────────────

/// Conditions that must ALL be true for automated Red-tier approval.
/// If any is false, the task stays Pending and requires human override.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AutoPolicy {
    /// CHECKER evidence passed (exit_code == 0)
    pub evidence_passed: bool,
    /// Secret scan found no secrets in output
    pub secrets_clean: bool,
    /// Cost guard: spend within budget
    pub cost_within_budget: bool,
    /// Policy version tag (for audit trail)
    pub policy_version: String,
}

impl Default for AutoPolicy {
    fn default() -> Self {
        Self {
            evidence_passed: true,
            secrets_clean: true,
            cost_within_budget: true,
            policy_version: "auto-v1".into(),
        }
    }
}

impl AutoPolicy {
    /// ALL conditions must be true for auto-approval.
    pub fn all_conditions_met(&self) -> bool {
        self.evidence_passed && self.secrets_clean && self.cost_within_budget
    }

    /// Human-readable reason if auto-approval is blocked.
    pub fn block_reason(&self) -> Option<String> {
        let mut reasons = vec![];
        if !self.evidence_passed {
            reasons.push("CHECKER evidence failed");
        }
        if !self.secrets_clean {
            reasons.push("secrets detected in output");
        }
        if !self.cost_within_budget {
            reasons.push("cost budget exceeded");
        }
        if reasons.is_empty() {
            None
        } else {
            Some(reasons.join("; "))
        }
    }
}

// ─── Task ─────────────────────────────────────────────────────────────────────

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Task {
    pub id: String,
    pub description: String,
    pub stage: Stage,
    pub risk: RiskTier,
    pub approval: ApprovalState,
    pub evidence: Vec<Evidence>,
    pub branch: Option<String>,
    /// Audit trail: who/what approved and when
    #[serde(default)]
    pub audit: Vec<String>,
}

// ─── Events ──────────────────────────────────────────────────────────────────

#[derive(Clone, Debug)]
pub enum Event {
    Triaged(RiskTier),
    MakerProduced,
    CheckerRan(Evidence),
    HumanApprove(String),
    HumanReject(String),
    AbortWindowElapsed,
    /// Automated approval attempt — carries policy for audit
    AutoApproveAttempt(AutoPolicy),
}

// ─── Errors ───────────────────────────────────────────────────────────────────

#[derive(Debug, thiserror::Error)]
pub enum GovError {
    #[error("auto-approve blocked: {0}")]
    AutoBlocked(String),
    #[error("CHECKER evidence failed: exit code {0}")]
    EvidenceFailed(i32),
    #[error("illegal transition from {0:?}")]
    IllegalTransition(Stage),
}

// ─── State Machine ──────────────────────────────────────────────────────────

/// Pure function: (task, event) -> Result<Task, GovError>.
pub fn advance(mut task: Task, event: Event) -> Result<Task, GovError> {
    match (task.stage, event) {
        (Stage::Triage, Event::Triaged(tier)) => {
            task.risk = tier;
            task.approval = match tier {
                RiskTier::Red => ApprovalState::Pending,
                _ => ApprovalState::NotRequired,
            };
            task.stage = Stage::Maker;
            Ok(task)
        }
        (Stage::Maker, Event::MakerProduced) => {
            task.stage = Stage::Checker;
            Ok(task)
        }
        (Stage::Checker, Event::CheckerRan(ev)) => {
            if !ev.passed() {
                let code = ev.exit_code;
                task.evidence.push(ev);
                return Err(GovError::EvidenceFailed(code));
            }
            task.evidence.push(ev);
            task.stage = Stage::Guard;
            Ok(task)
        }
        (Stage::Guard, ev) => guard_transition(task, ev),
        (s, _) => Err(GovError::IllegalTransition(s)),
    }
}

/// GUARD gate logic — the single chokepoint.
fn guard_transition(mut task: Task, event: Event) -> Result<Task, GovError> {
    match task.risk {
        RiskTier::Green => {
            task.approval = ApprovalState::ApprovedBy("auto:green".into());
            task.audit.push(format!("auto-approved: green tier"));
            task.stage = Stage::Done;
            Ok(task)
        }
        RiskTier::Yellow => match event {
            Event::AbortWindowElapsed => {
                task.approval = ApprovalState::ApprovedBy("auto:yellow".into());
                task.audit.push(format!("auto-approved: yellow tier (abort window elapsed)"));
                task.stage = Stage::Done;
                Ok(task)
            }
            Event::HumanReject(who) => {
                task.approval = ApprovalState::Rejected(who.clone());
                task.audit.push(format!("rejected by {who}"));
                task.stage = Stage::Aborted;
                Ok(task)
            }
            _ => Ok(task),
        },
        RiskTier::Red => match event {
            // ── Automated approval: policy checks ALL pass → auto-approve with audit ──
            Event::AutoApproveAttempt(policy) => {
                if policy.all_conditions_met() {
                    let approver = format!("auto:red:{}", policy.policy_version);
                    task.approval = ApprovalState::ApprovedBy(approver.clone());
                    task.audit.push(format!(
                        "auto-approved: red tier | policy={} | evidence+secrets+cost all passed",
                        policy.policy_version
                    ));
                    task.stage = Stage::Done;
                    Ok(task)
                } else {
                    let reason = policy.block_reason().unwrap_or_default();
                    task.audit.push(format!("auto-approve blocked: {reason}"));
                    Err(GovError::AutoBlocked(reason))
                }
            }
            // ── Manual override still available ──
            Event::HumanApprove(who) => {
                task.approval = ApprovalState::ApprovedBy(who.clone());
                task.audit.push(format!("manual-approved by {who}"));
                task.stage = Stage::Done;
                Ok(task)
            }
            Event::HumanReject(who) => {
                task.approval = ApprovalState::Rejected(who.clone());
                task.audit.push(format!("rejected by {who}"));
                task.stage = Stage::Aborted;
                Ok(task)
            }
            _ => Ok(task),
        },
    }
}

// ─── Invariant Tests ────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn red_task() -> Task {
        Task {
            id: "test".into(),
            description: "test".into(),
            stage: Stage::Guard,
            risk: RiskTier::Red,
            approval: ApprovalState::Pending,
            evidence: vec![],
            branch: None,
            audit: vec![],
        }
    }

    fn passing_evidence() -> Evidence {
        Evidence {
            command: "cargo test".into(),
            exit_code: 0,
            stdout: "all passed".into(),
            stderr: "".into(),
        }
    }

    fn failing_evidence() -> Evidence {
        Evidence {
            command: "cargo test".into(),
            exit_code: 101,
            stdout: "".into(),
            stderr: "fail".into(),
        }
    }

    // ── Red auto-approve tests ──

    #[test]
    fn red_auto_approves_when_policy_passes() {
        let t = red_task();
        let policy = AutoPolicy::default(); // all true
        let result = advance(t, Event::AutoApproveAttempt(policy));
        assert!(result.is_ok());
        let done = result.unwrap();
        assert_eq!(done.stage, Stage::Done);
        assert!(done.audit.iter().any(|a| a.contains("auto-approved")));
    }

    #[test]
    fn red_auto_blocked_when_evidence_failed() {
        let t = red_task();
        let policy = AutoPolicy {
            evidence_passed: false,
            secrets_clean: true,
            cost_within_budget: true,
            policy_version: "auto-v1".into(),
        };
        let result = advance(t, Event::AutoApproveAttempt(policy));
        assert!(matches!(result, Err(GovError::AutoBlocked(_))));
    }

    #[test]
    fn red_auto_blocked_when_secrets_detected() {
        let t = red_task();
        let policy = AutoPolicy {
            evidence_passed: true,
            secrets_clean: false,
            cost_within_budget: true,
            policy_version: "auto-v1".into(),
        };
        let result = advance(t, Event::AutoApproveAttempt(policy));
        assert!(matches!(result, Err(GovError::AutoBlocked(_))));
    }

    #[test]
    fn red_auto_blocked_when_cost_exceeded() {
        let t = red_task();
        let policy = AutoPolicy {
            evidence_passed: true,
            secrets_clean: true,
            cost_within_budget: false,
            policy_version: "auto-v1".into(),
        };
        let result = advance(t, Event::AutoApproveAttempt(policy));
        assert!(matches!(result, Err(GovError::AutoBlocked(_))));
    }

    // ── Manual override still works ──

    #[test]
    fn red_still_approves_with_human() {
        let t = red_task();
        let result = advance(t, Event::HumanApprove("tony".into()));
        assert!(result.is_ok());
        let done = result.unwrap();
        assert_eq!(done.stage, Stage::Done);
        assert!(done.audit.iter().any(|a| a.contains("manual-approved")));
    }

    // ── Checker evidence tests ──

    #[test]
    fn checker_requires_passing_evidence() {
        let t = Task {
            id: "t2".into(),
            description: "t2".into(),
            stage: Stage::Checker,
            risk: RiskTier::Green,
            approval: ApprovalState::NotRequired,
            evidence: vec![],
            branch: None,
            audit: vec![],
        };
        assert!(advance(t.clone(), Event::CheckerRan(failing_evidence())).is_err());
        let ok = advance(t, Event::CheckerRan(passing_evidence())).unwrap();
        assert_eq!(ok.stage, Stage::Guard);
    }

    // ── Green auto-approve ──

    #[test]
    fn green_auto_approves_at_guard() {
        let t = Task {
            id: "t3".into(),
            description: "t3".into(),
            stage: Stage::Guard,
            risk: RiskTier::Green,
            approval: ApprovalState::NotRequired,
            evidence: vec![],
            branch: None,
            audit: vec![],
        };
        let result = advance(t, Event::AbortWindowElapsed).unwrap();
        assert_eq!(result.stage, Stage::Done);
    }
}
