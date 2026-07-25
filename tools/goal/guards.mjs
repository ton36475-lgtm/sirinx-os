// Guards shared by the /goal orchestrator: egress redaction, quota detection,
// and the hash-chained receipt log.
//
// These mirror `ghostclaw-providers` (Rust) deliberately — the orchestrator drives
// third-party CLIs, so the same rules have to hold on this side of the boundary too.
// Where the two could drift, the Rust crate is the reference.

import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";

// ─── Egress redaction (mirrors maxplus::redaction_gate) ──────────────────────

export const SECRET_MARKERS = [
  "-----BEGIN",
  "cert.pem",
  ".pem",
  ".env",
  "ccsk-",
  "glm-share-",
  "sk-ant-",
  "ghp_",
  "gho_",
  "xoxb-",
  "AKIA",
  "CHANNEL_ACCESS_TOKEN",
  "CHANNEL_SECRET",
  "LINE_CHANNEL",
  "MAXPLUS_API_KEY",
  "COINTH_API_KEY",
  "OPENROUTER_API_KEY",
  "GLM_API_KEY",
  "GLM_SHARED_KEY",
  "TELEGRAM_BOT_TOKEN",
];

/**
 * Returns the marker that tripped, or null when the payload is clean.
 * A hit means drop the request — no retry. The payload itself is the problem.
 */
export function redactionHit(payload) {
  return SECRET_MARKERS.find((m) => payload.includes(m)) ?? null;
}

// ─── Quota exhaustion (mirrors cointh::signals_exhaustion) ───────────────────

/**
 * Every wording below was captured from a real response on this host, not from
 * a vendor doc:
 *   - "CreditsError" / "Insufficient balance"  — 2026-06-30, arrived as HTTP 401
 *   - "usage limit has been reached"           — 2026-07-25, cline CLI, plain prose
 * The rest come from provider error codes seen in local logs.
 */
export const EXHAUSTION_MARKERS = [
  "creditserror",
  "insufficient balance",
  "insufficient_quota",
  "quota_exceeded",
  "rate_limit_exceeded",
  "rate_limit_error",
  "rate_limit_failure",
  "resource_exhausted",
  "credit_exhausted",
  "billing_hard_limit_reached",
  "usage limit has been reached",
  "not bound to the required pool",
];

/**
 * Whether output names a quota or credit condition.
 *
 * Status codes are not consulted here: the CLIs do not surface them. The real
 * out-of-credit response on this host arrived as HTTP 401, so a status-only rule
 * would have missed it anyway — and a bare 401 is an ordinary bad credential.
 * Prose is what these tools give us, so prose is what we match.
 */
export function signalsExhaustion(text) {
  const t = String(text).toLowerCase();
  return EXHAUSTION_MARKERS.some((m) => t.includes(m));
}

// ─── Hash-chained receipts (mirrors receipt::ReceiptLog) ─────────────────────

const GENESIS = "0".repeat(64);

function preimage(r) {
  return [r.seq, r.ts, r.lane, r.stage, r.model, r.tokens, r.latency_ms, r.outcome, r.prev_hash].join("|");
}

export class ReceiptLog {
  constructor(path) {
    this.path = path;
  }

  readAll() {
    if (!existsSync(this.path)) return [];
    return readFileSync(this.path, "utf8")
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  }

  append(draft) {
    const all = this.readAll();
    const tail = all[all.length - 1];
    const receipt = {
      seq: tail ? tail.seq + 1 : 0,
      ts: new Date().toISOString(),
      lane: draft.lane,
      stage: draft.stage,
      model: draft.model ?? "",
      tokens: draft.tokens ?? 0,
      latency_ms: draft.latency_ms ?? 0,
      outcome: draft.outcome,
      prev_hash: tail ? tail.hash : GENESIS,
      hash: "",
    };
    receipt.hash = createHash("sha256").update(preimage(receipt)).digest("hex");

    mkdirSync(dirname(this.path), { recursive: true });
    appendFileSync(this.path, JSON.stringify(receipt) + "\n");
    return receipt;
  }

  /** Returns { ok: true, count } or { ok: false, at, why }. */
  verify() {
    const all = this.readAll();
    let expected = GENESIS;
    for (let i = 0; i < all.length; i++) {
      const r = all[i];
      if (r.seq !== i) return { ok: false, at: i, why: "sequence" };
      if (r.prev_hash !== expected) return { ok: false, at: i, why: "linkage" };
      const want = createHash("sha256").update(preimage(r)).digest("hex");
      if (r.hash !== want) return { ok: false, at: i, why: "tampered" };
      expected = r.hash;
    }
    return { ok: true, count: all.length };
  }
}
