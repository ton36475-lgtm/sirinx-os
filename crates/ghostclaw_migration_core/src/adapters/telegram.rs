//! Telegram command adapter boundary.
//!
//! This module converts Telegram-shaped metadata into a [`CommandEnvelope`].
//! It never sends Telegram messages, starts polling, stores tokens, or reads
//! credential files.

use crate::redaction::redact_sensitive;
use crate::schema::{escape_json, option_json, CommandEnvelope};

/// Minimal non-secret Telegram command input.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TelegramCommand {
    /// Chat label or redacted chat id.
    pub chat_ref: String,
    /// Sender label or redacted sender id.
    pub sender_ref: String,
    /// Raw command text received by the adapter.
    pub text: String,
}

/// Preview for a Telegram reply that has not been sent.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TelegramReplyPreview {
    /// Adapter name.
    pub adapter: String,
    /// Chat label or redacted chat id.
    pub chat_ref: String,
    /// Redacted reply text.
    pub text: String,
    /// Whether a live message was sent.
    pub live_send: bool,
    /// Preview status.
    pub status: String,
    /// Optional reason or note.
    pub reason: Option<String>,
}

impl TelegramCommand {
    /// Converts the Telegram command into a core command envelope.
    pub fn into_envelope(self) -> CommandEnvelope {
        CommandEnvelope {
            raw: self.text,
            requester: format!("telegram:{}", self.sender_ref),
            source: format!("telegram:{}", self.chat_ref),
            cwd: None,
        }
    }

    /// Serializes non-secret adapter input for fixture parity tests.
    pub fn to_json(&self) -> String {
        format!(
            "{{\"chat_ref\":\"{}\",\"sender_ref\":\"{}\",\"text\":\"{}\",\"live_send\":false}}",
            escape_json(&self.chat_ref),
            escape_json(&self.sender_ref),
            escape_json(&self.text)
        )
    }
}

impl TelegramReplyPreview {
    /// Serializes a Telegram reply preview to compact JSON.
    pub fn to_json(&self) -> String {
        format!(
            "{{\"adapter\":\"{}\",\"chat_ref\":\"{}\",\"text\":\"{}\",\"live_send\":{},\"status\":\"{}\",\"reason\":{}}}",
            escape_json(&self.adapter),
            escape_json(&self.chat_ref),
            escape_json(&self.text),
            self.live_send,
            escape_json(&self.status),
            option_json(self.reason.as_deref())
        )
    }
}

/// Builds a Telegram reply preview without sending a live message.
pub fn preview_telegram_reply(chat_ref: &str, text: &str) -> TelegramReplyPreview {
    TelegramReplyPreview {
        adapter: "telegram_reply_preview".to_string(),
        chat_ref: chat_ref.to_string(),
        text: redact_sensitive(text),
        live_send: false,
        status: "reply_preview_only".to_string(),
        reason: Some("live_telegram_send_blocked_until_exact_gate".to_string()),
    }
}
