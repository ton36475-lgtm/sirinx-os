//! GHOSTCLAW Core — domain types, governance state machine, evidence.
//!
//! This crate has NO I/O. Governance decisions are pure functions.
//!
//! Approval modes:
//! - Green:  auto-approve at GUARD
//! - Yellow: auto-approve after abort window
//! - Red:    HumanApprove / HumanReject only. There is no policy that satisfies
//!           the Red gate, because a gate a machine can satisfy is not a gate.
//!           See docs/decisions/P100-RED-AUTO-APPROVE-FINDING.md.

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
}

// ─── Errors ───────────────────────────────────────────────────────────────────

#[derive(Debug, thiserror::Error)]
pub enum GovError {
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
        // Red advances on a human decision and nothing else. There is deliberately
        // no policy-satisfied branch here: see docs/decisions/P100-RED-AUTO-APPROVE-FINDING.md.
        // A machine that can satisfy the gate is not gated.
        RiskTier::Red => match event {
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

    // ── The Red gate: nothing but a human moves it ──
    //
    // These replace four tests that asserted Red could auto-approve when a policy
    // of three self-reported booleans came back true. See
    // docs/decisions/P100-RED-AUTO-APPROVE-FINDING.md.

    #[test]
    fn red_does_not_advance_on_the_yellow_abort_window() {
        // The abort window is what makes Yellow automatic. On Red it must do nothing.
        let t = red_task();
        let out = advance(t, Event::AbortWindowElapsed).unwrap();
        assert_eq!(out.stage, Stage::Guard, "Red must still be waiting");
        assert!(matches!(out.approval, ApprovalState::Pending));
        assert!(out.audit.is_empty(), "nothing happened, so nothing to record");
    }

    #[test]
    fn red_does_not_advance_on_pipeline_events() {
        // No event that a worker can raise on its own may move Red.
        for ev in [
            Event::MakerProduced,
            Event::CheckerRan(passing_evidence()),
            Event::Triaged(RiskTier::Green),
        ] {
            let out = advance(red_task(), ev).unwrap();
            assert_eq!(out.stage, Stage::Guard);
            assert!(matches!(out.approval, ApprovalState::Pending));
        }
    }

    #[test]
    fn passing_evidence_alone_does_not_approve_red() {
        // Evidence is necessary for the Checker gate and insufficient for the Red one.
        let mut t = red_task();
        t.evidence.push(passing_evidence());
        let out = advance(t, Event::AbortWindowElapsed).unwrap();
        assert!(matches!(out.approval, ApprovalState::Pending));
    }

    #[test]
    fn an_approved_red_task_names_a_person() {
        let out = advance(red_task(), Event::HumanApprove("tony".into())).unwrap();
        match out.approval {
            ApprovalState::ApprovedBy(who) => {
                assert_eq!(who, "tony");
                assert!(!who.starts_with("auto:"), "an approver must be a person, not a policy tag");
            }
            other => panic!("expected ApprovedBy, got {other:?}"),
        }
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
