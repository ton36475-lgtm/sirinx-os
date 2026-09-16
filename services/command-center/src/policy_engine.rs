// services/command-center/src/policy_engine.rs
// Omnigent Policy Engine for Agent Control

pub struct PolicyEngine {
    pub max_cost_per_session: f64,        // USD limit
    pub approval_required_for: Vec<&'static str>, // destructive actions
    pub rate_limit_rpm: u32,              // requests per minute
}

impl PolicyEngine {
    pub fn check(&self, action: &str, cost: f64) -> PolicyResult {
        if self.approval_required_for.contains(&action) {
            return PolicyResult::NeedsApproval;
        }
        if cost > self.max_cost_per_session {
            return PolicyResult::CostExceeded;
        }
        PolicyResult::Allowed
    }
}

pub enum PolicyResult {
    Allowed,
    NeedsApproval,
    CostExceeded,
}