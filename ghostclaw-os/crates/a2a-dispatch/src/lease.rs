//! Fail-closed, one-use approval leases for live A2A dispatch.
//!
//! The MCP connection is persistent, but authority is not. Each live Codex
//! call must match one operator-issued JSON lease exactly. The lease is moved
//! away from its well-known pending path before it is parsed or validated, so
//! only one concurrent caller can consume it.

use std::fs;
use std::os::unix::fs::PermissionsExt;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use thiserror::Error;

pub const LEASE_SCHEMA: &str = "sirinx.a2a.execution_lease.v1";
const MAX_LEASE_BYTES: u64 = 64 * 1024;
const MAX_LEASE_TTL_MINUTES: i64 = 15;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ExecutionLease {
    pub schema: String,
    pub lease_id: String,
    pub issued_by: String,
    pub target_agent: String,
    pub message_sha256: String,
    pub issued_at: String,
    pub expires_at: String,
    pub max_calls: u8,
    pub cwd_allowlist: Vec<PathBuf>,
    pub side_effect_ceiling: String,
    pub install: bool,
    pub push: bool,
    pub deploy: bool,
    pub cloud_mutation: bool,
    pub secret_read: bool,
    pub external_message_send: bool,
    pub migration: bool,
    pub physical_control: bool,
}

#[derive(Clone, Debug)]
pub struct ConsumedLease {
    pub lease_id: String,
    pub message_sha256: String,
}

#[derive(Debug, Error)]
pub enum LeaseError {
    #[error("execution lease is missing")]
    Missing,
    #[error("failed to atomically claim execution lease: {0}")]
    Claim(std::io::Error),
    #[error("failed to read claimed execution lease: {0}")]
    Read(std::io::Error),
    #[error("execution lease must be a private regular file")]
    UnsafeFile,
    #[error("execution lease is too large")]
    TooLarge,
    #[error("execution lease is not valid JSON: {0}")]
    Parse(serde_json::Error),
    #[error("execution lease schema is not supported")]
    Schema,
    #[error("execution lease identity is empty")]
    Identity,
    #[error("execution lease target does not match this call")]
    Target,
    #[error("execution lease message digest does not match this call")]
    MessageDigest,
    #[error("execution lease expiry is invalid")]
    InvalidExpiry,
    #[error("execution lease issue time is invalid")]
    InvalidIssuedAt,
    #[error("execution lease issue time is in the future")]
    IssuedInFuture,
    #[error("execution lease has expired")]
    Expired,
    #[error("execution lease expiry is too far in the future")]
    ExpiryTooFar,
    #[error("execution lease must allow exactly one call")]
    MaxCalls,
    #[error("execution lease does not allow the exact canonical workspace")]
    Workspace,
    #[error("execution lease side-effect ceiling must be read_only")]
    SideEffectCeiling,
    #[error("execution lease attempts to authorize a separately gated action")]
    ForbiddenAuthority,
    #[error("failed to commit consumed execution lease: {0}")]
    Commit(std::io::Error),
}

#[derive(Clone, Debug)]
pub struct LeaseGuard {
    pending_path: PathBuf,
}

impl LeaseGuard {
    pub fn new(pending_path: impl Into<PathBuf>) -> Self {
        Self {
            pending_path: pending_path.into(),
        }
    }

    pub fn pending_path(&self) -> &Path {
        &self.pending_path
    }

    pub fn consume(
        &self,
        agent: &str,
        message: &str,
        canonical_workspace: &Path,
    ) -> Result<ConsumedLease, LeaseError> {
        let claimed_path = sibling_path(&self.pending_path, "claimed", unique_suffix());
        match fs::rename(&self.pending_path, &claimed_path) {
            Ok(()) => {}
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
                return Err(LeaseError::Missing);
            }
            Err(e) => return Err(LeaseError::Claim(e)),
        }

        let result = self.validate_claimed(&claimed_path, agent, message, canonical_workspace);
        match result {
            Ok(lease) => {
                let consumed_path =
                    sibling_path(&self.pending_path, "consumed", lease.lease_id.clone());
                // hard_link is create-new: unlike rename on Unix, it refuses
                // to overwrite an existing consumed lease with the same ID.
                fs::hard_link(&claimed_path, &consumed_path).map_err(LeaseError::Commit)?;
                fs::remove_file(&claimed_path).map_err(LeaseError::Commit)?;
                Ok(ConsumedLease {
                    lease_id: lease.lease_id,
                    message_sha256: lease.message_sha256,
                })
            }
            Err(err) => {
                let rejected_path = sibling_path(&self.pending_path, "rejected", unique_suffix());
                let _ = fs::rename(&claimed_path, rejected_path);
                Err(err)
            }
        }
    }

    fn validate_claimed(
        &self,
        claimed_path: &Path,
        agent: &str,
        message: &str,
        canonical_workspace: &Path,
    ) -> Result<ExecutionLease, LeaseError> {
        let metadata = fs::symlink_metadata(claimed_path).map_err(LeaseError::Read)?;
        if !metadata.file_type().is_file()
            || metadata.file_type().is_symlink()
            || metadata.permissions().mode() & 0o077 != 0
        {
            return Err(LeaseError::UnsafeFile);
        }
        if metadata.len() > MAX_LEASE_BYTES {
            return Err(LeaseError::TooLarge);
        }
        let bytes = fs::read(claimed_path).map_err(LeaseError::Read)?;
        let lease: ExecutionLease = serde_json::from_slice(&bytes).map_err(LeaseError::Parse)?;

        if lease.schema != LEASE_SCHEMA {
            return Err(LeaseError::Schema);
        }
        if !is_canonical_id(&lease.lease_id) || lease.issued_by.trim().is_empty() {
            return Err(LeaseError::Identity);
        }
        if lease.target_agent != "Codex" || !agent.eq_ignore_ascii_case("Codex") {
            return Err(LeaseError::Target);
        }
        if lease.message_sha256 != message_sha256(message) {
            return Err(LeaseError::MessageDigest);
        }

        let now = Utc::now();
        let issued_at = DateTime::parse_from_rfc3339(&lease.issued_at)
            .map_err(|_| LeaseError::InvalidIssuedAt)?
            .with_timezone(&Utc);
        if issued_at > now + chrono::Duration::seconds(30) {
            return Err(LeaseError::IssuedInFuture);
        }
        let expiry = DateTime::parse_from_rfc3339(&lease.expires_at)
            .map_err(|_| LeaseError::InvalidExpiry)?
            .with_timezone(&Utc);
        if expiry <= now {
            return Err(LeaseError::Expired);
        }
        if expiry > issued_at + chrono::Duration::minutes(MAX_LEASE_TTL_MINUTES) {
            return Err(LeaseError::ExpiryTooFar);
        }
        if lease.max_calls != 1 {
            return Err(LeaseError::MaxCalls);
        }
        if lease.cwd_allowlist.len() != 1 {
            return Err(LeaseError::Workspace);
        }
        let allowed =
            fs::canonicalize(&lease.cwd_allowlist[0]).map_err(|_| LeaseError::Workspace)?;
        if allowed != canonical_workspace {
            return Err(LeaseError::Workspace);
        }
        if lease.side_effect_ceiling != "read_only" {
            return Err(LeaseError::SideEffectCeiling);
        }
        if lease.install
            || lease.push
            || lease.deploy
            || lease.cloud_mutation
            || lease.secret_read
            || lease.external_message_send
            || lease.migration
            || lease.physical_control
        {
            return Err(LeaseError::ForbiddenAuthority);
        }
        Ok(lease)
    }
}

pub fn message_sha256(message: &str) -> String {
    let mut hash = Sha256::new();
    hash.update(message.as_bytes());
    format!("{:x}", hash.finalize())
}

fn unique_suffix() -> String {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    format!("{}-{nanos}", std::process::id())
}

fn is_canonical_id(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 80
        && value
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_'))
}

fn sibling_path(pending: &Path, state: &str, suffix: String) -> PathBuf {
    let file = pending
        .file_name()
        .and_then(|v| v.to_str())
        .unwrap_or("a2a-dispatch-lease.json");
    pending.with_file_name(format!("{file}.{state}.{suffix}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_dir(label: &str) -> PathBuf {
        let path =
            std::env::temp_dir().join(format!("ghostclaw-a2a-lease-{label}-{}", unique_suffix()));
        fs::create_dir(&path).unwrap();
        path
    }

    fn valid_lease(workspace: &Path, message: &str) -> ExecutionLease {
        ExecutionLease {
            schema: LEASE_SCHEMA.into(),
            lease_id: format!("lease-{}", unique_suffix()),
            issued_by: "operator".into(),
            target_agent: "Codex".into(),
            message_sha256: message_sha256(message),
            issued_at: Utc::now().to_rfc3339(),
            expires_at: (Utc::now() + chrono::Duration::minutes(5)).to_rfc3339(),
            max_calls: 1,
            cwd_allowlist: vec![workspace.to_path_buf()],
            side_effect_ceiling: "read_only".into(),
            install: false,
            push: false,
            deploy: false,
            cloud_mutation: false,
            secret_read: false,
            external_message_send: false,
            migration: false,
            physical_control: false,
        }
    }

    fn write_lease(path: &Path, lease: &ExecutionLease) {
        fs::write(path, serde_json::to_vec_pretty(lease).unwrap()).unwrap();
        fs::set_permissions(path, fs::Permissions::from_mode(0o600)).unwrap();
    }

    #[test]
    fn exact_lease_is_consumed_once_and_replay_is_refused() {
        let dir = temp_dir("single-use");
        let pending = dir.join("next.json");
        let workspace = fs::canonicalize(&dir).unwrap();
        let message = "bounded read-only review";
        write_lease(&pending, &valid_lease(&workspace, message));
        let guard = LeaseGuard::new(&pending);

        let consumed = guard.consume("Codex", message, &workspace).unwrap();
        assert!(!consumed.lease_id.is_empty());
        assert_eq!(consumed.message_sha256, message_sha256(message));
        assert!(matches!(
            guard.consume("Codex", message, &workspace),
            Err(LeaseError::Missing)
        ));
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn message_mismatch_is_refused_and_consumes_the_bad_lease() {
        let dir = temp_dir("mismatch");
        let pending = dir.join("next.json");
        let workspace = fs::canonicalize(&dir).unwrap();
        write_lease(&pending, &valid_lease(&workspace, "approved"));
        let guard = LeaseGuard::new(&pending);

        assert!(matches!(
            guard.consume("Codex", "different", &workspace),
            Err(LeaseError::MessageDigest)
        ));
        assert!(!pending.exists());
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn expired_lease_is_refused() {
        let dir = temp_dir("expired");
        let pending = dir.join("next.json");
        let workspace = fs::canonicalize(&dir).unwrap();
        let mut lease = valid_lease(&workspace, "approved");
        lease.expires_at = (Utc::now() - chrono::Duration::minutes(1)).to_rfc3339();
        write_lease(&pending, &lease);

        assert!(matches!(
            LeaseGuard::new(&pending).consume("Codex", "approved", &workspace),
            Err(LeaseError::Expired)
        ));
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn forbidden_authority_is_refused() {
        let dir = temp_dir("forbidden");
        let pending = dir.join("next.json");
        let workspace = fs::canonicalize(&dir).unwrap();
        let mut lease = valid_lease(&workspace, "approved");
        lease.push = true;
        write_lease(&pending, &lease);

        assert!(matches!(
            LeaseGuard::new(&pending).consume("Codex", "approved", &workspace),
            Err(LeaseError::ForbiddenAuthority)
        ));
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn permissive_lease_file_is_refused() {
        let dir = temp_dir("permissions");
        let pending = dir.join("next.json");
        let workspace = fs::canonicalize(&dir).unwrap();
        write_lease(&pending, &valid_lease(&workspace, "approved"));
        fs::set_permissions(&pending, fs::Permissions::from_mode(0o644)).unwrap();

        assert!(matches!(
            LeaseGuard::new(&pending).consume("Codex", "approved", &workspace),
            Err(LeaseError::UnsafeFile)
        ));
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn reused_lease_id_cannot_replace_consumed_evidence() {
        let dir = temp_dir("reused-id");
        let pending = dir.join("next.json");
        let workspace = fs::canonicalize(&dir).unwrap();
        let message = "approved";
        let lease = valid_lease(&workspace, message);
        let lease_id = lease.lease_id.clone();
        write_lease(&pending, &lease);
        let guard = LeaseGuard::new(&pending);
        guard.consume("Codex", message, &workspace).unwrap();

        let second = ExecutionLease {
            lease_id,
            ..valid_lease(&workspace, message)
        };
        write_lease(&pending, &second);
        assert!(matches!(
            guard.consume("Codex", message, &workspace),
            Err(LeaseError::Commit(_))
        ));
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn noncanonical_lease_id_is_refused() {
        let dir = temp_dir("noncanonical-id");
        let pending = dir.join("next.json");
        let workspace = fs::canonicalize(&dir).unwrap();
        let mut lease = valid_lease(&workspace, "approved");
        lease.lease_id = "!!!".into();
        write_lease(&pending, &lease);

        assert!(matches!(
            LeaseGuard::new(&pending).consume("Codex", "approved", &workspace),
            Err(LeaseError::Identity)
        ));
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn wrong_workspace_is_refused() {
        let dir = temp_dir("workspace");
        let other = temp_dir("workspace-other");
        let pending = dir.join("next.json");
        let workspace = fs::canonicalize(&dir).unwrap();
        let other_workspace = fs::canonicalize(&other).unwrap();
        write_lease(&pending, &valid_lease(&other_workspace, "approved"));

        assert!(matches!(
            LeaseGuard::new(&pending).consume("Codex", "approved", &workspace),
            Err(LeaseError::Workspace)
        ));
        let _ = fs::remove_dir_all(dir);
        let _ = fs::remove_dir_all(other);
    }
}
