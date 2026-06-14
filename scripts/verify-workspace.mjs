import { spawnSync } from "node:child_process";

const commands = [
  ["node", ["scripts/check-skeleton.mjs"]],
  ["node", ["scripts/check-x-ai-radar.mjs"]],
  ["node", ["scripts/run-clawforge-dry-run.mjs"]],
  ["node", ["scripts/check-system-wiring.mjs"]],
  ["node", ["scripts/check-soc-monitor.mjs"]],
  ["pnpm", ["vibe-agent:test"]],
  ["pnpm", ["adaptive-command-gateway:test"]],
  ["pnpm", ["gateway-agent:test"]],
  ["pnpm", ["ai-team-pairing:test"]],
  ["pnpm", ["connector-registry:test"]],
  ["pnpm", ["local-rag:test"]],
  ["pnpm", ["hermes-image-edit:test"]],
  ["pnpm", ["hermes-agent-audit:test"]],
  ["pnpm", ["agent-launch-gate:test"]],
  ["pnpm", ["agent-driver:test"]],
  ["pnpm", ["centerbrain-hub:test"]],
  ["pnpm", ["repo-intake-gate:test"]],
  ["pnpm", ["openrouter-qwen-adapter:test"]],
  ["pnpm", ["model-routing-approval:test"]],
  ["pnpm", ["spec-first-swarm:test"]],
  ["pnpm", ["team-runtime-bridge:test"]],
  ["pnpm", ["centerbrain-shell:test"]],
  ["pnpm", ["validator-shield:test"]],
  ["node", ["scripts/secret-scan.mjs"]]
];

const results = commands.map(([command, args]) => {
  const run = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8"
  });
  return {
    command: `${command} ${args.join(" ")}`,
    status: run.status,
    ok: run.status === 0,
    stdout: parseJson(run.stdout),
    stderrPresent: Boolean(run.stderr && run.stderr.trim())
  };
});

const result = {
  ok: results.every((item) => item.ok),
  results,
  guardrail: "local-only verification; no deploy, push, publish, upload, paid API, real MCP, or external connector"
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!result.ok) {
  process.exitCode = 1;
}

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return String(value || "").trim();
  }
}
