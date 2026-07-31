//! Risk tiers. LOCKED governance — see GHOSTCLAW promptpack [1].

/// The three governance tiers. A tier is assigned once, at TRIAGE.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum RiskTier {
    /// Auto-approve.
    Green,
    /// Auto-approve, but only after an abort window elapses without objection.
    Yellow,
    /// Human gate. Structural: no elapsed timer can ever substitute for a human.
    Red,
}

impl RiskTier {
    /// `true` only for Red. This is the single predicate the state machine
    /// consults before honouring a non-human advancement event.
    pub fn requires_human_gate(self) -> bool {
        matches!(self, RiskTier::Red)
    }

    /// Whether an elapsed abort window is a legitimate way to advance.
    /// Deliberately false for Red — that is the whole point of the gate.
    pub fn abort_window_can_advance(self) -> bool {
        matches!(self, RiskTier::Green | RiskTier::Yellow)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_red_requires_a_human_gate() {
        assert!(RiskTier::Red.requires_human_gate());
        assert!(!RiskTier::Yellow.requires_human_gate());
        assert!(!RiskTier::Green.requires_human_gate());
    }

    #[test]
    fn red_never_advances_on_an_elapsed_window() {
        assert!(!RiskTier::Red.abort_window_can_advance());
        assert!(RiskTier::Yellow.abort_window_can_advance());
        assert!(RiskTier::Green.abort_window_can_advance());
    }
}
