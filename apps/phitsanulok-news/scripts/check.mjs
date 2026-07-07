import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(__dirname, "..");
const repoRoot = resolve(appRoot, "../..");
const args = process.argv.slice(2);
const jsonIndex = args.indexOf("--json");
const jsonPath = jsonIndex >= 0 ? resolve(repoRoot, args[jsonIndex + 1]) : null;

const html = await readFile(resolve(appRoot, "src/index.html"), "utf8");
const css = await readFile(resolve(appRoot, "src/styles.css"), "utf8");
const js = await readFile(resolve(appRoot, "src/app.js"), "utf8");
const distExists = existsSync(resolve(appRoot, "dist/index.html"));
const surface = `${html}\n${css}\n${js}`;
const requiredSections = [
  "local_news_site",
  "daily_content_pipeline",
  "facebook_auto_post_draft_only",
  "admin_dashboard",
  "partner_panel",
  "draft_only_gate_check"
];
const blockedPatterns = [
  /graph\.facebook\.com/i,
  /FB\.api/i,
  /publishLive/i,
  /autoPostLive/i,
  /fetch\s*\(/i,
  /customerData/i,
  /customer_data_ingestion/i,
  /send(Line|Email|Sms|SMS|Telegram)/,
  /access_token/i
];
const failures = [];

for (const section of requiredSections) {
  if (!html.includes(`data-section="${section}"`)) failures.push(`missing_section_${section}`);
}
for (const pattern of blockedPatterns) {
  if (pattern.test(surface)) failures.push(`blocked_pattern_${pattern.source}`);
}
if (!distExists) failures.push("missing_dist_build");
if (!html.includes("DRAFT ONLY / OWNER REVIEW REQUIRED")) failures.push("missing_owner_review_label");
if (!js.includes("liveSend: false")) failures.push("missing_live_send_false_flag");
if (!js.includes("Live Facebook posting is blocked")) failures.push("missing_live_post_block_message");
if (!surface.includes("No live Facebook posting without gate")) failures.push("missing_facebook_gate_copy");

const payload = {
  packet: "A2A2A-P053-PHITSANULOK-NEWS-AUTOMATION-20260703",
  status: failures.length === 0 ? "PASS" : "FAIL",
  app: "@phitsanulok/news",
  required_sections: requiredSections,
  dist_exists: distExists,
  failures
};

if (jsonPath) await writeFile(jsonPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(JSON.stringify(payload, null, 2));
if (failures.length > 0) process.exit(1);
