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
const requiredSections = ["summary", "pipeline", "schemas", "qc", "calendar", "safety"];
const blockedPatterns = [/submitToAmazon/i, /autoPublish/i, /amazon api/i, /tos bypass/i, /customer broadcast/i, /fetch\s*\(/i];
const failures = [];

for (const section of requiredSections) {
  if (!html.includes(`data-section="${section}"`)) failures.push(`missing_section_${section}`);
}
for (const pattern of blockedPatterns) {
  if (pattern.test(surface)) failures.push(`blocked_pattern_${pattern.source}`);
}
if (!distExists) failures.push("missing_dist_build");
if (!js.includes("Array.from({ length: 30 }")) failures.push("missing_30_day_calendar_view");
if (!html.includes("DRAFT ONLY / OWNER REVIEW REQUIRED")) failures.push("missing_owner_gate_label");

const payload = {
  packet: "A2A2A-P048-MERCH-AUTOMATION-DASHBOARD-20260703",
  status: failures.length === 0 ? "PASS" : "FAIL",
  app: "@merch/dashboard",
  required_sections: requiredSections,
  dist_exists: distExists,
  failures
};

if (jsonPath) await writeFile(jsonPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(JSON.stringify(payload, null, 2));
if (failures.length > 0) process.exit(1);
