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
const js = await readFile(resolve(appRoot, "src/app.js"), "utf8");
const css = await readFile(resolve(appRoot, "src/styles.css"), "utf8");
const distExists = existsSync(resolve(appRoot, "dist/index.html"));
const surface = `${html}\n${js}\n${css}`;
const requiredScopes = [
  "temple_booking",
  "hall_search",
  "wreaths",
  "catering",
  "vans",
  "local_agents",
  "quote_builder",
  "budget_estimate",
  "partner_dispatch_stub",
  "memorial_guest_page",
  "payments_future_gate"
];
const blockedPatterns = [
  /payment-gateway/i,
  /stripe/i,
  /omise/i,
  /promptpay/i,
  /fetch\s*\(/i,
  /send(Line|Email|Sms|SMS)/,
  /dispatchPartner/i,
  /guaranteed/i,
  /cheap/i,
  /upsell/i
];
const failures = [];

for (const scope of requiredScopes) {
  if (!surface.includes(scope)) failures.push(`missing_scope_${scope}`);
}
for (const pattern of blockedPatterns) {
  if (pattern.test(surface)) failures.push(`blocked_pattern_${pattern.source}`);
}
if (!distExists) failures.push("missing_dist_build");
if (!html.includes("Estimate-only quote builder")) failures.push("missing_estimate_only_label");
if (!html.includes("No live partner dispatch")) failures.push("missing_dispatch_gate_copy");
if (!js.includes("Estimate only. Owner review is required")) failures.push("missing_owner_review_note");

const payload = {
  packet: "A2A2A-P052-KUSALA-FUNERAL-PLATFORM-20260703",
  status: failures.length === 0 ? "PASS" : "FAIL",
  app: "@kusala/site",
  required_scopes: requiredScopes,
  dist_exists: distExists,
  failures
};

if (jsonPath) await writeFile(jsonPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(JSON.stringify(payload, null, 2));
if (failures.length > 0) process.exit(1);
