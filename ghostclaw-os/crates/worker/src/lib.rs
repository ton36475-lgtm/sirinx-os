//! GHOSTCLAW Worker — executes MAKER/CHECKER work, runs cargo/npm as child processes.

use ghostclaw_core::Evidence;
use tokio::process::Command;

/// Run a verification command and capture RAW output.
/// The returned Evidence is what CHECKER gates on — never an LLM's self-report.
pub async fn run_check(cmd: &str, args: &[&str], cwd: &str) -> std::io::Result<Evidence> {
    let output = Command::new(cmd)
        .args(args)
        .current_dir(cwd)
        .output()
        .await?;

    Ok(Evidence {
        command: format!("{cmd} {}", args.join(" ")),
        exit_code: output.status.code().unwrap_or(-1),
        stdout: String::from_utf8_lossy(&output.stdout).into_owned(),
        stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
    })
}

/// Run cargo test in the given directory.
pub async fn cargo_test(cwd: &str) -> std::io::Result<Evidence> {
    run_check("cargo", &["test", "--quiet"], cwd).await
}

/// Run cargo check in the given directory.
pub async fn cargo_check(cwd: &str) -> std::io::Result<Evidence> {
    run_check("cargo", &["check"], cwd).await
}

/// Run npm build in the given directory.
pub async fn npm_build(cwd: &str) -> std::io::Result<Evidence> {
    run_check("npm", &["run", "build"], cwd).await
}
