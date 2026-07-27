//! Hardened invocation of the real local Codex CLI.
//!
//! The child runs ephemerally, ignores user configuration, is pinned to an
//! exact canonical workspace, and receives a read-only sandbox. Its process
//! environment is rebuilt from a small allowlist rather than inheriting API
//! keys or unrelated credentials from the MCP host.

use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use thiserror::Error;
use tokio::process::Command;
use tokio::time::timeout;

pub const EXEC_TIMEOUT: Duration = Duration::from_secs(300);
const CODEX_BINARY: &str = "/Users/sirinx/.local/bin/codex";
const SAFE_PATH: &str = "/Users/sirinx/.local/bin:/opt/homebrew/bin:/usr/bin:/bin";
const SAFE_HOME: &str = "/Users/sirinx";
const SAFE_TMP: &str = "/tmp";
const MAX_OUTPUT_BYTES: u64 = 1024 * 1024;

#[derive(Debug, Error)]
pub enum CodexError {
    #[error("failed to prepare private Codex output: {0}")]
    Temp(#[source] std::io::Error),
    #[error("failed to spawn `codex`: {0}")]
    Spawn(#[source] std::io::Error),
    #[error("codex exec timed out after {0:?}")]
    Timeout(Duration),
    #[error("codex exec exited with status {status}")]
    NonZeroExit { status: i32 },
    #[error("codex wrote no last-message file")]
    NoOutput,
    #[error("codex output exceeded the 1 MiB limit")]
    OutputTooLarge,
}

/// Runs one message in the exact approved workspace.
pub async fn exec(message: &str, canonical_workspace: &Path) -> Result<String, CodexError> {
    exec_inner(message, None, canonical_workspace).await
}

/// Resumes an existing Codex session with a new message in the exact approved workspace.
pub async fn exec_resume(
    session_id: &str,
    message: &str,
    canonical_workspace: &Path,
) -> Result<String, CodexError> {
    exec_inner(message, Some(session_id), canonical_workspace).await
}

async fn exec_inner(
    message: &str,
    resume_session: Option<&str>,
    canonical_workspace: &Path,
) -> Result<String, CodexError> {
    let (private_dir, out_path) = create_private_output_dir().map_err(CodexError::Temp)?;

    let mut command = Command::new(CODEX_BINARY);
    command.arg("exec");
    if let Some(session_id) = resume_session {
        command.arg("resume").arg(session_id);
    }
    command
        .arg("--ephemeral")
        .arg("--ignore-user-config")
        .arg("--sandbox")
        .arg("read-only")
        .arg("--cd")
        .arg(canonical_workspace)
        .arg("--output-last-message")
        .arg(&out_path)
        .arg(message)
        .current_dir(canonical_workspace)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .kill_on_drop(true)
        .env_clear()
        .env("HOME", SAFE_HOME)
        .env("PATH", SAFE_PATH)
        .env("LANG", "en_US.UTF-8")
        .env("LC_ALL", "en_US.UTF-8")
        .env("TMPDIR", SAFE_TMP);

    let child = match command.spawn() {
        Ok(child) => child,
        Err(error) => {
            cleanup(&private_dir).await;
            return Err(CodexError::Spawn(error));
        }
    };

    // kill_on_drop(true) terminates the subprocess if the timeout drops the
    // wait future. The private directory is removed on every terminal path.
    let output = match timeout(EXEC_TIMEOUT, child.wait_with_output()).await {
        Ok(Ok(output)) => output,
        Ok(Err(error)) => {
            cleanup(&private_dir).await;
            return Err(CodexError::Spawn(error));
        }
        Err(_) => {
            cleanup(&private_dir).await;
            return Err(CodexError::Timeout(EXEC_TIMEOUT));
        }
    };

    if !output.status.success() {
        let status = output.status.code().unwrap_or(-1);
        cleanup(&private_dir).await;
        return Err(CodexError::NonZeroExit { status });
    }

    let metadata = match tokio::fs::metadata(&out_path).await {
        Ok(metadata) => metadata,
        Err(_) => {
            cleanup(&private_dir).await;
            return Err(CodexError::NoOutput);
        }
    };
    if metadata.len() > MAX_OUTPUT_BYTES {
        cleanup(&private_dir).await;
        return Err(CodexError::OutputTooLarge);
    }

    let text = match tokio::fs::read_to_string(&out_path).await {
        Ok(text) => text,
        Err(_) => {
            cleanup(&private_dir).await;
            return Err(CodexError::NoOutput);
        }
    };
    cleanup(&private_dir).await;

    if text.trim().is_empty() {
        return Err(CodexError::NoOutput);
    }
    Ok(text)
}

fn create_private_output_dir() -> std::io::Result<(PathBuf, PathBuf)> {
    use std::os::unix::fs::PermissionsExt;

    let temp_root = Path::new(SAFE_TMP);
    for attempt in 0..16_u8 {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos();
        let dir = temp_root.join(format!(
            "ghostclaw-a2a-codex-{}-{nanos}-{attempt}",
            std::process::id()
        ));
        match std::fs::create_dir(&dir) {
            Ok(()) => {
                std::fs::set_permissions(&dir, std::fs::Permissions::from_mode(0o700))?;
                return Ok((dir.clone(), dir.join("last-message.txt")));
            }
            Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => continue,
            Err(error) => return Err(error),
        }
    }
    Err(std::io::Error::new(
        std::io::ErrorKind::AlreadyExists,
        "could not allocate a unique private output directory",
    ))
}

async fn cleanup(path: &Path) {
    let _ = tokio::fs::remove_dir_all(path).await;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn private_output_directory_is_unique_and_owner_only() {
        use std::os::unix::fs::PermissionsExt;

        let (first_dir, first_output) = create_private_output_dir().unwrap();
        let (second_dir, second_output) = create_private_output_dir().unwrap();
        assert_ne!(first_dir, second_dir);
        assert_eq!(
            std::fs::metadata(&first_dir).unwrap().permissions().mode() & 0o777,
            0o700
        );
        assert_eq!(first_output.file_name().unwrap(), "last-message.txt");
        assert_eq!(second_output.file_name().unwrap(), "last-message.txt");
        std::fs::remove_dir_all(first_dir).unwrap();
        std::fs::remove_dir_all(second_dir).unwrap();
    }

    #[tokio::test]
    #[ignore = "hits the real codex CLI; requires an explicit one-off operator test"]
    async fn real_prompt_gets_real_answer() {
        let workspace = std::fs::canonicalize(".").unwrap();
        let output = exec("Reply with exactly: dispatch ok", &workspace)
            .await
            .unwrap();
        assert_eq!(output.trim(), "dispatch ok");
    }
}
