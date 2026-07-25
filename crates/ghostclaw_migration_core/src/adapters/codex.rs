//! Codex dry-run adapter boundary.
//!
//! This adapter creates command previews only. It does not spawn Codex, shell
//! out to a worker, send repo content to a provider, or mutate source files.

use crate::adapters::traits::WorkerAdapter;
use crate::error::Result;
use crate::redaction::redact_sensitive;
use crate::schema::{escape_json, redacted_option_json, RouteJob};

/// Preview returned by a dry-run Codex adapter.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CodexDryRunPreview {
    /// Adapter name.
    pub adapter: String,
    /// Preview status.
    pub status: String,
    /// Target route job id.
    pub route_job_id: String,
    /// Preview command that an approved future adapter could execute.
    pub command_preview: String,
    /// Whether a live worker was executed.
    pub executed_live: bool,
    /// Optional reason or note.
    pub reason: Option<String>,
}

impl CodexDryRunPreview {
    /// Serializes to JSON without external dependencies.
    pub fn to_json(&self) -> String {
        format!(
            "{{\"adapter\":\"{}\",\"status\":\"{}\",\"route_job_id\":\"{}\",\"command_preview\":\"{}\",\"executed_live\":{},\"reason\":{}}}",
            escape_json(&self.adapter),
            escape_json(&self.status),
            escape_json(&self.route_job_id),
            escape_json(&redact_sensitive(&self.command_preview)),
            self.executed_live,
            redacted_option_json(self.reason.as_deref())
        )
    }
}

/// Local-only Codex adapter implementation.
#[derive(Clone, Debug, Default)]
pub struct CodexDryRunAdapter;

impl WorkerAdapter for CodexDryRunAdapter {
    fn preview(&self, job: &RouteJob) -> Result<CodexDryRunPreview> {
        Ok(preview_codex_dry_run(job))
    }

    fn executed_live(&self) -> bool {
        false
    }
}

/// Builds a dry-run preview for a queued route job.
pub fn preview_codex_dry_run(job: &RouteJob) -> CodexDryRunPreview {
    CodexDryRunPreview {
        adapter: "codex_dry_run_adapter".to_string(),
        status: "dry_run_preview_only".to_string(),
        route_job_id: job.id.clone(),
        command_preview: format!(
            "codex --dry-run --lane {} --task {}",
            job.lane.as_str(),
            shell_quote_posix(&redact_sensitive(&job.task))
        ),
        executed_live: false,
        reason: Some("live_codex_execution_blocked_until_exact_gate".to_string()),
    }
}

fn shell_quote_posix(value: &str) -> String {
    format!("'{}'", value.replace('\'', "'\"'\"'"))
}

#[cfg(test)]
mod tests {
    use super::shell_quote_posix;

    #[test]
    fn shell_quote_posix_should_keep_single_quotes_inside_one_argument() {
        assert_eq!(
            shell_quote_posix("inspect'; echo unsafe"),
            "'inspect'\"'\"'; echo unsafe'"
        );
    }
}
