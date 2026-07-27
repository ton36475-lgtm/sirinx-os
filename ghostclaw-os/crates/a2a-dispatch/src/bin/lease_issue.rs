//! Issues a fail-closed, one-use, read-only execution lease with a maximum TTL
//! of 15 minutes. All side-effect flags must remain false because authority for
//! side effects lives in the separately gated orchestrator shell, never in the
//! agent dispatch lane.

use std::env;
use std::fs;
use std::io::{self, Read, Write};
use std::os::unix::fs::{OpenOptionsExt, PermissionsExt};
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use chrono::{Duration, Utc};
use ghostclaw_a2a_dispatch::lease;
use serde_json;

const DEFAULT_LEASE_FILE: &str = "/Users/sirinx/.codex/a2a-approvals/next.json";
const DEFAULT_WORKSPACE: &str = "/Users/sirinx/sirinx-os";
const MAX_MESSAGE_BYTES: usize = 60 * 1024;

struct Args {
    message_file: Option<PathBuf>,
    ttl_minutes: i64,
    issued_by: String,
    show: bool,
}

fn fail(message: impl AsRef<str>, code: i32) -> ! {
    eprintln!("error: {}", message.as_ref());
    std::process::exit(code);
}

fn usage() -> &'static str {
    "usage: lease_issue [MESSAGE_FILE | --message-file MESSAGE_FILE] \
[--ttl MINUTES] [--issued-by IDENTITY] [--show]"
}

fn parse_args() -> Args {
    let mut message_file = None;
    let mut ttl_minutes = 5_i64;
    let mut issued_by = env::var("USER").unwrap_or_else(|_| "operator".to_string());
    let mut show = false;
    let mut args = env::args().skip(1);

    while let Some(argument) = args.next() {
        match argument.as_str() {
            "--ttl" => {
                let value = args
                    .next()
                    .unwrap_or_else(|| fail("--ttl requires a value", 2));
                ttl_minutes = value
                    .parse::<i64>()
                    .unwrap_or_else(|_| fail("--ttl must be an integer", 2));
            }
            "--issued-by" => {
                issued_by = args
                    .next()
                    .unwrap_or_else(|| fail("--issued-by requires a value", 2));
            }
            "--message-file" => {
                let value = args
                    .next()
                    .unwrap_or_else(|| fail("--message-file requires a value", 2));
                if message_file.replace(PathBuf::from(value)).is_some() {
                    fail("MESSAGE_FILE may only be supplied once", 2);
                }
            }
            "--show" => show = true,
            "-h" | "--help" => {
                println!("{}", usage());
                std::process::exit(0);
            }
            value if value.starts_with('-') && value != "-" => {
                fail(format!("unknown option: {value}\n{}", usage()), 2);
            }
            value => {
                if message_file.replace(PathBuf::from(value)).is_some() {
                    fail("MESSAGE_FILE may only be supplied once", 2);
                }
            }
        }
    }

    if !(1..=15).contains(&ttl_minutes) {
        fail("--ttl must be in the inclusive range 1..=15", 2);
    }

    issued_by = issued_by.trim().to_string();
    if issued_by.is_empty() {
        fail("--issued-by must not be empty", 2);
    }

    if !show && message_file.is_none() {
        fail(format!("MESSAGE_FILE is required\n{}", usage()), 2);
    }

    Args {
        message_file,
        ttl_minutes,
        issued_by,
        show,
    }
}

fn lease_path() -> PathBuf {
    env::var_os("GHOSTCLAW_A2A_LEASE_FILE")
        .filter(|value| !value.is_empty())
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from(DEFAULT_LEASE_FILE))
}

fn workspace_path() -> PathBuf {
    let path = env::var_os("GHOSTCLAW_A2A_WORKSPACE")
        .filter(|value| !value.is_empty())
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from(DEFAULT_WORKSPACE));

    fs::canonicalize(&path).unwrap_or_else(|error| {
        fail(
            format!(
                "cannot canonicalize workspace {}: {error}",
                path.display()
            ),
            1,
        )
    })
}

fn show_pending(path: &PathBuf) {
    if !path.exists() {
        eprintln!("no pending lease at {}", path.display());
        return;
    }

    let metadata = fs::metadata(path).unwrap_or_else(|error| {
        fail(
            format!("cannot inspect pending lease {}: {error}", path.display()),
            1,
        )
    });
    let bytes = fs::read(path).unwrap_or_else(|error| {
        fail(
            format!("cannot read pending lease {}: {error}", path.display()),
            1,
        )
    });
    let document: serde_json::Value = serde_json::from_slice(&bytes).unwrap_or_else(|error| {
        fail(
            format!("pending lease {} is invalid JSON: {error}", path.display()),
            1,
        )
    });

    println!("path: {}", path.display());
    println!("byte_size: {}", metadata.len());
    println!("file_mode: {:04o}", metadata.permissions().mode() & 0o7777);

    for field in [
        "lease_id",
        "target_agent",
        "message_sha256",
        "issued_at",
        "expires_at",
        "side_effect_ceiling",
        "max_calls",
    ] {
        let value = document.get(field).unwrap_or(&serde_json::Value::Null);
        if let Some(text) = value.as_str() {
            println!("{field}: {text}");
        } else {
            println!("{field}: {value}");
        }
    }
}

fn read_message(path: &PathBuf) -> String {
    let mut input = String::new();

    if path.as_os_str() == "-" {
        io::stdin()
            .read_to_string(&mut input)
            .unwrap_or_else(|error| fail(format!("cannot read message from stdin: {error}"), 1));
    } else {
        input = fs::read_to_string(path).unwrap_or_else(|error| {
            fail(
                format!("cannot read message file {}: {error}", path.display()),
                1,
            )
        });
    }

    let stripped = input.trim().to_string();
    if stripped.is_empty() {
        fail("message must not be empty after trimming whitespace", 2);
    }
    if stripped.len() > MAX_MESSAGE_BYTES {
        fail("message exceeds the 60 KiB limit after trimming whitespace", 2);
    }

    stripped
}

fn temp_path(path: &PathBuf) -> PathBuf {
    let mut value = path.as_os_str().to_os_string();
    value.push(".tmp");
    PathBuf::from(value)
}

fn refuse_existing(path: &PathBuf) -> ! {
    fail(
        format!(
            "pending lease already exists at {}; consume, expire, or rm the existing lease first",
            path.display()
        ),
        3,
    )
}

fn main() {
    let args = parse_args();
    let pending = lease_path();

    if args.show {
        show_pending(&pending);
        return;
    }

    if pending.exists() {
        refuse_existing(&pending);
    }

    let message_path = args.message_file.as_ref().expect("validated message path");
    let message = read_message(message_path);
    let now = Utc::now();
    let epoch_nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_else(|error| fail(format!("system clock precedes Unix epoch: {error}"), 1))
        .as_nanos();
    let lease_id = format!("lease-{}-{epoch_nanos}", std::process::id());

    if lease_id.len() > 80
        || !lease_id
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || byte == b'-' || byte == b'_')
    {
        fail("generated lease ID is not canonical", 1);
    }

    let issued_at = now.format("%Y-%m-%dT%H:%M:%SZ").to_string();
    let expires_at = (now + Duration::minutes(args.ttl_minutes))
        .format("%Y-%m-%dT%H:%M:%SZ")
        .to_string();
    let digest = lease::message_sha256(&message);

    let execution_lease = lease::ExecutionLease {
        schema: lease::LEASE_SCHEMA.to_string(),
        lease_id: lease_id.clone(),
        issued_by: args.issued_by,
        target_agent: "Codex".to_string(),
        message_sha256: digest.clone(),
        issued_at: issued_at.clone(),
        expires_at: expires_at.clone(),
        max_calls: 1,
        cwd_allowlist: vec![workspace_path()],
        side_effect_ceiling: "read_only".to_string(),
        install: false,
        push: false,
        deploy: false,
        cloud_mutation: false,
        secret_read: false,
        external_message_send: false,
        migration: false,
        physical_control: false,
    };

    let json = serde_json::to_vec_pretty(&execution_lease)
        .unwrap_or_else(|error| fail(format!("cannot serialize execution lease: {error}"), 1));

    let parent = pending
        .parent()
        .unwrap_or_else(|| fail("pending lease path has no parent directory", 1));
    fs::create_dir_all(parent).unwrap_or_else(|error| {
        fail(
            format!("cannot create lease directory {}: {error}", parent.display()),
            1,
        )
    });

    if pending.exists() {
        refuse_existing(&pending);
    }

    let temporary = temp_path(&pending);
    let mut file = std::fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .mode(0o600)
        .open(&temporary)
        .unwrap_or_else(|error| {
            fail(
                format!(
                    "cannot create temporary lease file {}: {error}",
                    temporary.display()
                ),
                1,
            )
        });

    if let Err(error) = file.write_all(&json).and_then(|_| file.write_all(b"\n")) {
        let _ = fs::remove_file(&temporary);
        fail(
            format!(
                "cannot write temporary lease file {}: {error}",
                temporary.display()
            ),
            1,
        );
    }
    if let Err(error) = file.sync_all() {
        let _ = fs::remove_file(&temporary);
        fail(
            format!(
                "cannot sync temporary lease file {}: {error}",
                temporary.display()
            ),
            1,
        );
    }
    drop(file);

    if pending.exists() {
        let _ = fs::remove_file(&temporary);
        refuse_existing(&pending);
    }

    if let Err(error) = fs::rename(&temporary, &pending) {
        let target_exists = pending.exists();
        let _ = fs::remove_file(&temporary);
        if target_exists || error.kind() == io::ErrorKind::AlreadyExists {
            refuse_existing(&pending);
        }
        fail(
            format!(
                "cannot publish lease at {}: {error}",
                pending.display()
            ),
            1,
        );
    }

    eprintln!("lease_id: {lease_id}");
    eprintln!("target_agent: Codex");
    eprintln!("message_sha256: {digest}");
    eprintln!("expires_at: {expires_at}");
    eprintln!("side_effect_ceiling: read_only");
    eprintln!("all side-effect flags are false");
}
