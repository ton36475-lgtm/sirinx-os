//! `mp*` Telegram commands for the maxplus lane (P098 Rev D, M4).
//!
//! Prefixed `mp` so nothing collides with the existing surface (`/task`, `/status`).
//!
//! The lane is LEAF and capped at 🟡. A 🔴 task arriving here is never executed
//! and never advanced — it is answered with "requires human gate" and left Pending,
//! because the only events that move a Red task are the structural HIGH gate
//! channels in GHOSTCLAW v1.0 [1].

use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use ghostclaw_providers::breaker::{BreakerStatus, CircuitBreaker};
use ghostclaw_providers::maxplus::{redaction_gate, Schema, MAXPLUS_BASE_URL};
use serde::Deserialize;

/// Models listed per page by `/mpmodels`.
pub const PAGE_SIZE: usize = 10;

// ─── Registry ────────────────────────────────────────────────────────────────

#[derive(Clone, Debug, Deserialize)]
pub struct ModelRecord {
    pub id: String,
    pub status: String,
    #[serde(default)]
    pub schema: Vec<String>,
    pub http_code: u16,
    pub latency_ms: u64,
    #[serde(default)]
    pub needs_big_budget: bool,
}

impl ModelRecord {
    /// Status emoji shown next to the id in `/mpmodels`.
    pub fn emoji(&self) -> &'static str {
        match self.status.as_str() {
            "OK" => "🟢",
            "EMPTY" => "🟡",
            "ERR" => "🔴",
            "ABSENT" => "⚫️",
            _ => "❔",
        }
    }

    pub fn is_usable(&self) -> bool {
        self.status == "OK"
    }
}

#[derive(Clone, Debug, Deserialize)]
pub struct Registry {
    pub pool: String,
    pub verified_at: String,
    pub models: Vec<ModelRecord>,
}

impl Registry {
    pub fn load(path: &str) -> anyhow::Result<Self> {
        let raw = std::fs::read_to_string(path)?;
        Ok(serde_json::from_str(&raw)?)
    }

    pub fn get(&self, id: &str) -> Option<&ModelRecord> {
        self.models.iter().find(|m| m.id == id)
    }

    pub fn usable(&self) -> impl Iterator<Item = &ModelRecord> {
        self.models.iter().filter(|m| m.is_usable())
    }

    pub fn page_count(&self) -> usize {
        self.models.len().div_ceil(PAGE_SIZE).max(1)
    }
}

// ─── Commands ────────────────────────────────────────────────────────────────

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum MpCommand {
    /// `/mpmodels [page]`
    Models { page: usize },
    /// `/mpuse <model_id>`
    Use { model: String },
    /// `/mpping [model_id]`
    Ping { model: Option<String> },
    /// `/mppool [name]`
    Pool { name: Option<String> },
    /// `/mphealth`
    Health,
}

impl MpCommand {
    /// Parses a raw message. Returns `None` for anything that is not an `mp` command,
    /// so the existing command surface is untouched.
    pub fn parse(text: &str) -> Option<Self> {
        let mut parts = text.split_whitespace();
        let head = parts.next()?;
        let arg = parts.next().map(str::to_string);

        match head {
            "/mpmodels" => Some(MpCommand::Models {
                page: arg.and_then(|a| a.parse().ok()).unwrap_or(1).max(1),
            }),
            "/mpuse" => arg.map(|model| MpCommand::Use { model }),
            "/mpping" => Some(MpCommand::Ping { model: arg }),
            "/mppool" => Some(MpCommand::Pool { name: arg }),
            "/mphealth" => Some(MpCommand::Health),
            _ => None,
        }
    }
}

// ─── State ───────────────────────────────────────────────────────────────────

/// Per-chat lane state. Active model and pinned pool are per chat id.
pub struct LaneState {
    pub registry: Registry,
    pub breaker: Arc<CircuitBreaker>,
    active_model: Mutex<HashMap<i64, String>>,
    pinned_pool: Mutex<HashMap<i64, String>>,
}

impl LaneState {
    pub fn new(registry: Registry, breaker: Arc<CircuitBreaker>) -> Self {
        Self {
            registry,
            breaker,
            active_model: Mutex::new(HashMap::new()),
            pinned_pool: Mutex::new(HashMap::new()),
        }
    }

    pub fn active_model(&self, chat: i64) -> Option<String> {
        self.active_model.lock().ok()?.get(&chat).cloned()
    }

    pub fn set_active_model(&self, chat: i64, model: String) {
        if let Ok(mut m) = self.active_model.lock() {
            m.insert(chat, model);
        }
    }

    pub fn pool(&self, chat: i64) -> String {
        self.pinned_pool
            .lock()
            .ok()
            .and_then(|p| p.get(&chat).cloned())
            .unwrap_or_else(|| self.registry.pool.clone())
    }

    pub fn set_pool(&self, chat: i64, pool: String) {
        if let Ok(mut p) = self.pinned_pool.lock() {
            p.insert(chat, pool);
        }
    }
}

// ─── Dispatch ────────────────────────────────────────────────────────────────

/// Handles one `mp` command and returns the reply text.
pub async fn dispatch(cmd: MpCommand, chat: i64, state: &LaneState) -> String {
    match cmd {
        MpCommand::Models { page } => render_models(&state.registry, page),
        MpCommand::Use { model } => match state.registry.get(&model) {
            None => format!("❌ '{model}' is not in the registry. /mpmodels to list."),
            Some(rec) if !rec.is_usable() => format!(
                "❌ '{}' is {} ({}) — /mpuse accepts status=OK only.",
                rec.id,
                rec.emoji(),
                rec.status
            ),
            Some(rec) => {
                state.set_active_model(chat, rec.id.clone());
                format!(
                    "✅ active model for this chat: {} {}\nschema: {}\nbig budget: {}",
                    rec.emoji(),
                    rec.id,
                    rec.schema.join(", "),
                    if rec.needs_big_budget { "yes (4096)" } else { "no" }
                )
            }
        },
        MpCommand::Ping { model } => {
            let id = model
                .or_else(|| state.active_model(chat))
                .or_else(|| state.registry.usable().next().map(|m| m.id.clone()));
            match id {
                None => "❌ no usable model in the registry.".to_string(),
                Some(id) => ping(&id, state).await,
            }
        }
        MpCommand::Pool { name } => match name {
            None => format!(
                "pool (this chat): {}\nregistry pool: {}\nnote: the gateway exposes no pool metadata — this is a local label.",
                state.pool(chat),
                state.registry.pool
            ),
            Some(p) => {
                state.set_pool(chat, p.clone());
                format!("📌 pinned pool for this chat: {p}")
            }
        },
        MpCommand::Health => render_health(chat, state),
    }
}

fn render_models(reg: &Registry, page: usize) -> String {
    let pages = reg.page_count();
    let page = page.min(pages);
    let start = (page - 1) * PAGE_SIZE;
    let slice: Vec<&ModelRecord> = reg.models.iter().skip(start).take(PAGE_SIZE).collect();

    let mut out = format!("maxplus models — page {page}/{pages}\n");
    for m in slice {
        out.push_str(&format!(
            "{} {}  ({}ms, http {}){}\n",
            m.emoji(),
            m.id,
            m.latency_ms,
            m.http_code,
            if m.needs_big_budget { " ⚠︎big-budget" } else { "" }
        ));
    }
    out.push_str(&format!(
        "\n🟢 OK  🟡 EMPTY  🔴 ERR  ⚫️ ABSENT\nverified_at: {}",
        reg.verified_at
    ));
    out
}

fn render_health(chat: i64, state: &LaneState) -> String {
    let pool = state.pool(chat);
    let status = match state.breaker.status(&pool) {
        BreakerStatus::Closed { consecutive_failures } => {
            format!("🟢 CLOSED (consecutive failures: {consecutive_failures})")
        }
        BreakerStatus::Down { remaining } => {
            format!("🔴 DOWN for another {}s", remaining.as_secs())
        }
    };
    let ok = state.registry.usable().count();
    format!(
        "maxplus lane health\npool: {pool}\nbreaker: {status}\nmodels OK: {ok}/{}\nlast verify: {}",
        state.registry.models.len(),
        state.registry.verified_at
    )
}

/// Live smoke test — returns HTTP code, latency, and the first 80 characters.
async fn ping(model: &str, state: &LaneState) -> String {
    let prompt = "Say OK";
    if let Err(hit) = redaction_gate(prompt) {
        return format!("🛑 DENIED by egress redaction gate (matched {})", hit.marker);
    }

    let key = match ghostclaw_providers::maxplus::env_nonempty("MAXPLUS_API_KEY") {
        Some(k) => k,
        None => return "❌ MAXPLUS_API_KEY not set.".to_string(),
    };

    let http = match reqwest::Client::builder()
        .connect_timeout(Duration::from_secs(10))
        .timeout(Duration::from_secs(120))
        .build()
    {
        Ok(c) => c,
        Err(e) => return format!("❌ client build failed: {e}"),
    };

    let started = Instant::now();
    let resp = http
        .post(format!("{}{}", MAXPLUS_BASE_URL, Schema::AnthropicMessages.path()))
        .bearer_auth(key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&serde_json::json!({
            "model": model,
            "max_tokens": 64,
            "messages": [{"role": "user", "content": prompt}]
        }))
        .send()
        .await;

    let elapsed = started.elapsed().as_millis();
    let pool = state.registry.pool.clone();

    match resp {
        Err(e) => {
            state.breaker.record_failure(&pool);
            format!("/mpping {model}\nhttp=— latency={elapsed}ms\ntransport error: {e}")
        }
        Ok(r) => {
            let code = r.status().as_u16();
            let body = r.text().await.unwrap_or_default();
            if (200..300).contains(&code) {
                state.breaker.record_success(&pool);
            } else {
                state.breaker.record_failure(&pool);
            }
            let snippet: String = body.chars().take(80).collect();
            format!("/mpping {model}\nhttp={code} latency={elapsed}ms\n{snippet}")
        }
    }
}

/// Reply for a 🔴 task that arrives on this lane. It is never executed here.
pub fn red_task_reply(task_id: &str) -> String {
    format!(
        "🔴 task {task_id} requires human gate — status stays Pending.\n\
         The maxplus lane is LEAF and capped at 🟡 (P098 Rev D). Red tasks advance only \
         via Hermes /api/tasks/:id/approve behind Cloudflare Access, or a Telegram \
         callback from a whitelisted id."
    )
}

// ─── Whitelist ───────────────────────────────────────────────────────────────

/// Whether `id` may use the bot. Accepts the existing `TELEGRAM_ALLOWED_USERS`
/// (comma-separated) and falls back to a single chat id.
pub fn is_whitelisted(id: i64, allowed_users: &str, home_chat: &str) -> bool {
    if allowed_users
        .split(',')
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .any(|s| s == id.to_string())
    {
        return true;
    }
    !home_chat.trim().is_empty() && home_chat.trim() == id.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn registry() -> Registry {
        Registry {
            pool: "VERIFY AT RUN TIME".into(),
            verified_at: "2026-07-24T23:32:53Z".into(),
            models: vec![
                ModelRecord {
                    id: "glm-5.2".into(),
                    status: "OK".into(),
                    schema: vec!["anthropic_messages".into()],
                    http_code: 200,
                    latency_ms: 3610,
                    needs_big_budget: false,
                },
                ModelRecord {
                    id: "kimi-k2.6".into(),
                    status: "ERR".into(),
                    schema: vec![],
                    http_code: 400,
                    latency_ms: 1767,
                    needs_big_budget: false,
                },
            ],
        }
    }

    fn state() -> LaneState {
        LaneState::new(registry(), Arc::new(CircuitBreaker::new()))
    }

    #[test]
    fn mp_prefix_does_not_collide_with_the_existing_surface() {
        for existing in ["/task fix the thing", "/status", "/help", "/approve abc"] {
            assert_eq!(MpCommand::parse(existing), None, "{existing} must not parse as mp");
        }
    }

    #[test]
    fn parses_every_mp_command() {
        assert_eq!(MpCommand::parse("/mpmodels"), Some(MpCommand::Models { page: 1 }));
        assert_eq!(MpCommand::parse("/mpmodels 2"), Some(MpCommand::Models { page: 2 }));
        assert_eq!(
            MpCommand::parse("/mpuse glm-5.2"),
            Some(MpCommand::Use { model: "glm-5.2".into() })
        );
        assert_eq!(MpCommand::parse("/mpping"), Some(MpCommand::Ping { model: None }));
        assert_eq!(MpCommand::parse("/mppool"), Some(MpCommand::Pool { name: None }));
        assert_eq!(MpCommand::parse("/mphealth"), Some(MpCommand::Health));
    }

    #[test]
    fn mpuse_rejects_a_model_that_is_not_ok() {
        let s = state();
        let reply =
            tokio_test_block(dispatch(MpCommand::Use { model: "kimi-k2.6".into() }, 1, &s));
        assert!(reply.contains("status=OK only"), "got: {reply}");
        assert_eq!(s.active_model(1), None, "a non-OK model must not become active");
    }

    #[test]
    fn mpuse_accepts_an_ok_model_per_chat() {
        let s = state();
        tokio_test_block(dispatch(MpCommand::Use { model: "glm-5.2".into() }, 42, &s));
        assert_eq!(s.active_model(42), Some("glm-5.2".into()));
        assert_eq!(s.active_model(99), None, "active model must be per chat");
    }

    #[test]
    fn mpmodels_paginates_and_shows_status_emoji() {
        let out = render_models(&registry(), 1);
        assert!(out.contains("page 1/1"));
        assert!(out.contains("🟢 glm-5.2"));
        assert!(out.contains("🔴 kimi-k2.6"));
    }

    #[test]
    fn mphealth_reports_breaker_state() {
        let s = state();
        assert!(render_health(1, &s).contains("🟢 CLOSED"));
        for _ in 0..3 {
            s.breaker.record_failure("VERIFY AT RUN TIME");
        }
        assert!(render_health(1, &s).contains("🔴 DOWN"));
    }

    #[test]
    fn mppool_pins_per_chat() {
        let s = state();
        tokio_test_block(dispatch(MpCommand::Pool { name: Some("alt".into()) }, 7, &s));
        assert_eq!(s.pool(7), "alt");
        assert_eq!(s.pool(8), "VERIFY AT RUN TIME", "pin must be per chat");
    }

    #[test]
    fn red_tasks_are_answered_but_never_advanced() {
        let reply = red_task_reply("T-123");
        assert!(reply.contains("requires human gate"));
        assert!(reply.contains("Pending"));
    }

    #[test]
    fn whitelist_accepts_allowed_users_and_home_chat() {
        assert!(is_whitelisted(111, "111,222", ""));
        assert!(is_whitelisted(222, "111,222", ""));
        assert!(is_whitelisted(333, "", "333"));
        assert!(!is_whitelisted(444, "111,222", "333"));
        assert!(!is_whitelisted(444, "", ""), "empty config must not allow everyone");
    }

    /// Minimal blocking helper so these stay plain `#[test]`s.
    fn tokio_test_block<F: std::future::Future>(f: F) -> F::Output {
        tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .unwrap()
            .block_on(f)
    }
}
