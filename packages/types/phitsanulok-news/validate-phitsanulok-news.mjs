import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../..");
async function readJson(name) {
  return JSON.parse(await readFile(resolve(__dirname, name), "utf8"));
}

export async function validatePhitsanulokNewsTypes() {
  const schema = await readJson("content-card.schema.json");
  const facebookDraft = await readJson("facebook-draft-contract.json");
  const pipeline = await readJson("news-pipeline-contract.json");
  const failures = [];

  for (const field of ["id", "title", "category", "district", "sourceType", "verificationStatus", "summary", "requiredChecks"]) {
    if (!schema.required.includes(field)) failures.push(`schema_missing_required_${field}`);
  }
  if (facebookDraft.live_send_default !== false) failures.push("facebook_live_send_default_not_false");
  if (facebookDraft.allowed_status !== "draft_only") failures.push("facebook_allowed_status_not_draft_only");
  if (!facebookDraft.blocked_actions.includes("graph_api_call")) failures.push("facebook_missing_graph_api_block");
  if (!pipeline.required_outputs.includes("partner_panel")) failures.push("pipeline_missing_partner_panel");
  if (!pipeline.blocked_without_gate.includes("live_facebook_post")) failures.push("pipeline_missing_live_facebook_block");
  if (!pipeline.required_gates.includes("owner_review")) failures.push("pipeline_missing_owner_review_gate");

  return {
    packet: "A2A2A-P053-PHITSANULOK-NEWS-AUTOMATION-20260703",
    status: failures.length === 0 ? "PASS" : "FAIL",
    files_checked: [
      "content-card.schema.json",
      "facebook-draft-contract.json",
      "news-pipeline-contract.json"
    ],
    failures
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const jsonIndex = args.indexOf("--json");
  const jsonPath = jsonIndex >= 0 ? resolve(repoRoot, args[jsonIndex + 1]) : null;
  const payload = await validatePhitsanulokNewsTypes();
  if (jsonPath) await writeFile(jsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(JSON.stringify(payload, null, 2));
  if (payload.failures.length > 0) process.exit(1);
}
