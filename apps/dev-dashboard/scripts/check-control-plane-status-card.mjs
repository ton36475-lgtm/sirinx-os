import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const appRoot = fileURLToPath(new URL("../", import.meta.url));
const indexPath = new URL("../src/index.html", import.meta.url);
const appPath = new URL("../src/app.js", import.meta.url);

const html = await readFile(indexPath, "utf8");
const script = await readFile(appPath, "utf8");

const requiredDomIds = [
  "controlPlaneStatus",
  "controlPlaneSummary",
  "controlPlaneStopPoint",
  "controlPlaneProjectList",
  "controlPlanePacketList",
  "controlPlaneGuardrailList",
  "controlPlaneReceiptList"
];

const requiredGuardrails = [
  "worker_execution",
  "live_telegram_send",
  "provider_call",
  "secret_read",
  "install",
  "push",
  "deploy",
  "cloudflare_r2_mutation",
  "database_migration"
];

const requiredSnippets = [
  "fallbackGhostClawControlPlaneStatus",
  "function renderGhostClawControlPlaneStatus(status)",
  "renderGhostClawControlPlaneStatus(fallbackGhostClawControlPlaneStatus)",
  "/api/ghostclaw/control-plane/status?include_receipts=true&include_paths=false&limit=3",
  "data.dry_run === true",
  "data.live_execution === false",
  "guardrails.read_only === true",
  "Guardrail drift detected; stop before execution."
];

const failures = [];

function requireText(source, text, label) {
  if (!source.includes(text)) {
    failures.push(label);
  }
}

for (const id of requiredDomIds) {
  requireText(html, `id="${id}"`, `missing-html-id:${id}`);
  requireText(script, `document.querySelector("#${id}")`, `missing-js-selector:${id}`);
}

for (const snippet of requiredSnippets) {
  requireText(script, snippet, `missing-js-snippet:${snippet}`);
}

for (const guardrail of requiredGuardrails) {
  requireText(script, `"${guardrail}"`, `missing-guardrail-check:${guardrail}`);
}

requireText(html, "GhostClaw Control Plane", "missing-panel-title");
requireText(html, "Status Read Model", "missing-panel-subtitle");
requireText(html, "Control-plane status waits for local API readiness.", "missing-fallback-copy");

if (failures.length) {
  console.error(
    JSON.stringify(
      {
        status: "failed",
        appRoot,
        failures
      },
      null,
      2
    )
  );
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      status: "passed",
      appRoot,
      checked: {
        domIds: requiredDomIds.length,
        guardrails: requiredGuardrails.length,
        snippets: requiredSnippets.length
      },
      liveActions: false
    },
    null,
    2
  )
);
