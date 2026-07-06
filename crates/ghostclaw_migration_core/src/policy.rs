//! Hard policy gate for unsafe commands.

/// Result of policy evaluation.
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum PolicyDecision {
    /// Command is safe for deterministic local handling.
    Allowed,
    /// Command is blocked with a stable reason.
    Blocked(String),
}

/// Keyword-based guard matching the P085 hard-gate contract.
#[derive(Clone, Debug)]
pub struct PolicyGuard {
    blocked_terms: Vec<&'static str>,
}

impl Default for PolicyGuard {
    fn default() -> Self {
        Self {
            blocked_terms: vec![
                "git push",
                "push origin",
                "deploy",
                "production",
                "telegram bot start",
                "live telegram",
                "send message",
                "send email",
                "print secret",
                "show secret",
                "read secret",
                "token",
                "password",
                "credential",
                "dns",
                "cloudflare mutation",
                "r2 mutation",
                "overwrite agents.md",
                "overwrite claude.md",
                "chmod 777",
                "drop table",
            ],
        }
    }
}

impl PolicyGuard {
    /// Evaluates a raw command against hard blocks.
    pub fn evaluate(&self, raw_command: &str) -> PolicyDecision {
        let normalized = raw_command.to_ascii_lowercase();
        self.blocked_terms
            .iter()
            .find(|term| normalized.contains(**term))
            .map_or(PolicyDecision::Allowed, |term| {
                PolicyDecision::Blocked(format!("hard_gate_term:{term}"))
            })
    }
}
