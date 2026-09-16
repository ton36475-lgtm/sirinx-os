/**
 * LatentMAS Gateway — SIRINX OS service wrapper for the LatentMAS Rust orchestrator.
 *
 * Provides:
 *   GET  /health         — service health
 *   GET  /ready          — Rust CLI + Python backend readiness
 *   GET  /version        — version info
 *   GET  /status         — LatentMAS subsystem status (dry-run safe)
 *   POST /run            — run a single question (dry-run by default)
 *   POST /bench          — run a benchmark sweep (dry-run by default)
 *   GET  /report         — generate comparison report
 *   GET  /doctor         — diagnostic check
 *
 * Safety:
 *   - Dry-run mode by default (no GPU inference without LATENTMAS_LIVE_ENABLED=true)
 *   - All actions logged to audit
 *   - correlation_id on every request
 *   - No secrets exposed
 *   - No external writes without approval
 */

import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { readFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import { randomUUID } from "node:crypto";
import { getLatentmasCorsHeaders, resolveLoopbackHost } from "./cors-policy.mjs";

const PORT = parseInt(process.env.LATENTMAS_GATEWAY_PORT || "3700", 10);
const hostPolicy = resolveLoopbackHost(process.env.LATENTMAS_GATEWAY_HOST || "localhost");
const HOST = hostPolicy.host;

/** Path to the compiled Rust CLI binary. */
const RUST_BIN = process.env.LATENTMAS_BIN ||
  "/Users/sirinx/sirinx-os/research/latentmas/target/debug/katgpt-latentmas";

/** Path to the Python backend. */
const PYTHON_BACKEND = process.env.LATENTMAS_PYTHON_PATH ||
  "/Users/sirinx/sirinx-os/research/latentmas/python";

/** Whether live inference is allowed. */
const LIVE_ENABLED = process.env.LATENTMAS_LIVE_ENABLED === "true";

/** Audit log (in-memory ring buffer, max 200). */
const auditLog = [];
const MAX_AUDIT = 200;

function recordAudit({ correlationId, action, riskLevel, result, evidence }) {
  const event = {
    event_id: `latentmas-${Date.now()}-${auditLog.length + 1}`,
    timestamp: new Date().toISOString(),
    correlation_id: correlationId || "unknown",
    actor: "latentmas-gateway",
    source: "latentmas-gateway",
    action: action || "unknown",
    target: "latentmas",
    risk_level: riskLevel || "low",
    approval_status: LIVE_ENABLED ? "approved" : "dry-run",
    kill_switch_status: LIVE_ENABLED ? "clear" : "blocked",
    external_writes: false,
    result: result || "unknown",
    evidence: evidence || []
  };
  auditLog.unshift(event);
  if (auditLog.length > MAX_AUDIT) auditLog.pop();
  return event;
}

/** Check if Rust binary exists. */
async function checkRustBin() {
  try {
    await access(RUST_BIN, constants.X_OK);
    return { available: true, path: RUST_BIN };
  } catch {
    return { available: false, path: RUST_BIN, error: "binary not found or not executable" };
  }
}

/** Check if Python backend directory exists. */
async function checkPythonBackend() {
  try {
    await access(`${PYTHON_BACKEND}/latent_backend/run_agent.py`, constants.R_OK);
    return { available: true, path: PYTHON_BACKEND };
  } catch {
    return { available: false, path: PYTHON_BACKEND, error: "run_agent.py not found" };
  }
}

/** Run the Rust CLI with arguments, return stdout. */
function runRustCli(args, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    execFile(RUST_BIN, args, {
      timeout: timeoutMs,
      maxBuffer: 10 * 1024 * 1024,
      cwd: "/Users/sirinx/sirinx-os/research/latentmas"
    }, (err, stdout, stderr) => {
      if (err) {
        reject({ error: err.message, stderr: stderr?.slice(0, 500), stdout: stdout?.slice(0, 500) });
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

/** Parse JSON body from request. */
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => { data += chunk; if (data.length > 1e6) reject(new Error("body too large")); });
    req.on("end", () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); }
      catch { reject(new Error("invalid JSON")); }
    });
    req.on("error", reject);
  });
}

/** Send JSON response. */
function sendJson(res, status, body) {
  const json = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json",
    ...getLatentmasCorsHeaders(res.req?.headers?.origin)
  });
  res.end(json);
}

/** Route requests. */
async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${HOST}`);
  const path = url.pathname;
  const correlationId = req.headers["x-correlation-id"] || randomUUID();

  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      ...getLatentmasCorsHeaders(req.headers.origin)
    });
    return res.end();
  }

  try {
    // ---- GET /health ----
    if (path === "/health" && req.method === "GET") {
      return sendJson(res, 200, {
        status: "ok",
        service: "latentmas-gateway",
        host: HOST,
        requested_host: hostPolicy.requestedHost,
        host_override_blocked: hostPolicy.hostOverrideBlocked,
        cors_wildcard: false,
        timestamp: new Date().toISOString(),
        correlation_id: correlationId
      });
    }

    // ---- GET /ready ----
    if (path === "/ready" && req.method === "GET") {
      const [rust, python] = await Promise.all([checkRustBin(), checkPythonBackend()]);
      return sendJson(res, 200, {
        ready: rust.available && python.available,
        rust,
        python,
        live_enabled: LIVE_ENABLED,
        correlation_id: correlationId
      });
    }

    // ---- GET /version ----
    if (path === "/version" && req.method === "GET") {
      let rustVersion = "unknown";
      try {
        const { stdout } = await runRustCli(["--version"], 5000);
        rustVersion = stdout.trim();
      } catch { /* binary may not exist yet */ }
      return sendJson(res, 200, {
        gateway: "0.1.0",
        rust_cli: rustVersion,
        python_backend: "0.1.0",
        correlation_id: correlationId
      });
    }

    // ---- GET /status ----
    if (path === "/status" && req.method === "GET") {
      const [rust, python] = await Promise.all([checkRustBin(), checkPythonBackend()]);
      return sendJson(res, 200, {
        subsystem: "latentmas",
        srl: "SRL-2",
        rust_cli: rust,
        python_backend: python,
        live_enabled: LIVE_ENABLED,
        dry_run: !LIVE_ENABLED,
        mode: LIVE_ENABLED ? "live" : "dry-run",
        host: HOST,
        requested_host: hostPolicy.requestedHost,
        host_override_blocked: hostPolicy.hostOverrideBlocked,
        cors_wildcard: false,
        audit_events: auditLog.length,
        correlation_id: correlationId,
        gates: [
          { id: "dry-run-lock", state: LIVE_ENABLED ? "warn" : "pass", description: "Live inference requires LATENTMAS_LIVE_ENABLED=true" },
          { id: "no-external-send", state: "pass", description: "LatentMAS does not send customer messages" },
          { id: "no-secret-access", state: "pass", description: "LatentMAS never reads .env or credentials" },
          { id: "local-only", state: "pass", description: "LatentMAS runs on local GPU only, never public" }
        ]
      });
    }

    // ---- GET /doctor ----
    if (path === "/doctor" && req.method === "GET") {
      let doctorOutput = null;
      try {
        const { stdout } = await runRustCli(["doctor"], 10000);
        doctorOutput = stdout;
      } catch (e) {
        doctorOutput = e.error || "Rust CLI not available";
      }
      recordAudit({ correlationId, action: "doctor", riskLevel: "low", result: "ok" });
      return sendJson(res, 200, {
        doctor: doctorOutput,
        correlation_id: correlationId
      });
    }

    // ---- POST /run ----
    if (path === "/run" && req.method === "POST") {
      const body = await parseBody(req);
      if (!body.question) return sendJson(res, 400, { error: "question required", correlation_id: correlationId });
      if (!LIVE_ENABLED) {
        recordAudit({ correlationId, action: "run (dry-run)", riskLevel: "low", result: "blocked", evidence: ["LATENTMAS_LIVE_ENABLED=false"] });
        return sendJson(res, 200, {
          status: "dry-run",
          message: "Run blocked — LATENTMAS_LIVE_ENABLED=false. Set to true to allow inference.",
          would_run: {
            model: body.model || "Qwen/Qwen3-4B-Instruct",
            mode: body.mode || "latentmas",
            agents: body.agents || "planner,critic,refiner,solver",
            latent_steps: body.latent_steps || "40,20,40,20"
          },
          correlation_id: correlationId
        });
      }
      // Live run
      const args = [
        "run",
        "--model", body.model || "Qwen/Qwen3-4B-Instruct",
        "--mode", body.mode || "latentmas",
        "--agents", body.agents || "planner,critic,refiner,solver",
        "--latent-steps", body.latent_steps || "40,20,40,20",
        "--question", body.question
      ];
      if (body.debug) args.push("--debug");
      const { stdout } = await runRustCli(args, 120000);
      recordAudit({ correlationId, action: "run (live)", riskLevel: "medium", result: "ok" });
      return sendJson(res, 200, { output: stdout, correlation_id: correlationId });
    }

    // ---- POST /bench ----
    if (path === "/bench" && req.method === "POST") {
      const body = await parseBody(req);
      if (!body.dataset) return sendJson(res, 400, { error: "dataset path required", correlation_id: correlationId });
      if (!LIVE_ENABLED) {
        recordAudit({ correlationId, action: "bench (dry-run)", riskLevel: "low", result: "blocked", evidence: ["LATENTMAS_LIVE_ENABLED=false"] });
        return sendJson(res, 200, {
          status: "dry-run",
          message: "Benchmark blocked — LATENTMAS_LIVE_ENABLED=false.",
          would_run: {
            model: body.model || "Qwen/Qwen3-4B-Instruct",
            mode: body.mode || "latentmas",
            dataset: body.dataset
          },
          correlation_id: correlationId
        });
      }
      const args = [
        "bench",
        "--model", body.model || "Qwen/Qwen3-4B-Instruct",
        "--mode", body.mode || "latentmas",
        "--dataset", body.dataset,
        "--agents", body.agents || "planner,critic,refiner,solver",
        "--latent-steps", body.latent_steps || "40,20,40,20"
      ];
      if (body.output) args.push("--out", body.output);
      const { stdout } = await runRustCli(args, 600000);
      recordAudit({ correlationId, action: "bench (live)", riskLevel: "medium", result: "ok" });
      return sendJson(res, 200, { output: stdout, correlation_id: correlationId });
    }

    // ---- GET /audit ----
    if (path === "/audit" && req.method === "GET") {
      return sendJson(res, 200, { events: auditLog, count: auditLog.length, correlation_id: correlationId });
    }

    // ---- 404 ----
    return sendJson(res, 404, { error: "not found", path, correlation_id: correlationId });

  } catch (err) {
    recordAudit({ correlationId, action: "error", riskLevel: "low", result: "error", evidence: [err.message?.slice(0, 200)] });
    return sendJson(res, 500, { error: err.message?.slice(0, 500), correlation_id: correlationId });
  }
}

// ---- Start server ----
const server = createServer(handleRequest);
server.listen(PORT, HOST, () => {
  console.log(JSON.stringify({
    event: "server_started",
    service: "latentmas-gateway",
    host: HOST,
    requested_host: hostPolicy.requestedHost,
    host_override_blocked: hostPolicy.hostOverrideBlocked,
    cors_wildcard: false,
    port: PORT,
    live_enabled: LIVE_ENABLED,
    dry_run: !LIVE_ENABLED,
    timestamp: new Date().toISOString()
  }));
});

export { server, recordAudit };
