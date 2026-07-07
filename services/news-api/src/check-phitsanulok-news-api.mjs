import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runPhitsanulokNewsDryRun } from "./phitsanulok-news-pipeline.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../..");
const args = process.argv.slice(2);
const jsonIndex = args.indexOf("--json");
const jsonPath = jsonIndex >= 0 ? resolve(repoRoot, args[jsonIndex + 1]) : null;
const result = runPhitsanulokNewsDryRun({ date: "2026-07-03" });
const failures = [];

if (result.status !== "PASS") failures.push("dry_run_status_not_pass");
if (result.draft.status !== "draft_only") failures.push("facebook_draft_not_draft_only");
if (result.draft.liveSend !== false) failures.push("facebook_draft_live_send_not_false");
if (result.liveGate.status !== "BLOCKED") failures.push("live_gate_did_not_block");
if (!result.admin.blockedLiveActions.includes("facebook_live_post")) failures.push("admin_missing_facebook_block");
if (result.partners.liveOutreach !== false) failures.push("partner_panel_live_outreach_not_false");

const payload = {
  packet: "A2A2A-P053-PHITSANULOK-NEWS-AUTOMATION-20260703",
  status: failures.length === 0 ? "PASS" : "FAIL",
  checks: {
    daily_content_packet: result.packet.contentCards.length,
    facebook_draft_status: result.draft.status,
    facebook_draft_live_send: result.draft.liveSend,
    live_gate_status: result.liveGate.status,
    partner_live_outreach: result.partners.liveOutreach
  },
  failures
};

if (jsonPath) await writeFile(jsonPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(JSON.stringify(payload, null, 2));
if (failures.length > 0) process.exit(1);
