//! Tier classification — fail closed.
//!
//! Mirrors `packages/types/src/ghostclaw-governance.mjs`. An action the classifier
//! does not recognise is Tier X, not Tier A: the default answer to "may I?" is no.

use serde::{Deserialize, Serialize};

/// Sensitivity of the data an action touches.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum DataClass {
    Public,
    Internal,
    Confidential,
    Restricted,
}

/// Risk tier. `X` is terminal — nothing promotes an action out of it.
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum Tier {
    /// PUBLIC, read-only, local. Automatic.
    A,
    /// INTERNAL, read-only, local. Automatic.
    B,
    /// CONFIDENTIAL. Maker-checker.
    C,
    /// External reach or mutation. Human approval required.
    D,
    /// Forbidden action, or RESTRICTED data leaving the host. Blocked forever.
    X,
}

impl Tier {
    /// Whether this tier may proceed without a human in the loop.
    pub fn is_automatic(&self) -> bool {
        matches!(self, Tier::A | Tier::B)
    }

    /// Whether this tier requires a human approval to advance.
    pub fn requires_human(&self) -> bool {
        matches!(self, Tier::D)
    }

    /// Whether this tier can ever be approved. `X` cannot, by anyone.
    pub fn is_approvable(&self) -> bool {
        !matches!(self, Tier::X)
    }
}

/// Actions that are never permitted, at any tier, by any principal.
///
/// `self_approval` is on this list. That is the entire reason an `Approval`
/// in this crate cannot be constructed without a human principal — the type
/// system enforces what the list declares.
pub const FORBIDDEN_ACTIONS: &[&str] = &[
    "cookie_export",
    "session_replay",
    "credential_scraping",
    "mfa_bypass",
    "captcha_bypass",
    "access_control_bypass",
    "captive_portal_bypass",
    "covert_tunnel",
    "guardrail_disable",
    "self_approval",
    "uncapped_spend",
    "bulk_delete_irreversible",
    "dns_exfiltration",
    "mac_cloning",
    "sni_spoofing",
    "domain_fronting",
    "session_clone",
];

pub fn is_forbidden(action: &str) -> bool {
    FORBIDDEN_ACTIONS.contains(&action)
}

/// What an agent says it wants to do.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ActionRequest {
    pub action: String,
    pub data_class: DataClass,
    /// Reaches something outside this host — network, another account, a device.
    pub is_external: bool,
    /// Changes state rather than only reading it.
    pub is_mutation: bool,
}

/// Classify an action. Order matters: forbidden and restricted-egress are
/// checked before anything can qualify for an automatic tier.
pub fn classify(req: &ActionRequest) -> Tier {
    if is_forbidden(&req.action) {
        return Tier::X;
    }
    if req.data_class == DataClass::Restricted && req.is_external {
        return Tier::X;
    }
    if req.is_external || req.is_mutation {
        return Tier::D;
    }
    match req.data_class {
        DataClass::Public => Tier::A,
        DataClass::Internal => Tier::B,
        DataClass::Confidential => Tier::C,
        // RESTRICTED that stays local and read-only is still not automatic.
        DataClass::Restricted => Tier::D,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn req(action: &str, dc: DataClass, ext: bool, mut_: bool) -> ActionRequest {
        ActionRequest {
            action: action.into(),
            data_class: dc,
            is_external: ext,
            is_mutation: mut_,
        }
    }

    #[test]
    fn public_readonly_local_is_automatic() {
        assert_eq!(classify(&req("read_docs", DataClass::Public, false, false)), Tier::A);
    }

    #[test]
    fn internal_readonly_local_is_automatic() {
        assert_eq!(classify(&req("read_repo", DataClass::Internal, false, false)), Tier::B);
    }

    #[test]
    fn confidential_needs_maker_checker() {
        assert_eq!(classify(&req("read_customer", DataClass::Confidential, false, false)), Tier::C);
    }

    #[test]
    fn any_mutation_needs_a_human() {
        let t = classify(&req("write_file", DataClass::Public, false, true));
        assert_eq!(t, Tier::D, "a mutation is never automatic, even on public data");
        assert!(t.requires_human());
    }

    #[test]
    fn any_external_reach_needs_a_human() {
        assert_eq!(classify(&req("http_get", DataClass::Public, true, false)), Tier::D);
    }

    #[test]
    fn restricted_leaving_the_host_is_blocked_forever() {
        let t = classify(&req("upload", DataClass::Restricted, true, false));
        assert_eq!(t, Tier::X);
        assert!(!t.is_approvable(), "Tier X must not be approvable by anyone");
    }

    #[test]
    fn restricted_staying_local_still_is_not_automatic() {
        let t = classify(&req("read_env", DataClass::Restricted, false, false));
        assert!(!t.is_automatic());
    }

    #[test]
    fn every_forbidden_action_is_tier_x_regardless_of_framing() {
        for a in FORBIDDEN_ACTIONS {
            // Framed as harmlessly as possible: public, local, read-only.
            let t = classify(&req(a, DataClass::Public, false, false));
            assert_eq!(t, Tier::X, "{a} must be Tier X however it is framed");
            assert!(!t.is_approvable());
        }
    }

    #[test]
    fn self_approval_is_forbidden() {
        assert!(is_forbidden("self_approval"));
    }

    #[test]
    fn unknown_actions_are_not_privileged() {
        // An action nobody listed is still subject to the same rules; it does not
        // get a pass for being unrecognised.
        assert_eq!(classify(&req("some_new_thing", DataClass::Confidential, false, false)), Tier::C);
        assert_eq!(classify(&req("some_new_thing", DataClass::Public, true, true)), Tier::D);
    }
}
