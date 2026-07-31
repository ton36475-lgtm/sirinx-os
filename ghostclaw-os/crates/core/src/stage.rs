//! Pipeline stages: TRIAGE -> MAKER -> CHECKER -> (gate) -> GUARD.

/// Where a task currently sits in the pipeline.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Stage {
    /// Awaiting risk classification.
    Triage,
    /// Work is being produced.
    Maker,
    /// Work is being verified; must produce Evidence.
    Checker,
    /// Checker passed. Waiting on the tier's gate before GUARD may act.
    PendingApproval,
    /// Cleared to commit. GUARD commits only — it never pushes.
    Guard,
    /// Terminal: committed.
    Done,
    /// Terminal: rejected by a human.
    Rejected,
}

impl Stage {
    pub fn is_terminal(self) -> bool {
        matches!(self, Stage::Done | Stage::Rejected)
    }

    pub fn as_str(self) -> &'static str {
        match self {
            Stage::Triage => "TRIAGE",
            Stage::Maker => "MAKER",
            Stage::Checker => "CHECKER",
            Stage::PendingApproval => "PENDING_APPROVAL",
            Stage::Guard => "GUARD",
            Stage::Done => "DONE",
            Stage::Rejected => "REJECTED",
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn terminal_stages_are_done_and_rejected() {
        assert!(Stage::Done.is_terminal());
        assert!(Stage::Rejected.is_terminal());
        assert!(!Stage::Guard.is_terminal());
        assert!(!Stage::PendingApproval.is_terminal());
    }
}
