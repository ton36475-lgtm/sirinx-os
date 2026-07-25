//! GHOSTCLAW Telegram Bot — command center with inline-keyboard approvals.
//! Posts to Hermes /api/tasks/:id/approve|reject on callback.
//!
//! The `mp*` commands for the maxplus lane live in [`maxplus_commands`] and are
//! dispatched before the existing surface, so `/task` and `/status` are untouched.

use std::sync::Arc;

use ghostclaw_providers::breaker::CircuitBreaker;
use ghostclaw_telegram::maxplus_commands::{self, is_whitelisted, LaneState, MpCommand, Registry};
use serde::Deserialize;
use serde_json::json;
use std::env;
use tracing::{info, warn};

#[derive(Deserialize)]
struct TaskResponse {
    id: String,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt::init();

    let bot_token = env::var("TELEGRAM_BOT_TOKEN")
        .expect("TELEGRAM_BOT_TOKEN required");
    // The deployed config uses TELEGRAM_HOME_CHANNEL / TELEGRAM_ALLOWED_USERS.
    // TELEGRAM_ADMIN_CHAT_ID is accepted as an alias so either naming works.
    let chat_id = env::var("TELEGRAM_ADMIN_CHAT_ID")
        .or_else(|_| env::var("TELEGRAM_HOME_CHANNEL"))
        .expect("TELEGRAM_ADMIN_CHAT_ID or TELEGRAM_HOME_CHANNEL required");
    let allowed_users = env::var("TELEGRAM_ALLOWED_USERS").unwrap_or_default();
    let hermes_url = env::var("HERMES_URL")
        .unwrap_or_else(|_| "http://127.0.0.1:8787".into());

    let registry_path = env::var("GHOSTCLAW_MODELS_MAXPLUS")
        .unwrap_or_else(|_| "config/models.maxplus.json".into());
    let lane = match Registry::load(&registry_path) {
        Ok(reg) => {
            info!(models = reg.models.len(), path = %registry_path, "maxplus registry loaded");
            Some(Arc::new(LaneState::new(reg, Arc::new(CircuitBreaker::new()))))
        }
        Err(e) => {
            warn!(error = %e, path = %registry_path, "maxplus registry unavailable — mp* commands disabled");
            None
        }
    };

    info!("GHOSTCLAW Telegram Bot starting");
    info!("Hermes URL: {}", hermes_url);

    // Simple long-polling loop
    let client = reqwest::Client::new();
    let mut offset: i64 = 0;

    loop {
        let updates: serde_json::Value = match client
            .get(format!(
                "https://api.telegram.org/bot{bot_token}/getUpdates?offset={offset}&timeout=30"
            ))
            .send()
            .await
        {
            Ok(resp) => resp.json().await.unwrap_or(json!({"ok": false})),
            Err(e) => {
                tracing::error!("getUpdates error: {e}");
                tokio::time::sleep(std::time::Duration::from_secs(5)).await;
                continue;
            }
        };

        if updates["ok"] != true {
            tokio::time::sleep(std::time::Duration::from_secs(2)).await;
            continue;
        }

        let updates_arr = updates["result"].as_array().cloned().unwrap_or_default();
        for update in updates_arr {
            offset = update["update_id"].as_i64().unwrap_or(offset) + 1;

            // Handle callback query (approve/reject buttons)
            if let Some(cb) = update.get("callback_query") {
                let cb_id = cb["id"].as_str().unwrap_or("");
                let data = cb["data"].as_str().unwrap_or("");
                let from_id = cb["from"]["id"].as_i64().unwrap_or(0);

                // Answer callback to dismiss spinner
                let _ = client
                    .post(format!("https://api.telegram.org/bot{bot_token}/answerCallbackQuery"))
                    .json(&json!({"callback_query_id": cb_id}))
                    .send()
                    .await;

                if let Some((action, task_id)) = data.split_once(':') {
                    let who = format!("telegram:{from_id}");
                    let endpoint = match action {
                        "approve" => "approve",
                        "reject" => "reject",
                        _ => continue,
                    };

                    let resp = client
                        .post(format!("{hermes_url}/api/tasks/{task_id}/{endpoint}"))
                        .json(&json!({"who": who}))
                        .send()
                        .await;

                    let msg = match resp {
                        Ok(r) => {
                            let body: serde_json::Value = r.json().await.unwrap_or(json!({}));
                            format!("✅ {action} recorded for {task_id}\n{}", serde_json::to_string_pretty(&body).unwrap_or_default())
                        }
                        Err(e) => format!("❌ Error: {e}"),
                    };

                    let _ = client
                        .post(format!("https://api.telegram.org/bot{bot_token}/sendMessage"))
                        .json(&json!({"chat_id": chat_id, "text": msg}))
                        .send()
                        .await;
                }
                continue;
            }

            // Handle text message
            if let Some(msg) = update.get("message") {
                let text = msg["text"].as_str().unwrap_or("");
                let msg_chat_id = msg["chat"]["id"].as_i64().unwrap_or(0);

                if !is_whitelisted(msg_chat_id, &allowed_users, &chat_id) {
                    warn!(chat = msg_chat_id, "ignoring message from non-whitelisted chat");
                    continue;
                }

                // maxplus lane commands run first; they never shadow /task or /status.
                if let Some(cmd) = MpCommand::parse(text) {
                    let reply = match &lane {
                        Some(state) => maxplus_commands::dispatch(cmd, msg_chat_id, state).await,
                        None => format!(
                            "maxplus registry not loaded ({registry_path}). Run the M2 probe first."
                        ),
                    };
                    let _ = client
                        .post(format!("https://api.telegram.org/bot{bot_token}/sendMessage"))
                        .json(&json!({"chat_id": chat_id, "text": reply}))
                        .send()
                        .await;
                    continue;
                }

                if text.starts_with("/task ") {
                    let desc = &text[6..];

                    // Submit to Hermes
                    let resp = client
                        .post(format!("{hermes_url}/api/tasks"))
                        .json(&json!({"description": desc, "risk": "green"}))
                        .send()
                        .await;

                    match resp {
                        Ok(r) => {
                            let body: serde_json::Value = r.json().await.unwrap_or(json!({}));
                            let task_id = body["id"].as_str().unwrap_or("unknown");

                            let keyboard = json!({
                                "inline_keyboard": [[
                                    {"text": "✅ Approve", "callback_data": format!("approve:{task_id}")},
                                    {"text": "❌ Reject", "callback_data": format!("reject:{task_id}")}
                                ]]
                            });

                            let _ = client
                                .post(format!("https://api.telegram.org/bot{bot_token}/sendMessage"))
                                .json(&json!({
                                    "chat_id": chat_id,
                                    "text": format!("📋 Task: {desc}\nID: {task_id}\n\nApprove?"),
                                    "reply_markup": keyboard
                                }))
                                .send()
                                .await;
                        }
                        Err(e) => {
                            let _ = client
                                .post(format!("https://api.telegram.org/bot{bot_token}/sendMessage"))
                                .json(&json!({"chat_id": chat_id, "text": format!("Error: {e}")}))
                                .send()
                                .await;
                        }
                    }
                } else if text == "/status" {
                    let resp = client
                        .get(format!("{hermes_url}/health"))
                        .send()
                        .await;

                    let status = match resp {
                        Ok(r) => r.text().await.unwrap_or_default(),
                        Err(_) => "Hermes unreachable".into(),
                    };

                    let _ = client
                        .post(format!("https://api.telegram.org/bot{bot_token}/sendMessage"))
                        .json(&json!({"chat_id": chat_id, "text": format!("Hermes: {status}")}))
                        .send()
                        .await;
                }
            }
        }
    }
}
