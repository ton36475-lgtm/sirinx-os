//! The human gate, enforced by the type system.
//!
//! GHOSTCLAW v1.0 [1] states the HIGH gate is *structural*: the only events that
//! advance a Red task are `HumanApprove(who)` / `HumanReject(who)`, constructed
//! only from (a) Hermes `/api/tasks/:id/approve` behind Cloudflare Access, or
//! (b) a Telegram callback from a whitelisted chat/user id.
//!
//! "Structural" is doing real work in that sentence. A policy check that decides
//! a task is safe enough to approve itself satisfies the words "the task was
//! approved" while defeating the rule — and `self_approval` is on the forbidden
//! list precisely because that shortcut is tempting.
//!
//! So [`HumanPrincipal`] has no public constructor and no `Default`. The only
//! ways to obtain one are [`HumanPrincipal::from_telegram_callback`] and
//! [`HumanPrincipal::from_hermes_access`], both of which demand evidence that a
//! person acted. An agent holding this crate cannot mint one.

use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};

use crate::tier::Tier;

/// How a human proved they were present.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum Authenticator {
    /// Telegram callback query from a whitelisted id. Carries the callback id so
    /// the decision can be traced back to a specific tap.
    TelegramCallback { user_id: i64, callback_query_id: String },
    /// Hermes `/api/tasks/:id/approve` behind Cloudflare Access. Carries the
    /// Access identity header so the decision is attributable.
    HermesAccess { email: String, access_jwt_sub: String },
}

/// A person who made a decision. Cannot be constructed by machine.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct HumanPrincipal {
    id: String,
    authenticator: Authenticator,
    at: DateTime<Utc>,
}

impl HumanPrincipal {
    /// Build from a Telegram callback. Fails unless the user is whitelisted and
    /// the callback carries an id — an empty id means the callback was fabricated
    /// rather than received.
    pub fn from_telegram_callback(
        user_id: i64,
        callback_query_id: &str,
        whitelist: &[i64],
    ) -> Result<Self, ApprovalError> {
        if !whitelist.contains(&user_id) {
            return Err(ApprovalError::NotWhitelisted(user_id));
        }
        if callback_query_id.trim().is_empty() {
            return Err(ApprovalError::MissingAuthenticator);
        }
        Ok(Self {
            id: format!("telegram:{user_id}"),
            authenticator: Authenticator::TelegramCallback {
                user_id,
                callback_query_id: callback_query_id.to_string(),
            },
            at: Utc::now(),
        })
    }

    /// Build from a Hermes request that passed Cloudflare Access. Both the email
    /// and the JWT subject must be present; Access supplies both, a forged local
    /// request supplies neither.
    pub fn from_hermes_access(email: &str, access_jwt_sub: &str) -> Result<Self, ApprovalError> {
        if email.trim().is_empty() || access_jwt_sub.trim().is_empty() {
            return Err(ApprovalError::MissingAuthenticator);
        }
        Ok(Self {
            id: format!("hermes:{email}"),
            authenticator: Authenticator::HermesAccess {
                email: email.to_string(),
                access_jwt_sub: access_jwt_sub.to_string(),
            },
            at: Utc::now(),
        })
    }

    pub fn id(&self) -> &str {
        &self.id
    }

    pub fn authenticator(&self) -> &Authenticator {
        &self.authenticator
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum Decision {
    Approve,
    Reject,
}

/// A decision bound to one task, one plan digest, one nonce, one person.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Approval {
    pub task_id: String,
    pub plan_hash: String,
    pub scope_hash: String,
    pub decision: Decision,
    pub principal: HumanPrincipal,
    pub nonce: String,
    pub issued_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
    consumed: bool,
}

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
pub enum ApprovalError {
    #[error("tier {0:?} is blocked forever and cannot be approved by anyone")]
    TierBlocked(Tier),
    #[error("telegram user {0} is not whitelisted")]
    NotWhitelisted(i64),
    #[error("no authenticator evidence — a human decision must be attributable")]
    MissingAuthenticator,
    #[error("approval already consumed")]
    AlreadyConsumed,
    #[error("approval expired")]
    Expired,
    #[error("plan hash mismatch: approval was for a different plan")]
    PlanHashMismatch,
    #[error("scope hash mismatch: approval was for a different scope")]
    ScopeHashMismatch,
    #[error("approval is for task {expected}, not {actual}")]
    TaskMismatch { expected: String, actual: String },
    #[error("decision was REJECT")]
    Rejected,
}

/// How long an approval stays usable before it must be asked for again.
pub const APPROVAL_TTL_MINUTES: i64 = 15;

impl Approval {
    /// Record a human decision.
    ///
    /// Takes a [`HumanPrincipal`] by value rather than an id string: an id can be
    /// typed, a principal has to be obtained.
    pub fn record(
        task_id: impl Into<String>,
        plan_hash: impl Into<String>,
        scope_hash: impl Into<String>,
        tier: Tier,
        decision: Decision,
        principal: HumanPrincipal,
        nonce: impl Into<String>,
    ) -> Result<Self, ApprovalError> {
        if !tier.is_approvable() {
            return Err(ApprovalError::TierBlocked(tier));
        }
        let now = Utc::now();
        Ok(Self {
            task_id: task_id.into(),
            plan_hash: plan_hash.into(),
            scope_hash: scope_hash.into(),
            decision,
            principal,
            nonce: nonce.into(),
            issued_at: now,
            expires_at: now + Duration::minutes(APPROVAL_TTL_MINUTES),
            consumed: false,
        })
    }

    pub fn is_consumed(&self) -> bool {
        self.consumed
    }

    /// Check this approval against the work about to run, then burn it.
    ///
    /// Every field is re-checked at use time rather than trusted from issue time,
    /// because the plan can change between asking and acting — and an approval for
    /// the old plan must not authorise the new one.
    pub fn consume(
        &mut self,
        task_id: &str,
        plan_hash: &str,
        scope_hash: &str,
    ) -> Result<&HumanPrincipal, ApprovalError> {
        if self.consumed {
            return Err(ApprovalError::AlreadyConsumed);
        }
        if Utc::now() > self.expires_at {
            return Err(ApprovalError::Expired);
        }
        if self.decision == Decision::Reject {
            return Err(ApprovalError::Rejected);
        }
        if self.task_id != task_id {
            return Err(ApprovalError::TaskMismatch {
                expected: self.task_id.clone(),
                actual: task_id.to_string(),
            });
        }
        if self.plan_hash != plan_hash {
            return Err(ApprovalError::PlanHashMismatch);
        }
        if self.scope_hash != scope_hash {
            return Err(ApprovalError::ScopeHashMismatch);
        }
        self.consumed = true;
        Ok(&self.principal)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const WHITELIST: &[i64] = &[111, 222];

    fn principal() -> HumanPrincipal {
        HumanPrincipal::from_telegram_callback(111, "cbq_abc123", WHITELIST).unwrap()
    }

    fn approval(decision: Decision) -> Approval {
        Approval::record("T-1", "plan-h", "scope-h", Tier::D, decision, principal(), "nonce-1")
            .unwrap()
    }

    #[test]
    fn a_whitelisted_tap_produces_a_principal() {
        let p = principal();
        assert_eq!(p.id(), "telegram:111");
    }

    #[test]
    fn a_stranger_cannot_approve() {
        let e = HumanPrincipal::from_telegram_callback(999, "cbq_x", WHITELIST).unwrap_err();
        assert_eq!(e, ApprovalError::NotWhitelisted(999));
    }

    #[test]
    fn a_fabricated_callback_has_no_authenticator() {
        // No callback id means nothing was actually tapped.
        let e = HumanPrincipal::from_telegram_callback(111, "", WHITELIST).unwrap_err();
        assert_eq!(e, ApprovalError::MissingAuthenticator);
    }

    #[test]
    fn hermes_needs_both_access_claims() {
        assert!(HumanPrincipal::from_hermes_access("t@example.com", "sub-1").is_ok());
        assert_eq!(
            HumanPrincipal::from_hermes_access("t@example.com", "").unwrap_err(),
            ApprovalError::MissingAuthenticator
        );
        assert_eq!(
            HumanPrincipal::from_hermes_access("", "sub-1").unwrap_err(),
            ApprovalError::MissingAuthenticator
        );
    }

    #[test]
    fn tier_x_cannot_be_approved_by_a_real_human_either() {
        // The point of Tier X: it is not a permissions question.
        let e = Approval::record(
            "T-1", "p", "s", Tier::X, Decision::Approve, principal(), "n",
        )
        .unwrap_err();
        assert_eq!(e, ApprovalError::TierBlocked(Tier::X));
    }

    #[test]
    fn an_approval_works_once() {
        let mut a = approval(Decision::Approve);
        assert!(a.consume("T-1", "plan-h", "scope-h").is_ok());
        assert_eq!(
            a.consume("T-1", "plan-h", "scope-h").unwrap_err(),
            ApprovalError::AlreadyConsumed
        );
    }

    #[test]
    fn an_approval_does_not_carry_to_another_task() {
        let mut a = approval(Decision::Approve);
        assert!(matches!(
            a.consume("T-2", "plan-h", "scope-h").unwrap_err(),
            ApprovalError::TaskMismatch { .. }
        ));
        assert!(!a.is_consumed(), "a rejected check must not burn the approval");
    }

    #[test]
    fn changing_the_plan_after_approval_invalidates_it() {
        let mut a = approval(Decision::Approve);
        assert_eq!(
            a.consume("T-1", "plan-CHANGED", "scope-h").unwrap_err(),
            ApprovalError::PlanHashMismatch
        );
    }

    #[test]
    fn widening_the_scope_after_approval_invalidates_it() {
        let mut a = approval(Decision::Approve);
        assert_eq!(
            a.consume("T-1", "plan-h", "scope-WIDER").unwrap_err(),
            ApprovalError::ScopeHashMismatch
        );
    }

    #[test]
    fn a_reject_never_authorises_anything() {
        let mut a = approval(Decision::Reject);
        assert_eq!(a.consume("T-1", "plan-h", "scope-h").unwrap_err(), ApprovalError::Rejected);
    }

    #[test]
    fn an_expired_approval_must_be_asked_for_again() {
        let mut a = approval(Decision::Approve);
        a.expires_at = Utc::now() - Duration::seconds(1);
        assert_eq!(a.consume("T-1", "plan-h", "scope-h").unwrap_err(), ApprovalError::Expired);
    }
}
