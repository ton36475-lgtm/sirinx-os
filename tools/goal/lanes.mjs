// Lane registry for the /goal orchestrator.
//
// Every entry below was verified by running the CLI on this host on 2026-07-25.
// Nothing here is copied from a README — if a lane is listed as usable, it answered.

import { spawn } from "node:child_process";

/** Strip ANSI escapes, spinner frames, and cursor control. kiro-cli emits a lot of it. */
export function stripAnsi(s) {
  return s
    .replace(/\[[0-9;?]*[A-Za-z]/g, "")
    .replace(/[()][A-B0-2]/g, "")
    .replace(/[⠀-⣿]/g, "") // braille spinner frames
    .replace(/\r/g, "");
}

/**
 * Verified lanes.
 *
 * `status`:
 *   "ok"        answered a live prompt on 2026-07-25
 *   "quota"     CLI works, but the default credential is out of quota
 *   "gui-only"  cannot be driven headlessly at all
 */
export const LANES = {
  opencode: {
    status: "ok",
    bin: "opencode",
    // Verified: `opencode run -m glm/glm-5.2 "..."` → "opencode-glm ok"
    build: ({ prompt, model = "glm/glm-5.2", cwd }) => ({
      args: ["run", "-m", model, prompt],
      cwd,
    }),
    // opencode reads provider credentials from ~/.config/opencode/opencode.json,
    // where they are `{env:NAME}` placeholders. We supply the env, never edit the file.
    env: (secrets) => ({
      MAXPLUS_API_KEY: secrets.MAXPLUS_API_KEY ?? "",
      GLM_SHARED_KEY: secrets.COINTH_API_KEY ?? "",
    }),
    note:
      "Default model in config is maxplus-deepseek/kimi-k3, whose pool the current " +
      "key is not bound to (403). Pass -m explicitly with a reachable provider.",
  },

  kiro: {
    status: "ok",
    bin: "kiro-cli",
    // Verified: `kiro-cli chat "..."` → "kiro ok", 0.03 credits, 2s.
    // --trust-all-tools is deliberately NOT set: it grants unattended tool execution.
    build: ({ prompt, model, agent, cwd }) => ({
      args: [
        "chat",
        prompt,
        ...(model ? ["--model", model] : []),
        ...(agent ? ["--agent", agent] : []),
      ],
      cwd,
    }),
    env: () => ({}),
    note: "Default model qwen3-coder-next (~/.kiro/settings/cli.json). Output is ANSI-heavy.",
  },

  cline: {
    status: "quota",
    bin: "cline",
    // CLI runs, but the built-in `cline` provider answered:
    //   "The usage limit has been reached"
    // Route it elsewhere with -P/-k, or it will keep failing.
    build: ({ prompt, provider, key, model, cwd, timeoutSec = 0 }) => ({
      args: [
        ...(provider ? ["-P", provider] : []),
        ...(key ? ["-k", key] : []),
        ...(model ? ["-m", model] : []),
        "-t", String(timeoutSec),
        "--auto-approve", "false",
        prompt,
      ],
      cwd,
    }),
    env: () => ({}),
    note:
      "Built-in provider is out of quota as of 2026-07-25. --auto-approve is forced " +
      "false: unattended tool approval is not something an orchestrator should grant.",
  },

  zcode: {
    status: "needs-login",
    bin: "zcode-cli",
    // zcode-cli 0.15.2 — headless-capable. Installed via ~/.local/bin/zcode-cli,
    // which wraps the CLI shipped inside the app bundle at
    // Contents/Resources/glm/zcode.cjs.
    //
    // The `zcode` command is a DIFFERENT binary — Contents/MacOS/ZCode, the
    // Electron GUI — and fails with "Unable to find helper app" when run directly.
    // Do not confuse the two.
    //
    // --mode defaults to `yolo` for --prompt, i.e. unattended full tool access.
    // This lane pins `plan` instead; a caller wanting more must ask for it.
    build: ({ prompt, model, cwd, mode = "plan", maxTurns = 3 }) => ({
      args: [
        "-p", prompt,
        "--mode", mode,
        "--no-color",
        "--max-turns", String(maxTurns),
        ...(model ? ["--model", model] : []),
        ...(cwd ? ["--cwd", cwd] : []),
      ],
      cwd,
    }),
    env: () => ({}),
    note:
      "Blocked on setup, not capability: `Model config is missing. Create " +
      "~/.zcode/cli/config.json with an explicit model provider`. The supported fix is " +
      "`zcode-cli login` (Z.AI OAuth), which is interactive and belongs to Tony. " +
      "Its GLM capability is already available headlessly through the cointh provider.",
  },
};

/** Lanes that can actually carry work right now. */
export function usableLanes() {
  return Object.entries(LANES)
    .filter(([, l]) => l.status === "ok")
    .map(([name]) => name);
}

/**
 * Run one lane. Resolves with { ok, code, stdout, stderr, ms }.
 * Never throws on a non-zero exit — the caller decides what that means.
 */
export function runLane(name, opts, secrets = {}) {
  const lane = LANES[name];
  if (!lane) throw new Error(`unknown lane: ${name}`);
  if (lane.status === "gui-only") lane.build();

  const { args, cwd } = lane.build(opts);
  const started = Date.now();

  return new Promise((resolve) => {
    const child = spawn(lane.bin, args, {
      cwd: cwd ?? process.cwd(),
      env: { ...process.env, ...lane.env(secrets) },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));

    child.on("error", (e) =>
      resolve({ ok: false, code: null, stdout: "", stderr: String(e), ms: Date.now() - started })
    );

    child.on("close", (code) =>
      resolve({
        ok: code === 0,
        code,
        stdout: stripAnsi(stdout).trim(),
        stderr: stripAnsi(stderr).trim(),
        ms: Date.now() - started,
      })
    );
  });
}
