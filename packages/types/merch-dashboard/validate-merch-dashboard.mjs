import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../..");

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

export async function validateMerchDashboard(root = repoRoot) {
  const requiredFiles = [
    "apps/merch-dashboard/src/index.html",
    "apps/merch-dashboard/src/styles.css",
    "apps/merch-dashboard/src/app.js",
    "apps/merch-dashboard/dist/index.html",
    "packages/types/merch-dashboard/google-sheets-schema.csv",
    "packages/types/merch-dashboard/airtable-schema.json",
    "packages/types/merch-dashboard/qc-checklist.json",
    "packages/types/merch-dashboard/production-calendar.json",
    "workflows/n8n/merch-dashboard-dry-run.workflow.json",
    "prompts/merch/prompt-pack.json"
  ];
  const failures = [];

  for (const file of requiredFiles) {
    if (!existsSync(resolve(root, file))) failures.push(`missing_${file}`);
  }

  const appJs = await readFile(resolve(root, "apps/merch-dashboard/src/app.js"), "utf8");
  const sheetCsv = await readFile(resolve(root, "packages/types/merch-dashboard/google-sheets-schema.csv"), "utf8");
  const airtable = await readJson(resolve(root, "packages/types/merch-dashboard/airtable-schema.json"));
  const qc = await readJson(resolve(root, "packages/types/merch-dashboard/qc-checklist.json"));
  const calendar = await readJson(resolve(root, "packages/types/merch-dashboard/production-calendar.json"));
  const workflow = await readJson(resolve(root, "workflows/n8n/merch-dashboard-dry-run.workflow.json"));
  const prompts = await readJson(resolve(root, "prompts/merch/prompt-pack.json"));

  const expectedTables = [
    "niches",
    "design_pipeline",
    "ip_policy_checks",
    "listing_drafts",
    "qc_reviews",
    "traffic_content",
    "sales_analytics"
  ];

  for (const table of expectedTables) {
    if (!sheetCsv.includes(`${table},`)) failures.push(`sheet_missing_${table}`);
    if (!airtable.tables?.some((entry) => entry.name === table)) failures.push(`airtable_missing_${table}`);
  }

  if (workflow.active !== false || workflow.meta?.mode !== "dry_run_only") failures.push("workflow_not_dry_run");
  if (workflow.meta?.live_amazon_api !== false) failures.push("workflow_live_amazon_not_false");
  if (airtable.live_sync !== false) failures.push("airtable_live_sync_not_false");
  if ((qc.checks ?? []).length < 10) failures.push("qc_checks_under_10");
  if (calendar.days !== 30) failures.push("calendar_not_30_days");
  if ((prompts.templates ?? []).length < 4) failures.push("prompt_templates_under_4");
  if (!appJs.includes("Array.from({ length: 30 }")) failures.push("dashboard_missing_30_day_calendar");

  const blockedSurface = `${appJs}\n${JSON.stringify(workflow)}\n${JSON.stringify(prompts)}`;
  const blockedPatterns = [/submitToAmazon/i, /autoPublish/i, /amazon api/i, /tos bypass/i, /customer broadcast/i];
  for (const pattern of blockedPatterns) {
    if (pattern.test(blockedSurface)) failures.push(`blocked_pattern_${pattern.source}`);
  }

  return {
    packet: "A2A2A-P048-MERCH-AUTOMATION-DASHBOARD-20260703",
    status: failures.length === 0 ? "PASS" : "FAIL",
    expected_tables: expectedTables,
    qc_count: qc.checks?.length ?? 0,
    prompt_template_count: prompts.templates?.length ?? 0,
    workflow_active: workflow.active,
    failures
  };
}

async function main() {
  const args = process.argv.slice(2);
  const jsonIndex = args.indexOf("--json");
  const jsonPath = jsonIndex >= 0 ? resolve(repoRoot, args[jsonIndex + 1]) : null;
  const payload = await validateMerchDashboard();
  if (jsonPath) await writeFile(jsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(JSON.stringify(payload, null, 2));
  if (payload.status !== "PASS") process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
