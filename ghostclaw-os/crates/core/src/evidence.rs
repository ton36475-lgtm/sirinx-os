//! Evidence. LOCKED governance — see GHOSTCLAW promptpack [2].
//!
//! Evidence is raw process output plus an exit code. There is deliberately no
//! constructor that accepts a summary, a claim, or a boolean "it passed" —
//! passing is *derived* from the exit code and cannot be asserted by a caller.

/// Raw captured output of one executed command.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Evidence {
    command: String,
    stdout: String,
    stderr: String,
    exit_code: i32,
}

impl Evidence {
    /// Record raw output. `exit_code` is the process's real exit status.
    pub fn record(
        command: impl Into<String>,
        stdout: impl Into<String>,
        stderr: impl Into<String>,
        exit_code: i32,
    ) -> Self {
        Self {
            command: command.into(),
            stdout: stdout.into(),
            stderr: stderr.into(),
            exit_code,
        }
    }

    pub fn command(&self) -> &str {
        &self.command
    }

    pub fn stdout(&self) -> &str {
        &self.stdout
    }

    pub fn stderr(&self) -> &str {
        &self.stderr
    }

    pub fn exit_code(&self) -> i32 {
        self.exit_code
    }

    /// Passing is exit code 0 and nothing else. Not a summary, not a vibe.
    pub fn is_passing(&self) -> bool {
        self.exit_code == 0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn passing_is_derived_from_exit_code_only() {
        let ok = Evidence::record("cargo test", "test result: ok. 4 passed", "", 0);
        assert!(ok.is_passing());

        // stdout that *claims* success cannot override a non-zero exit code.
        let lying = Evidence::record("cargo test", "test result: ok. all green!", "", 1);
        assert!(!lying.is_passing());
    }

    #[test]
    fn raw_streams_are_preserved_verbatim() {
        let e = Evidence::record("cmd", "out", "err", 2);
        assert_eq!(e.command(), "cmd");
        assert_eq!(e.stdout(), "out");
        assert_eq!(e.stderr(), "err");
        assert_eq!(e.exit_code(), 2);
    }
}
