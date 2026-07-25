//! Capability leases — what an agent actually holds after a human says yes.
//!
//! A lease is deliberately not a role or a permission bit. It is one capability,
//! for named actions, on exact paths, with a call budget and an expiry, tied to
//! the approval that created it.
//!
//! The reason is the difference between "Tony approved this agent" and "Tony
//! approved this action". Only the second is reviewable after the fact, and only
//! the second stops being true on its own.

use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};

use crate::approval::{Approval, ApprovalError, HumanPrincipal};
use crate::tier::Tier;

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
pub enum LeaseError {
    #[error("path must be absolute: {0}")]
    NotAbsolute(String),
    #[error("path contains a traversal segment: {0}")]
    Traversal(String),
    #[error("path contains a wildcard — leases name exact paths: {0}")]
    Wildcard(String),
    #[error("lease expired")]
    Expired,
    #[error("lease exhausted: {used}/{max} calls used")]
    Exhausted { used: u32, max: u32 },
    #[error("lease revoked")]
    Revoked,
    #[error("action '{0}' is not in this lease")]
    ActionNotAllowed(String),
    #[error("path '{0}' is not in this lease")]
    PathNotAllowed(String),
    #[error(transparent)]
    Approval(#[from] ApprovalError),
}

/// Reject anything that is not one concrete, absolute path.
///
/// Wildcards and traversal are rejected rather than normalised: a lease the
/// approver could not read exactly is a lease they did not really grant.
pub fn validate_lease_path(path: &str) -> Result<(), LeaseError> {
    if !path.starts_with('/') {
        return Err(LeaseError::NotAbsolute(path.to_string()));
    }
    if path.split('/').any(|seg| seg == ".." || seg == ".") {
        return Err(LeaseError::Traversal(path.to_string()));
    }
    if path.contains('*') || path.contains('?') || path.contains('[') {
        return Err(LeaseError::Wildcard(path.to_string()));
    }
    Ok(())
}

/// One capability, granted by one approval.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Lease {
    pub id: String,
    pub task_id: String,
    pub worker_id: String,
    pub tier: Tier,
    pub allowed_actions: Vec<String>,
    pub allowed_paths: Vec<String>,
    pub max_calls: u32,
    pub expires_at: DateTime<Utc>,
    /// Who approved this, carried so a receipt can name them.
    pub granted_by: HumanPrincipal,
    pub granted_at: DateTime<Utc>,
    used_calls: u32,
    revoked: bool,
}

/// Default lifetime of a granted lease. Short on purpose: the cost of asking
/// again is a notification, the cost of a long lease is an unattended window.
pub const LEASE_TTL_MINUTES: i64 = 10;

impl Lease {
    /// Grant a lease by consuming an approval.
    ///
    /// There is no other constructor. A lease cannot exist without an approval,
    /// and an approval cannot exist without a human — so a lease cannot exist
    /// without a human, all the way down.
    #[allow(clippy::too_many_arguments)]
    pub fn grant(
        approval: &mut Approval,
        task_id: &str,
        plan_hash: &str,
        scope_hash: &str,
        worker_id: impl Into<String>,
        tier: Tier,
        allowed_actions: Vec<String>,
        allowed_paths: Vec<String>,
        max_calls: u32,
    ) -> Result<Self, LeaseError> {
        for p in &allowed_paths {
            validate_lease_path(p)?;
        }
        let principal = approval.consume(task_id, plan_hash, scope_hash)?.clone();
        let now = Utc::now();
        Ok(Self {
            id: format!("lease-{}", uuid_like(task_id, &now)),
            task_id: task_id.to_string(),
            worker_id: worker_id.into(),
            tier,
            allowed_actions,
            allowed_paths,
            max_calls,
            expires_at: now + Duration::minutes(LEASE_TTL_MINUTES),
            granted_by: principal,
            granted_at: now,
            used_calls: 0,
            revoked: false,
        })
    }

    pub fn used_calls(&self) -> u32 {
        self.used_calls
    }

    pub fn is_revoked(&self) -> bool {
        self.revoked
    }

    pub fn revoke(&mut self) {
        self.revoked = true;
    }

    /// Check one intended call against the lease and count it.
    ///
    /// The call is counted even when it is about to fail for another reason, so a
    /// caller cannot probe the lease boundary for free.
    pub fn authorize(&mut self, action: &str, path: Option<&str>) -> Result<(), LeaseError> {
        if self.revoked {
            return Err(LeaseError::Revoked);
        }
        if Utc::now() > self.expires_at {
            return Err(LeaseError::Expired);
        }
        if self.used_calls >= self.max_calls {
            return Err(LeaseError::Exhausted {
                used: self.used_calls,
                max: self.max_calls,
            });
        }
        self.used_calls += 1;

        if !self.allowed_actions.iter().any(|a| a == action) {
            return Err(LeaseError::ActionNotAllowed(action.to_string()));
        }
        if let Some(p) = path {
            validate_lease_path(p)?;
            if !self.allowed_paths.iter().any(|a| a == p) {
                return Err(LeaseError::PathNotAllowed(p.to_string()));
            }
        }
        Ok(())
    }
}

/// Small deterministic id. Not a real UUID — this only has to be unique enough
/// to correlate a lease with its receipts.
fn uuid_like(seed: &str, at: &DateTime<Utc>) -> String {
    use sha2::{Digest, Sha256};
    let mut h = Sha256::new();
    h.update(seed.as_bytes());
    h.update(at.timestamp_nanos_opt().unwrap_or_default().to_le_bytes());
    format!("{:x}", h.finalize())[..12].to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::approval::{Decision, HumanPrincipal};

    const WHITELIST: &[i64] = &[111];

    fn approval() -> Approval {
        Approval::record(
            "T-1",
            "plan-h",
            "scope-h",
            Tier::D,
            Decision::Approve,
            HumanPrincipal::from_telegram_callback(111, "cbq_1", WHITELIST).unwrap(),
            "n1",
        )
        .unwrap()
    }

    fn lease() -> Lease {
        let mut a = approval();
        Lease::grant(
            &mut a,
            "T-1",
            "plan-h",
            "scope-h",
            "worker-1",
            Tier::D,
            vec!["fs.read".into()],
            vec!["/Users/sirinx/Documents/report.md".into()],
            3,
        )
        .unwrap()
    }

    #[test]
    fn exact_absolute_paths_are_accepted() {
        assert!(validate_lease_path("/data/report.md").is_ok());
    }

    #[test]
    fn traversal_is_rejected() {
        assert!(matches!(
            validate_lease_path("/data/../../etc/passwd").unwrap_err(),
            LeaseError::Traversal(_)
        ));
        assert!(matches!(
            validate_lease_path("../secrets").unwrap_err(),
            LeaseError::NotAbsolute(_)
        ));
    }

    #[test]
    fn wildcards_are_rejected() {
        for p in ["/data/*", "/data/?.md", "/data/[abc].md"] {
            assert!(
                matches!(validate_lease_path(p).unwrap_err(), LeaseError::Wildcard(_)),
                "{p} should be rejected"
            );
        }
    }

    #[test]
    fn granting_a_lease_burns_the_approval() {
        let mut a = approval();
        assert!(Lease::grant(
            &mut a, "T-1", "plan-h", "scope-h", "w", Tier::D,
            vec!["fs.read".into()], vec!["/tmp/x".into()], 1
        )
        .is_ok());
        assert!(a.is_consumed());

        // The same approval cannot grant a second lease.
        let e = Lease::grant(
            &mut a, "T-1", "plan-h", "scope-h", "w", Tier::D,
            vec!["fs.read".into()], vec!["/tmp/x".into()], 1,
        )
        .unwrap_err();
        assert_eq!(e, LeaseError::Approval(ApprovalError::AlreadyConsumed));
    }

    #[test]
    fn the_lease_names_who_granted_it() {
        assert_eq!(lease().granted_by.id(), "telegram:111");
    }

    #[test]
    fn an_allowed_action_on_an_allowed_path_passes() {
        let mut l = lease();
        assert!(l.authorize("fs.read", Some("/Users/sirinx/Documents/report.md")).is_ok());
        assert_eq!(l.used_calls(), 1);
    }

    #[test]
    fn a_different_action_is_refused() {
        let mut l = lease();
        assert!(matches!(
            l.authorize("fs.write", Some("/Users/sirinx/Documents/report.md")).unwrap_err(),
            LeaseError::ActionNotAllowed(_)
        ));
    }

    #[test]
    fn a_neighbouring_path_is_refused() {
        let mut l = lease();
        assert!(matches!(
            l.authorize("fs.read", Some("/Users/sirinx/Documents/other.md")).unwrap_err(),
            LeaseError::PathNotAllowed(_)
        ));
    }

    #[test]
    fn probing_the_boundary_costs_calls() {
        let mut l = lease(); // max_calls = 3
        let _ = l.authorize("fs.write", Some("/Users/sirinx/Documents/report.md"));
        let _ = l.authorize("fs.read", Some("/etc/passwd"));
        let _ = l.authorize("fs.read", Some("/Users/sirinx/Documents/report.md"));
        assert_eq!(l.used_calls(), 3);
        assert!(matches!(
            l.authorize("fs.read", Some("/Users/sirinx/Documents/report.md")).unwrap_err(),
            LeaseError::Exhausted { .. }
        ));
    }

    #[test]
    fn an_expired_lease_stops_working_on_its_own() {
        let mut l = lease();
        l.expires_at = Utc::now() - Duration::seconds(1);
        assert_eq!(
            l.authorize("fs.read", Some("/Users/sirinx/Documents/report.md")).unwrap_err(),
            LeaseError::Expired
        );
    }

    #[test]
    fn revocation_is_immediate() {
        let mut l = lease();
        l.revoke();
        assert_eq!(
            l.authorize("fs.read", Some("/Users/sirinx/Documents/report.md")).unwrap_err(),
            LeaseError::Revoked
        );
    }
}
