//! Process execution that produces Evidence.
//!
//! This crate is the *only* place a check command is actually run. It captures
//! raw stdout/stderr and the real exit code, and hands back a
//! [`ghostclaw_core::Evidence`] — it never interprets, summarises, or judges
//! the output. Judgement belongs to the state machine in `ghostclaw-core`.
//!
//! Stage S2 (evidence half) of the build order.

#![forbid(unsafe_code)]
#![deny(missing_debug_implementations)]

use ghostclaw_core::Evidence;
use std::fmt;
use std::path::{Path, PathBuf};
use std::process::Command;

/// Subcommands this crate refuses to execute, regardless of caller.
///
/// The worker's permission tier covers checks only — tests, lints, builds.
/// Anything that mutates a remote or history is a human-gated action and must
/// travel through the state machine, so it is refused here structurally rather
/// than left to caller discipline.
const FORBIDDEN_GIT_SUBCOMMANDS: &[&str] = &["push", "merge", "rebase", "reset", "clean"];

/// Global git flags that consume the *following* argument as their value.
///
/// Without this list a scanner looking for "the first argument that isn't a
/// flag" mistakes a flag's value for the subcommand, so `git -C /tmp push`
/// reads as subcommand `/tmp` and slips past the refusal list entirely.
const GIT_FLAGS_TAKING_A_VALUE: &[&str] = &[
    "-C",
    "-c",
    "--git-dir",
    "--work-tree",
    "--namespace",
    "--exec-path",
    "--super-prefix",
];

/// Find the real subcommand, skipping global flags and their values.
fn git_subcommand(args: &[String]) -> Option<&str> {
    let mut i = 0;
    while i < args.len() {
        let arg = args[i].as_str();

        if arg == "--" {
            return args.get(i + 1).map(String::as_str);
        }
        if arg.starts_with("--") && arg.contains('=') {
            i += 1; // `--git-dir=/x` carries its own value
        } else if GIT_FLAGS_TAKING_A_VALUE.contains(&arg) {
            i += 2; // skip the flag and the value it swallows
        } else if arg.starts_with('-') {
            i += 1; // valueless flag such as `--no-pager` or `--bare`
        } else {
            return Some(arg);
        }
    }
    None
}

/// What to run.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CommandSpec {
    program: String,
    args: Vec<String>,
    cwd: Option<PathBuf>,
}

impl CommandSpec {
    pub fn new(program: impl Into<String>) -> Self {
        Self {
            program: program.into(),
            args: Vec::new(),
            cwd: None,
        }
    }

    pub fn arg(mut self, arg: impl Into<String>) -> Self {
        self.args.push(arg.into());
        self
    }

    pub fn args<I, S>(mut self, args: I) -> Self
    where
        I: IntoIterator<Item = S>,
        S: Into<String>,
    {
        self.args.extend(args.into_iter().map(Into::into));
        self
    }

    pub fn cwd(mut self, dir: impl AsRef<Path>) -> Self {
        self.cwd = Some(dir.as_ref().to_path_buf());
        self
    }

    /// Human-readable rendering, used as the `command` field on Evidence.
    pub fn display(&self) -> String {
        if self.args.is_empty() {
            self.program.clone()
        } else {
            format!("{} {}", self.program, self.args.join(" "))
        }
    }

    fn forbidden_reason(&self) -> Option<String> {
        let program = Path::new(&self.program)
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or(&self.program);

        if program != "git" {
            return None;
        }

        if let Some(sub) = git_subcommand(&self.args) {
            if let Some(f) = FORBIDDEN_GIT_SUBCOMMANDS.iter().find(|f| **f == sub) {
                return Some(format!("git {f}"));
            }
        }

        // Second layer, deliberately blunt: if a forbidden verb appears as a
        // bare argument anywhere, refuse regardless of what the scanner made
        // of the flags. A future git flag this scanner doesn't know about
        // would otherwise shift the parse and reopen the hole above. Refusing
        // a legitimate check whose argument happens to be the bare word
        // "push" is a far cheaper mistake than running an ungated one.
        self.args
            .iter()
            .find(|a| FORBIDDEN_GIT_SUBCOMMANDS.contains(&a.as_str()))
            .map(|a| format!("git {a}"))
    }
}

/// Why a run could not produce Evidence.
///
/// Note what is *not* here: a failing check is not an error. A command that
/// exits non-zero produced perfectly good Evidence of failure, and is returned
/// as `Ok`. Only the inability to run at all is an `Err`.
#[derive(Debug)]
pub enum WorkerError {
    /// The command is on the refusal list for this permission tier.
    Forbidden { command: String },
    /// The process could not be spawned (missing binary, bad cwd, ...).
    Spawn {
        command: String,
        source: std::io::Error,
    },
}

impl fmt::Display for WorkerError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            WorkerError::Forbidden { command } => write!(
                f,
                "refused: `{command}` is a human-gated action and cannot be run by the worker"
            ),
            WorkerError::Spawn { command, source } => {
                write!(f, "could not spawn `{command}`: {source}")
            }
        }
    }
}

impl std::error::Error for WorkerError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            WorkerError::Spawn { source, .. } => Some(source),
            WorkerError::Forbidden { .. } => None,
        }
    }
}

/// Run a check and capture raw output as Evidence.
///
/// A non-zero exit is a successful *capture* of a failing check — it returns
/// `Ok(Evidence)` with the real exit code, so the state machine can refuse it
/// on the caller's behalf.
pub fn run_check(spec: &CommandSpec) -> Result<Evidence, WorkerError> {
    if let Some(command) = spec.forbidden_reason() {
        return Err(WorkerError::Forbidden { command });
    }

    let mut cmd = Command::new(&spec.program);
    cmd.args(&spec.args);
    if let Some(dir) = &spec.cwd {
        cmd.current_dir(dir);
    }

    let output = cmd.output().map_err(|source| WorkerError::Spawn {
        command: spec.display(),
        source,
    })?;

    // A signal-killed process has no code; -1 records "died without a code"
    // rather than silently reporting success.
    let exit_code = output.status.code().unwrap_or(-1);

    Ok(Evidence::record(
        spec.display(),
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr),
        exit_code,
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn captures_a_real_zero_exit() {
        let spec = CommandSpec::new("sh").arg("-c").arg("echo hello");
        let ev = run_check(&spec).unwrap();

        assert_eq!(ev.exit_code(), 0);
        assert!(ev.is_passing());
        assert_eq!(ev.stdout().trim(), "hello");
    }

    #[test]
    fn a_failing_check_is_captured_not_raised() {
        let spec = CommandSpec::new("sh").arg("-c").arg("exit 42");
        let ev = run_check(&spec).expect("a failing check still produces evidence");

        assert_eq!(ev.exit_code(), 42);
        assert!(!ev.is_passing());
    }

    #[test]
    fn streams_are_kept_separate_and_verbatim() {
        let spec = CommandSpec::new("sh")
            .arg("-c")
            .arg("echo to-stdout; echo to-stderr 1>&2; exit 3");
        let ev = run_check(&spec).unwrap();

        assert_eq!(ev.stdout().trim(), "to-stdout");
        assert_eq!(ev.stderr().trim(), "to-stderr");
        assert_eq!(ev.exit_code(), 3);
    }

    #[test]
    fn runs_in_the_requested_directory() {
        let spec = CommandSpec::new("sh").arg("-c").arg("pwd").cwd("/tmp");
        let ev = run_check(&spec).unwrap();
        assert!(ev.stdout().trim().ends_with("tmp"));
    }

    #[test]
    fn human_gated_git_subcommands_are_refused() {
        for sub in FORBIDDEN_GIT_SUBCOMMANDS {
            let spec = CommandSpec::new("git").arg(*sub);
            let err = run_check(&spec).expect_err("worker must refuse this");
            assert!(
                matches!(err, WorkerError::Forbidden { .. }),
                "{sub} was not refused"
            );
        }
    }

    #[test]
    fn refusal_survives_an_absolute_path_and_leading_flags() {
        let spec = CommandSpec::new("/usr/bin/git")
            .arg("-C")
            .arg("/tmp")
            .arg("push");
        assert!(matches!(
            run_check(&spec),
            Err(WorkerError::Forbidden { .. })
        ));
    }

    #[test]
    fn flag_values_are_not_mistaken_for_the_subcommand() {
        // Each of these hides the verb behind a global flag that swallows a value.
        let cases = vec![
            CommandSpec::new("git").args(["-C", "/tmp", "push"]),
            CommandSpec::new("git").args(["-c", "user.name=x", "push"]),
            CommandSpec::new("git").args(["--git-dir", "/tmp/.git", "merge"]),
            CommandSpec::new("git").args(["--git-dir=/tmp/.git", "rebase"]),
            CommandSpec::new("git").args(["--no-pager", "reset"]),
        ];
        for spec in cases {
            assert!(
                matches!(run_check(&spec), Err(WorkerError::Forbidden { .. })),
                "`{}` was not refused",
                spec.display()
            );
        }
    }

    #[test]
    fn subcommand_scanner_skips_flags_and_their_values() {
        let args = |v: &[&str]| v.iter().map(|s| s.to_string()).collect::<Vec<_>>();

        assert_eq!(git_subcommand(&args(&["-C", "/tmp", "push"])), Some("push"));
        assert_eq!(git_subcommand(&args(&["--no-pager", "log"])), Some("log"));
        assert_eq!(
            git_subcommand(&args(&["--git-dir=/x", "status"])),
            Some("status")
        );
        assert_eq!(git_subcommand(&args(&["--version"])), None);
        assert_eq!(git_subcommand(&[]), None);
    }

    #[test]
    fn read_only_git_subcommands_are_allowed() {
        // The refusal list must not become a blanket ban on git.
        let spec = CommandSpec::new("git").arg("--version");
        let ev = run_check(&spec).expect("read-only git is a legitimate check");
        assert!(ev.is_passing());
    }

    #[test]
    fn a_missing_binary_is_an_error_not_evidence() {
        let spec = CommandSpec::new("ghostclaw-no-such-binary-xyz");
        assert!(matches!(run_check(&spec), Err(WorkerError::Spawn { .. })));
    }

    #[test]
    fn display_renders_program_and_args() {
        let spec = CommandSpec::new("cargo").args(["test", "-p", "ghostclaw-core"]);
        assert_eq!(spec.display(), "cargo test -p ghostclaw-core");
        assert_eq!(CommandSpec::new("pwd").display(), "pwd");
    }
}
