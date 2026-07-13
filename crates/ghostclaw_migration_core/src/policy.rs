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
                "deployed",
                "deployment",
                "production",
                "telegram bot start",
                "live telegram",
                "send message",
                "send email",
                "print secret",
                "show secret",
                "read secret",
                "token",
                "tokens",
                "password",
                "passwords",
                "credential",
                "credentials",
                "secret",
                "secrets",
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
        let normalized = canonicalize_command(raw_command);
        self.blocked_terms
            .iter()
            .find(|term| contains_phrase(&normalized, &canonicalize_command(term)))
            .map_or(PolicyDecision::Allowed, |term| {
                PolicyDecision::Blocked(format!("hard_gate_term:{term}"))
            })
    }
}

fn canonicalize_command(value: &str) -> String {
    let mut output = String::with_capacity(value.len());
    let mut pending_separator = false;

    for ch in value.chars().flat_map(char::to_lowercase) {
        if ch.is_alphanumeric() {
            if pending_separator && !output.is_empty() {
                output.push(' ');
            }
            output.push(ch);
            pending_separator = false;
        } else {
            pending_separator = true;
        }
    }
    output
}

fn contains_phrase(haystack: &str, needle: &str) -> bool {
    if needle.is_empty() {
        return false;
    }
    format!(" {haystack} ").contains(&format!(" {needle} "))
}

#[cfg(test)]
mod tests {
    use super::{PolicyDecision, PolicyGuard};

    #[test]
    fn policy_should_block_whitespace_and_punctuation_variants() {
        let guard = PolicyGuard::default();

        assert!(matches!(
            guard.evaluate("git\n\tpush origin main"),
            PolicyDecision::Blocked(_)
        ));
        assert!(matches!(
            guard.evaluate("production-deployment"),
            PolicyDecision::Blocked(_)
        ));
    }

    #[test]
    fn policy_should_not_block_unrelated_word_substrings() {
        let guard = PolicyGuard::default();

        assert_eq!(
            guard.evaluate("review tokenizer implementation locally"),
            PolicyDecision::Allowed
        );
    }
}
