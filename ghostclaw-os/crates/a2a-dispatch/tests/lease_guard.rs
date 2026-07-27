use std::fs;
use std::os::unix::fs::PermissionsExt;
use std::path::Path;

use chrono::{Duration, Utc};
use ghostclaw_a2a_dispatch::lease::{
    message_sha256, ExecutionLease, LeaseError, LeaseGuard, LEASE_SCHEMA,
};
use tempfile::tempdir;

fn valid_lease(workspace: &Path, message: &str) -> ExecutionLease {
    let now = Utc::now();
    ExecutionLease {
        schema: LEASE_SCHEMA.into(),
        lease_id: "lease-integration-test".into(),
        issued_by: "operator".into(),
        target_agent: "Codex".into(),
        message_sha256: message_sha256(message),
        issued_at: now.to_rfc3339(),
        expires_at: (now + Duration::minutes(5)).to_rfc3339(),
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

fn write_lease(path: &Path, lease: &ExecutionLease, mode: u32) {
    fs::write(path, serde_json::to_vec_pretty(lease).unwrap()).unwrap();
    fs::set_permissions(path, fs::Permissions::from_mode(mode)).unwrap();
}

#[test]
fn test_valid_lease_is_consumed_exactly_once() {
    let dir = tempdir().unwrap();
    let workspace = fs::canonicalize(dir.path()).unwrap();
    let pending = dir.path().join("next.json");
    let message = "bounded read-only review";

    write_lease(&pending, &valid_lease(&workspace, message), 0o600);
    let guard = LeaseGuard::new(&pending);

    let consumed = guard.consume("Codex", message, &workspace).unwrap();
    assert!(!consumed.lease_id.is_empty());
    assert_eq!(consumed.message_sha256, message_sha256(message));
    assert!(matches!(
        guard.consume("Codex", message, &workspace),
        Err(LeaseError::Missing)
    ));
}

#[test]
fn test_message_mismatch_consumes_and_rejects() {
    let dir = tempdir().unwrap();
    let workspace = fs::canonicalize(dir.path()).unwrap();
    let pending = dir.path().join("next.json");
    let message = "approved message";

    write_lease(&pending, &valid_lease(&workspace, message), 0o600);
    let guard = LeaseGuard::new(&pending);

    let result = guard.consume("Codex", "different message", &workspace);
    assert!(matches!(result, Err(LeaseError::MessageDigest)));
    assert!(!pending.exists());
}

#[test]
fn test_target_agent_mismatch_is_refused() {
    let dir = tempdir().unwrap();
    let workspace = fs::canonicalize(dir.path()).unwrap();
    let pending = dir.path().join("next.json");
    let message = "approved message";

    write_lease(&pending, &valid_lease(&workspace, message), 0o600);

    let result = LeaseGuard::new(&pending).consume("Antigravity", message, &workspace);
    assert!(matches!(result, Err(LeaseError::Target)));
}

#[test]
fn test_expired_lease_is_refused() {
    let dir = tempdir().unwrap();
    let workspace = fs::canonicalize(dir.path()).unwrap();
    let pending = dir.path().join("next.json");
    let message = "approved message";
    let mut lease = valid_lease(&workspace, message);
    lease.expires_at = (Utc::now() - Duration::seconds(1)).to_rfc3339();

    write_lease(&pending, &lease, 0o600);

    let result = LeaseGuard::new(&pending).consume("Codex", message, &workspace);
    assert!(matches!(result, Err(LeaseError::Expired)));
}

#[test]
fn test_unsafe_file_permissions_refused() {
    let dir = tempdir().unwrap();
    let workspace = fs::canonicalize(dir.path()).unwrap();
    let pending = dir.path().join("next.json");
    let message = "approved message";

    write_lease(&pending, &valid_lease(&workspace, message), 0o644);

    let result = LeaseGuard::new(&pending).consume("Codex", message, &workspace);
    assert!(matches!(result, Err(LeaseError::UnsafeFile)));
}

#[test]
fn test_max_calls_not_one_refused() {
    let dir = tempdir().unwrap();
    let workspace = fs::canonicalize(dir.path()).unwrap();
    let pending = dir.path().join("next.json");
    let message = "approved message";
    let mut lease = valid_lease(&workspace, message);
    lease.max_calls = 2;

    write_lease(&pending, &lease, 0o600);

    let result = LeaseGuard::new(&pending).consume("Codex", message, &workspace);
    assert!(matches!(result, Err(LeaseError::MaxCalls)));
}

#[test]
fn test_side_effect_flag_true_refused() {
    let dir = tempdir().unwrap();
    let workspace = fs::canonicalize(dir.path()).unwrap();
    let pending = dir.path().join("next.json");
    let message = "approved message";
    let mut lease = valid_lease(&workspace, message);
    lease.install = true;

    write_lease(&pending, &lease, 0o600);

    let result = LeaseGuard::new(&pending).consume("Codex", message, &workspace);
    assert!(matches!(result, Err(LeaseError::ForbiddenAuthority)));
}
