import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const appRoot = fileURLToPath(new URL("../", import.meta.url));
const indexPath = new URL("../src/index.html", import.meta.url);
const stylePath = new URL("../src/styles.css", import.meta.url);
const scriptPath = new URL("../src/app.js", import.meta.url);
const fixturePath = new URL("../fixtures/control-plane-status-card-visual-smoke.html", import.meta.url);

const [html, css, script, fixture] = await Promise.all([
  readFile(indexPath, "utf8"),
  readFile(stylePath, "utf8"),
  readFile(scriptPath, "utf8"),
  readFile(fixturePath, "utf8")
]);

const failures = [];

function requireText(source, text, label) {
  if (!source.includes(text)) failures.push(label);
}

function requireOrder(source, before, after, label) {
  const beforeIndex = source.indexOf(before);
  const afterIndex = source.indexOf(after);
  if (beforeIndex === -1 || afterIndex === -1 || beforeIndex >= afterIndex) {
    failures.push(label);
  }
}

const sourceHtmlLabels = [
  "GhostClaw Control Plane",
  "Status Read Model",
  "Active Projects",
  "Packets",
  "Guardrails",
  "Receipts"
];

const fixtureLabels = [
  ...sourceHtmlLabels,
  "Projects",
  "Missions",
  "Approvals"
];

for (const label of sourceHtmlLabels) {
  requireText(html, label, `missing-dashboard-label:${label}`);
}

for (const label of fixtureLabels) {
  requireText(fixture, label, `missing-fixture-label:${label}`);
}

requireOrder(html, "CenterBrain Hub", "GhostClaw Control Plane", "panel-order:centerbrain-before-control-plane");
requireOrder(html, "GhostClaw Control Plane", "Hermes Team + Qwen + Antigravity", "panel-order:control-plane-before-runtime");

requireText(css, ".control-plane-panel", "missing-css-control-plane-panel");
requireText(css, "margin-bottom: 14px", "missing-css-panel-spacing");
requireText(css, "@media (max-width:", "missing-css-mobile-layout");

const expectedSummaryCalls = [
  "makeSummaryCard(\"Projects\"",
  "makeSummaryCard(\"Missions\"",
  "makeSummaryCard(\"Packets\"",
  "makeSummaryCard(\"Approvals\"",
  "makeSummaryCard(\"Receipts\""
];

for (const call of expectedSummaryCalls) {
  requireText(script, call, `missing-summary-call:${call}`);
}

const blockedWords = [
  "live_execution",
  "provider_call",
  "live_telegram_send",
  "cloudflare_r2_mutation",
  "database_migration"
];

for (const word of blockedWords) {
  requireText(script, word, `missing-script-safety-word:${word}`);
  requireText(fixture, word.replaceAll("_", " "), `missing-fixture-safety-word:${word}`);
}

requireText(fixture, "P108 local visual smoke fixture, no live execution", "missing-fixture-stop-point");
requireText(fixture, "path-hidden API view", "missing-fixture-path-hidden-copy");

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
      fixture: fileURLToPath(fixturePath),
      checked: {
        labels: fixtureLabels.length,
        summaryCards: expectedSummaryCalls.length,
        safetyWords: blockedWords.length,
        panelOrder: true,
        responsiveFixture: true
      },
      liveActions: false
    },
    null,
    2
  )
);
