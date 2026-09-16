import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { writeHumanReviewBoard } from "./generate-human-review-board.mjs";
import { writeManualReviewGate } from "./manual-review-gate.mjs";
import { writeMasterPlanCurrentAudit } from "./master-plan-current-audit.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(here, "..");
const repoRoot = resolve(siteRoot, "..", "..");

const reportPath = "docs/website/SIRINX_WEBSITE_LOCAL_REVIEW_RUN_2026-07-03.md";
const packetPath = "_A2A_QUEUE/outbox/packet_063_sirinx_website_local_review_run.json";

const closedGates = [
  "deploy",
  "push",
  "line_webhook",
  "production_analytics",
  "crm_customer_data_storage",
  "customer_data_collection",
  "external_message_send",
  "provider_call",
  "paid_provider_call",
  "public_tunnel",
  "package_install",
  "production_mutation",
  "database_write_or_migration",
  "secret_or_env_read"
];

export function createLocalReviewRunPacket({ masterAudit, reviewBoard, manualGate }) {
  const status =
    masterAudit.status === "LOCAL_EVIDENCE_READY_FOR_HUMAN_REVIEW_NOT_COMPLETE" &&
    reviewBoard.status === "READY_FOR_HUMAN_REVIEW" &&
    manualGate.status === "BLOCKED_PENDING_HUMAN_REVIEW"
      ? "LOCAL_REVIEW_READY_BLOCKED_PENDING_HUMAN_INPUT"
      : "LOCAL_REVIEW_REQUIRES_ATTENTION";

  return {
    packet_id: "packet_063_sirinx_website_local_review_run",
    created_at: "2026-07-03T03:05:00+0700",
    status,
    mode: "local_only_review_run_no_server_no_push_no_deploy",
    generated_packets: [
      "_A2A_QUEUE/outbox/packet_060_sirinx_website_master_plan_current_audit.json",
      "_A2A_QUEUE/outbox/packet_061_sirinx_website_human_review_board.json",
      "_A2A_QUEUE/outbox/packet_062_sirinx_website_manual_review_gate.json"
    ],
    companion_packets: [
      "_A2A_QUEUE/outbox/packet_064_sirinx_website_github_connector_recheck.json",
      "_A2A_QUEUE/outbox/packet_065_sirinx_website_github_live_local_recheck_automation.json",
      "_A2A_QUEUE/outbox/packet_066_sirinx_website_line_qr_link_recheck.json",
      "_A2A_QUEUE/outbox/packet_067_sirinx_website_manual_review_intake.json",
      "_A2A_QUEUE/outbox/packet_069_sirinx_website_manual_review_evidence_contract.json",
      "_A2A_QUEUE/outbox/packet_070_sirinx_website_local_preview_health.json",
      "_A2A_QUEUE/outbox/packet_072_sirinx_website_manual_review_receipt.json"
    ],
    report: reportPath,
    board: reviewBoard.board,
    master_plan_status: masterAudit.status,
    review_board_status: reviewBoard.status,
    manual_review_gate_status: manualGate.status,
    manual_checks_total: manualGate.manual_checks_total,
    manual_checks_passed: manualGate.manual_checks_passed,
    deploy_gate: manualGate.deploy_gate,
    push_gate: manualGate.push_gate,
    completion_claim_allowed: false,
    local_preview_command: "pnpm --filter @sirinx/site preview",
    local_preview_url: "http://127.0.0.1:8730/",
    closed_gates: closedGates,
    next_safe_action:
      "Open the local review board and preview, complete the manual review template with real evidence, then rerun pnpm --filter @sirinx/site review:local."
  };
}

function renderReport(packet) {
  return `# SIRINX Website Local Review Run

Status: ${packet.status}
Date: ${packet.created_at}
Mode: ${packet.mode}
Completion claim allowed: ${packet.completion_claim_allowed ? "yes" : "no"}

## Generated Local Packets

${packet.generated_packets.map((item) => `- \`${item}\``).join("\n")}

## Companion Evidence Packets

${packet.companion_packets.map((item) => `- \`${item}\``).join("\n")}

## Current Gate Summary

- Master-plan audit: \`${packet.master_plan_status}\`
- Human review board: \`${packet.review_board_status}\`
- Manual review gate: \`${packet.manual_review_gate_status}\`
- Manual checks total: ${packet.manual_checks_total}
- Manual checks passed: ${packet.manual_checks_passed}
- Deploy gate: \`${packet.deploy_gate}\`
- Push gate: \`${packet.push_gate}\`

## Local Review Entry Points

- Review board: \`${packet.board}\`
- Local preview command: \`${packet.local_preview_command}\`
- Local preview URL: \`${packet.local_preview_url}\`

## Closed Gates

${packet.closed_gates.map((gate) => `- ${gate}`).join("\n")}

## Next Safe Action

${packet.next_safe_action}

This local review run does not start a public tunnel, does not push, and does not deploy.
`;
}

export async function writeLocalReviewRun() {
  const masterAudit = await writeMasterPlanCurrentAudit();
  const reviewBoard = await writeHumanReviewBoard();
  const manualGate = await writeManualReviewGate();
  const packet = createLocalReviewRunPacket({ masterAudit, reviewBoard, manualGate });

  await mkdir(resolve(repoRoot, dirname(reportPath)), { recursive: true });
  await mkdir(resolve(repoRoot, dirname(packetPath)), { recursive: true });
  await writeFile(resolve(repoRoot, reportPath), renderReport(packet), "utf8");
  await writeFile(resolve(repoRoot, packetPath), `${JSON.stringify(packet, null, 2)}\n`, "utf8");
  return packet;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const packet = await writeLocalReviewRun();
  console.log(JSON.stringify(packet, null, 2));
}
