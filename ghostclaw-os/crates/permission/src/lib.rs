//! GHOSTCLAW Permission — the substrate for agents asking to touch the machine.
//!
//! The flow this crate exists to make safe:
//!
//! ```text
//!   agent wants to do something
//!        ↓  classify()                     ← fail closed; unknown is not safe
//!   Tier A/B  → proceed, no human needed
//!   Tier C    → maker-checker
//!   Tier D    → ask Tony on Telegram, wait
//!   Tier X    → refuse; not a permissions question
//!        ↓  Tony taps Approve
//!   HumanPrincipal ← only from a whitelisted callback or Cloudflare Access
//!        ↓
//!   Approval       ← one task, one plan digest, one nonce, 15 min
//!        ↓  consumed
//!   Lease          ← named actions, exact paths, call budget, 10 min
//!        ↓  every call
//!   authorize()    ← re-checked and counted each time
//! ```
//!
//! ## What this crate refuses to provide
//!
//! There is no "grant this agent all permissions" call, and no way to build an
//! [`approval::Approval`] without an [`approval::HumanPrincipal`]. That is not an
//! oversight to be worked around later — `self_approval` is in
//! [`tier::FORBIDDEN_ACTIONS`], and a blanket grant is the same thing wearing a
//! different name: after it, no one can say what was agreed to.
//!
//! A tap per action is more notifications. It is also the only version where the
//! receipts mean anything.

pub mod approval;
pub mod lease;
pub mod tier;

pub use approval::{Approval, ApprovalError, Authenticator, Decision, HumanPrincipal};
pub use lease::{validate_lease_path, Lease, LeaseError};
pub use tier::{classify, is_forbidden, ActionRequest, DataClass, Tier, FORBIDDEN_ACTIONS};

/// Global stop. Panicking blocks dispatch until it is explicitly cleared.
#[derive(Debug, Default)]
pub struct PanicController {
    panicked: std::sync::atomic::AtomicBool,
}

impl PanicController {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn panic(&self, reason: &str) {
        tracing_reason(reason);
        self.panicked.store(true, std::sync::atomic::Ordering::SeqCst);
    }

    pub fn clear(&self) {
        self.panicked.store(false, std::sync::atomic::Ordering::SeqCst);
    }

    pub fn is_panicked(&self) -> bool {
        self.panicked.load(std::sync::atomic::Ordering::SeqCst)
    }
}

fn tracing_reason(reason: &str) {
    eprintln!("PANIC: dispatch stopped — {reason}");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn panic_blocks_until_cleared() {
        let pc = PanicController::new();
        assert!(!pc.is_panicked());
        pc.panic("test");
        assert!(pc.is_panicked());
        pc.clear();
        assert!(!pc.is_panicked());
    }

    /// The whole point, as one test: a machine cannot walk this path alone.
    #[test]
    fn a_tier_d_action_cannot_reach_a_lease_without_a_human() {
        let req = ActionRequest {
            action: "fs.write".into(),
            data_class: DataClass::Internal,
            is_external: false,
            is_mutation: true,
        };
        let tier = classify(&req);
        assert_eq!(tier, Tier::D);
        assert!(tier.requires_human());

        // Everything needed to build an Approval is available here EXCEPT a
        // principal — and there is no constructor for one that does not demand
        // evidence a person acted. from_telegram_callback needs a whitelisted id
        // and a real callback id; from_hermes_access needs Access claims.
        assert!(HumanPrincipal::from_telegram_callback(111, "cbq", &[]).is_err());
        assert!(HumanPrincipal::from_telegram_callback(111, "", &[111]).is_err());
        assert!(HumanPrincipal::from_hermes_access("", "").is_err());
    }

    #[test]
    fn a_forbidden_action_is_refused_even_with_a_real_approval() {
        let req = ActionRequest {
            action: "guardrail_disable".into(),
            data_class: DataClass::Public,
            is_external: false,
            is_mutation: false,
        };
        assert_eq!(classify(&req), Tier::X);

        let p = HumanPrincipal::from_telegram_callback(111, "cbq_1", &[111]).unwrap();
        let e = Approval::record("T", "p", "s", Tier::X, Decision::Approve, p, "n").unwrap_err();
        assert_eq!(e, ApprovalError::TierBlocked(Tier::X));
    }
}
