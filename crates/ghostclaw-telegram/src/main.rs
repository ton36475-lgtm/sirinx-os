//! # ghostclaw-telegram
//!
//! Telegram bot binary for the GhostClaw command center.
//!
//! Receives Telegram messages, parses them into [`Command`]s, routes them
//! through the GhostClaw control plane, and posts results back to the chat.
//!
//! ## Command Surface
//!
//! The bot responds to these slash commands:
//!
//! | Command                | Description                              |
//! |------------------------|------------------------------------------|
//! | `/status`              | Show system status and pending task count |
//! | `/submit <description>`| Submit a new task for processing         |
//! | `/tasks`               | List all tasks (with stage filters)      |
//! | `/approve <task_id>`   | Approve a task for execution             |
//! | `/reject <task_id>`    | Reject a task                            |
//! | `/run <mission_id>`    | Run a mission to completion              |
//! | `/help`                | Show available commands                  |
//!
//! ## Safety Contract
//!
//! All command handlers operate in local-safe mode by default.
//! No handler sends messages to external chats, performs network writes,
//! or reads secrets. The bot only responds to the authorized chat ID.

use teloxide::prelude::*;

// ─────────────────────────────────────────────────────────────
// Command Enum
// ─────────────────────────────────────────────────────────────

/// Parsed Telegram slash command.
///
/// Each variant maps to a GhostClaw control-plane operation.
/// The [`Command::parse`] method converts raw message text into
/// a typed command, returning `None` for unrecognized input.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Command {
    /// `/status` — show system status.
    Status,
    /// `/submit <description>` — submit a new task.
    Submit {
        /// The task description text.
        description: String,
    },
    /// `/tasks [stage]` — list tasks, optionally filtered by stage.
    Tasks {
        /// Optional stage filter (e.g., `triage`, `done`).
        stage_filter: Option<String>,
    },
    /// `/approve <task_id>` — approve a task.
    Approve {
        /// The task ID to approve.
        task_id: String,
    },
    /// `/reject <task_id> [reason]` — reject a task.
    Reject {
        /// The task ID to reject.
        task_id: String,
        /// Optional rejection reason.
        reason: Option<String>,
    },
    /// `/run <mission_id>` — run a mission to completion.
    Run {
        /// The mission ID to run.
        mission_id: String,
    },
    /// `/help` — show available commands.
    Help,
}

impl Command {
    /// Parses a raw Telegram message into a [`Command`].
    ///
    /// Returns `None` if the message is not a recognized slash command
    /// or if required arguments are missing.
    ///
    /// # Example
    ///
    /// ```rust,ignore
    /// let cmd = Command::parse("/submit Fix the database schema");
    /// assert_eq!(cmd, Some(Command::Submit {
    ///     description: "Fix the database schema".to_string(),
    /// }));
    /// ```
    pub fn parse(_text: &str) -> Option<Self> {
        unimplemented!("Command::parse — Codex will parse Telegram message text")
    }

    /// Returns the help text for this command surface.
    pub fn help_text() -> &'static str {
        "\
GhostClaw Command Center\n\
\n\
/status — Show system status\n\
/submit <description> — Submit a new task\n\
/tasks [stage] — List tasks (filter: triage, maker, checker, guard, done)\n\
/approve <task_id> — Approve a task for execution\n\
/reject <task_id> [reason] — Reject a task\n\
/run <mission_id> — Run a mission to completion\n\
/help — Show this help message\n"
    }
}

// ─────────────────────────────────────────────────────────────
// Bot Configuration
// ─────────────────────────────────────────────────────────────

/// Configuration for the Telegram bot.
#[derive(Clone, Debug)]
pub struct BotConfig {
    /// Authorized Telegram chat ID. Messages from other chats are ignored.
    pub authorized_chat_id: i64,
    /// GhostClaw Hermes API URL (for routing commands).
    pub hermes_api_url: String,
    /// Whether to allow live execution (default: `false`).
    pub allow_live: bool,
    /// Bot display name shown in `/status` responses.
    pub bot_name: String,
}

impl Default for BotConfig {
    fn default() -> Self {
        Self {
            authorized_chat_id: 0,
            hermes_api_url: "http://127.0.0.1:8787".to_string(),
            allow_live: false,
            bot_name: "GhostClaw".to_string(),
        }
    }
}

// ─────────────────────────────────────────────────────────────
// Bot Handler Result
// ─────────────────────────────────────────────────────────────

/// Result of handling a Telegram command.
#[derive(Clone, Debug)]
pub struct CommandResult {
    /// Response text to send back to the Telegram chat.
    pub reply_text: String,
    /// Whether a state-changing action was performed (vs. read-only).
    pub action_taken: bool,
    /// Whether the action was live (vs. dry-run preview).
    pub executed_live: bool,
}

// ─────────────────────────────────────────────────────────────
// TelegramBot Struct
// ─────────────────────────────────────────────────────────────

/// The GhostClaw Telegram bot.
///
/// Wraps a `teloxide::Bot` and routes incoming messages through
/// the GhostClaw control plane via the Hermes HTTP API.
///
/// # Safety
///
/// The bot defaults to local-safe mode. It will only communicate with
/// the local Hermes API and will never send messages to chats other
/// than the authorized chat ID.
pub struct TelegramBot {
    /// The teloxide bot instance.
    #[allow(dead_code)]
    bot: Bot,
    /// Bot configuration.
    config: BotConfig,
}

impl TelegramBot {
    /// Creates a new Telegram bot with the given configuration.
    ///
    /// Reads the bot token from the `TELEGRAM_BOT_TOKEN` environment variable.
    ///
    /// # Panics
    ///
    /// Panics if `TELEGRAM_BOT_TOKEN` is not set.
    pub fn new(config: BotConfig) -> Self {
        Self {
            bot: Bot::from_env(),
            config,
        }
    }

    /// Returns the bot configuration.
    pub fn config(&self) -> &BotConfig {
        &self.config
    }

    /// Handles a parsed command and returns a result for the chat.
    ///
    /// This is the core dispatch method. Each [`Command`] variant maps to
    /// a call against the Hermes HTTP API (or a local-safe stub).
    ///
    /// # Errors
    ///
    /// Returns an error string if the Hermes API is unreachable or
    /// returns an error.
    pub async fn handle_command(&self, _command: Command) -> Result<CommandResult, String> {
        unimplemented!("TelegramBot::handle_command — Codex will dispatch to Hermes API")
    }

    /// Starts the long-polling loop for receiving Telegram updates.
    ///
    /// Blocks until the bot is stopped or a fatal error occurs.
    pub async fn run(&self) {
        unimplemented!("TelegramBot::run — Codex will wire teloxide MessageHandler")
    }

    /// Sends a reply message to the authorized chat.
    ///
    /// # Errors
    ///
    /// Returns an error if the Telegram API call fails.
    pub async fn send_reply(&self, _chat_id: i64, _text: &str) -> Result<(), String> {
        unimplemented!("TelegramBot::send_reply — Codex will call bot.send_message()")
    }

    /// Validates that an incoming update is from the authorized chat.
    ///
    /// Returns `false` (and logs a warning) for unauthorized chats.
    pub fn is_authorized(&self, _chat_id: i64) -> bool {
        unimplemented!("TelegramBot::is_authorized — Codex will check against config")
    }
}

// ─────────────────────────────────────────────────────────────
// Entry Point
// ─────────────────────────────────────────────────────────────

#[tokio::main]
async fn main() {
    let config = BotConfig::default();
    let bot = TelegramBot::new(config);
    println!("GhostClaw Telegram bot starting (local-safe mode)...");
    bot.run().await;
}
