//! The governance state machine.
//!
//! Two invariants are structural here, not conventional:
//!
//! 1. A Red task can only leave `PendingApproval` via `HumanApprove` /
//!    `HumanReject`. `AbortWindowElapsed` on a Red task is an error, not a
//!    no-op — a silent no-op would let a caller retry until something gave.
//! 2. `Guard` is unreachable without stored, *passing* Evidence.

use crate::{Evidence, RiskTier, Stage};
use std::fmt;

/// Events that can be applied to a task.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Event {
    /// TRIAGE assigned a tier.
    Triaged(RiskTier),
    /// MAKER finished producing work.
    MakerProduced,
    /// CHECKER ran a command and captured raw output.
    CheckerRan(Evidence),
    /// A human approved. `who` is recorded for audit.
    HumanApprove(String),
    /// A human rejected. `who` is recorded for audit.
    HumanReject(String),
    /// The abort window expired with no objection.
    AbortWindowElapsed,
    /// GUARD committed. GUARD never pushes.
    GuardCommitted,
}

impl Event {
    fn name(&self) -> &'static str {
        match self {
            Event::Triaged(_) => "Triaged",
            Event::MakerProduced => "MakerProduced",
            Event::CheckerRan(_) => "CheckerRan",
            Event::HumanApprove(_) => "HumanApprove",
            Event::HumanReject(_) => "HumanReject",
            Event::AbortWindowElapsed => "AbortWindowElapsed",
            Event::GuardCommitted => "GuardCommitted",
        }
    }
}

/// Why a transition was refused.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum GovernanceError {
    /// An elapsed abort window was applied to a Red task.
    HighGateViolation,
    /// CHECKER produced evidence with a non-zero exit code.
    FailingEvidence { exit_code: i32 },
    /// Something tried to reach GUARD with no stored evidence.
    MissingEvidence,
    /// The event is not legal from the current stage.
    InvalidTransition { from: Stage, event: &'static str },
}

impl fmt::Display for GovernanceError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            GovernanceError::HighGateViolation => write!(
                f,
                "high gate violation: a Red task can only advance on HumanApprove/HumanReject"
            ),
            GovernanceError::FailingEvidence { exit_code } => {
                write!(f, "checker evidence failed with exit code {exit_code}")
            }
            GovernanceError::MissingEvidence => {
                write!(f, "cannot reach GUARD without stored passing evidence")
            }
            GovernanceError::InvalidTransition { from, event } => {
                write!(
                    f,
                    "invalid transition: {event} from stage {}",
                    from.as_str()
                )
            }
        }
    }
}

impl std::error::Error for GovernanceError {}

/// A unit of governed work.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Task {
    id: String,
    tier: Option<RiskTier>,
    stage: Stage,
    evidence: Option<Evidence>,
    approved_by: Option<String>,
    rejected_by: Option<String>,
}

impl Task {
    /// A new task always starts untiered, at TRIAGE.
    pub fn new(id: impl Into<String>) -> Self {
        Self {
            id: id.into(),
            tier: None,
            stage: Stage::Triage,
            evidence: None,
            approved_by: None,
            rejected_by: None,
        }
    }

    pub fn id(&self) -> &str {
        &self.id
    }

    pub fn tier(&self) -> Option<RiskTier> {
        self.tier
    }

    pub fn stage(&self) -> Stage {
        self.stage
    }

    pub fn evidence(&self) -> Option<&Evidence> {
        self.evidence.as_ref()
    }

    pub fn approved_by(&self) -> Option<&str> {
        self.approved_by.as_deref()
    }

    pub fn rejected_by(&self) -> Option<&str> {
        self.rejected_by.as_deref()
    }

    /// Apply an event. On `Err` the task is left completely unchanged — a
    /// refused transition must not leave partial state behind.
    pub fn apply(&mut self, event: Event) -> Result<Stage, GovernanceError> {
        let invalid = || GovernanceError::InvalidTransition {
            from: self.stage,
            event: event.name(),
        };

        match (self.stage, &event) {
            (Stage::Triage, Event::Triaged(tier)) => {
                self.tier = Some(*tier);
                self.stage = Stage::Maker;
            }

            (Stage::Maker, Event::MakerProduced) => {
                self.stage = Stage::Checker;
            }

            (Stage::Checker, Event::CheckerRan(ev)) => {
                if !ev.is_passing() {
                    return Err(GovernanceError::FailingEvidence {
                        exit_code: ev.exit_code(),
                    });
                }
                self.evidence = Some(ev.clone());
                // Green is the only tier that skips the gate entirely.
                self.stage = match self.tier {
                    Some(RiskTier::Green) => Stage::Guard,
                    _ => Stage::PendingApproval,
                };
            }

            (Stage::PendingApproval, Event::AbortWindowElapsed) => {
                let tier = self.tier.ok_or_else(invalid)?;
                // The structural gate. Not a warning, not a skip — an error.
                if !tier.abort_window_can_advance() {
                    return Err(GovernanceError::HighGateViolation);
                }
                self.enter_guard()?;
            }

            (Stage::PendingApproval, Event::HumanApprove(who)) => {
                self.approved_by = Some(who.clone());
                self.enter_guard()?;
            }

            (Stage::PendingApproval, Event::HumanReject(who)) => {
                self.rejected_by = Some(who.clone());
                self.stage = Stage::Rejected;
            }

            (Stage::Guard, Event::GuardCommitted) => {
                self.stage = Stage::Done;
            }

            _ => return Err(invalid()),
        }

        Ok(self.stage)
    }

    /// Single choke point for reaching GUARD, so the evidence check cannot be
    /// bypassed by adding a new path into the stage later.
    fn enter_guard(&mut self) -> Result<(), GovernanceError> {
        match self.evidence.as_ref() {
            None => Err(GovernanceError::MissingEvidence),
            Some(ev) if !ev.is_passing() => Err(GovernanceError::FailingEvidence {
                exit_code: ev.exit_code(),
            }),
            Some(_) => {
                self.stage = Stage::Guard;
                Ok(())
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn passing() -> Evidence {
        Evidence::record("cargo test -p ghostclaw-core", "test result: ok.", "", 0)
    }

    fn failing() -> Evidence {
        Evidence::record("cargo test -p ghostclaw-core", "", "1 failed", 101)
    }

    /// Drive a task to PendingApproval at the given tier.
    fn at_pending(tier: RiskTier) -> Task {
        let mut t = Task::new("T-1");
        t.apply(Event::Triaged(tier)).unwrap();
        t.apply(Event::MakerProduced).unwrap();
        t.apply(Event::CheckerRan(passing())).unwrap();
        assert_eq!(t.stage(), Stage::PendingApproval);
        t
    }

    // ── INVARIANT 1 ──────────────────────────────────────────────────────
    #[test]
    fn red_cannot_autoapprove() {
        let mut task = at_pending(RiskTier::Red);

        // An elapsed abort window is rejected outright.
        let err = task.apply(Event::AbortWindowElapsed).unwrap_err();
        assert_eq!(err, GovernanceError::HighGateViolation);

        // And it left the task exactly where it was.
        assert_eq!(task.stage(), Stage::PendingApproval);
        assert_eq!(task.approved_by(), None);

        // Retrying does not wear the gate down.
        for _ in 0..100 {
            assert_eq!(
                task.apply(Event::AbortWindowElapsed).unwrap_err(),
                GovernanceError::HighGateViolation
            );
        }
        assert_eq!(task.stage(), Stage::PendingApproval);

        // Only a human advances it, and the approver is recorded.
        let stage = task.apply(Event::HumanApprove("tony".into())).unwrap();
        assert_eq!(stage, Stage::Guard);
        assert_eq!(task.approved_by(), Some("tony"));
    }

    #[test]
    fn yellow_may_advance_on_elapsed_window() {
        let mut task = at_pending(RiskTier::Yellow);
        assert_eq!(task.apply(Event::AbortWindowElapsed).unwrap(), Stage::Guard);
        // Advancing on a timer records no approver — nobody approved it.
        assert_eq!(task.approved_by(), None);
    }

    #[test]
    fn green_skips_the_gate_entirely() {
        let mut task = Task::new("T-green");
        task.apply(Event::Triaged(RiskTier::Green)).unwrap();
        task.apply(Event::MakerProduced).unwrap();
        assert_eq!(
            task.apply(Event::CheckerRan(passing())).unwrap(),
            Stage::Guard
        );
    }

    #[test]
    fn human_reject_is_terminal() {
        let mut task = at_pending(RiskTier::Red);
        assert_eq!(
            task.apply(Event::HumanReject("tony".into())).unwrap(),
            Stage::Rejected
        );
        assert_eq!(task.rejected_by(), Some("tony"));
        assert!(task.stage().is_terminal());

        // A rejected task cannot be revived by a later approval.
        assert!(matches!(
            task.apply(Event::HumanApprove("tony".into())),
            Err(GovernanceError::InvalidTransition { .. })
        ));
    }

    // ── INVARIANT 2 ──────────────────────────────────────────────────────
    #[test]
    fn checker_requires_passing_evidence() {
        let mut task = Task::new("T-2");
        task.apply(Event::Triaged(RiskTier::Green)).unwrap();
        task.apply(Event::MakerProduced).unwrap();

        let err = task.apply(Event::CheckerRan(failing())).unwrap_err();
        assert_eq!(err, GovernanceError::FailingEvidence { exit_code: 101 });

        // Stuck at CHECKER, and no failing evidence was stored.
        assert_eq!(task.stage(), Stage::Checker);
        assert_eq!(task.evidence(), None);

        // Passing evidence releases it.
        task.apply(Event::CheckerRan(passing())).unwrap();
        assert_eq!(task.stage(), Stage::Guard);
        assert!(task.evidence().unwrap().is_passing());
    }

    #[test]
    fn guard_is_unreachable_without_evidence() {
        // Force the illegal shape directly: PendingApproval with no evidence.
        let mut task = Task::new("T-3");
        task.apply(Event::Triaged(RiskTier::Yellow)).unwrap();
        task.apply(Event::MakerProduced).unwrap();
        task.stage = Stage::PendingApproval; // bypass CHECKER on purpose

        assert_eq!(
            task.apply(Event::HumanApprove("tony".into())).unwrap_err(),
            GovernanceError::MissingEvidence
        );
        assert_eq!(task.stage(), Stage::PendingApproval);
    }

    #[test]
    fn events_out_of_order_are_refused() {
        let mut task = Task::new("T-4");
        assert!(matches!(
            task.apply(Event::MakerProduced),
            Err(GovernanceError::InvalidTransition {
                from: Stage::Triage,
                ..
            })
        ));
        assert!(matches!(
            task.apply(Event::GuardCommitted),
            Err(GovernanceError::InvalidTransition { .. })
        ));
        assert_eq!(task.stage(), Stage::Triage);
    }

    #[test]
    fn full_red_lifecycle_reaches_done() {
        let mut task = Task::new("T-5");
        task.apply(Event::Triaged(RiskTier::Red)).unwrap();
        task.apply(Event::MakerProduced).unwrap();
        task.apply(Event::CheckerRan(passing())).unwrap();
        task.apply(Event::HumanApprove("tony".into())).unwrap();
        assert_eq!(task.apply(Event::GuardCommitted).unwrap(), Stage::Done);
        assert!(task.stage().is_terminal());
        assert_eq!(task.approved_by(), Some("tony"));
    }
}
