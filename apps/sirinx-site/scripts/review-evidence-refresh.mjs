import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { writeGithubLiveLocalRecheck } from "./github-live-local-recheck.mjs";
import { writeLineQrLinkRecheck } from "./line-qr-link-recheck.mjs";
import { writeLocalPreviewHealth } from "./local-preview-health.mjs";
import { writeLocalReviewRun } from "./local-review-run.mjs";
import { writeManualReviewEvidenceContract } from "./manual-review-evidence-contract.mjs";
import { writeManualReviewIntake } from "./manual-review-intake.mjs";
import { writeManualReviewReceipt } from "./manual-review-receipt.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(here, "..");
const repoRoot = resolve(siteRoot, "..", "..");

const reportPath = "docs/website/SIRINX_WEBSITE_REVIEW_EVIDENCE_REFRESH_2026-07-03.md";
const packetPath = "_A2A_QUEUE/outbox/packet_068_sirinx_website_review_evidence_refresh.json";

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

function nowBangkok() {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  })
    .formatToParts(new Date())
    .reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {});

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}+0700`;
}

export function createReviewEvidenceRefreshPacket({
  createdAt,
  githubLive,
  lineQr,
  manualEvidenceContract,
  previewHealth,
  manualIntake,
  manualReviewReceipt,
  localReview
}) {
  const ready =
    githubLive.status === "GITHUB_LIVE_LOCAL_RECHECK_READY_LOCAL_REVIEW_TARGET_CONFIRMED" &&
    lineQr.status === "LINE_QR_LINK_RECHECK_READY_PENDING_REAL_DEVICE_SCAN" &&
    manualEvidenceContract.status === "MANUAL_REVIEW_EVIDENCE_CONTRACT_READY_PENDING_HUMAN_EVIDENCE" &&
    previewHealth.status === "LOCAL_PREVIEW_HEALTH_READY_FOR_HUMAN_REVIEW" &&
    manualIntake.status === "MANUAL_REVIEW_INTAKE_READY_PENDING_HUMAN_INPUT" &&
    manualReviewReceipt.status === "MANUAL_REVIEW_RECEIPT_READY_PENDING_HUMAN_INPUT" &&
    localReview.status === "LOCAL_REVIEW_READY_BLOCKED_PENDING_HUMAN_INPUT";
  const packetStatuses = {
    packet_065: githubLive.status,
    packet_066: lineQr.status,
    packet_069: manualEvidenceContract.status,
    packet_070: previewHealth.status,
    packet_067: manualIntake.status,
    packet_072: manualReviewReceipt.status,
    packet_063: localReview.status
  };

  return {
    packet_id: "packet_068_sirinx_website_review_evidence_refresh",
    created_at: createdAt,
    lane: "codex_builder",
    mode: "local_only_serial_review_evidence_refresh_no_push_no_deploy",
    scope: "apps/sirinx-site",
    status: ready ? "REVIEW_EVIDENCE_REFRESH_READY_PENDING_HUMAN_INPUT" : "REVIEW_EVIDENCE_REFRESH_REQUIRES_ATTENTION",
    refreshed_packets: [
      "_A2A_QUEUE/outbox/packet_065_sirinx_website_github_live_local_recheck_automation.json",
      "_A2A_QUEUE/outbox/packet_066_sirinx_website_line_qr_link_recheck.json",
      "_A2A_QUEUE/outbox/packet_069_sirinx_website_manual_review_evidence_contract.json",
      "_A2A_QUEUE/outbox/packet_070_sirinx_website_local_preview_health.json",
      "_A2A_QUEUE/outbox/packet_067_sirinx_website_manual_review_intake.json",
      "_A2A_QUEUE/outbox/packet_072_sirinx_website_manual_review_receipt.json",
      "_A2A_QUEUE/outbox/packet_060_sirinx_website_master_plan_current_audit.json",
      "_A2A_QUEUE/outbox/packet_061_sirinx_website_human_review_board.json",
      "_A2A_QUEUE/outbox/packet_062_sirinx_website_manual_review_gate.json",
      "_A2A_QUEUE/outbox/packet_063_sirinx_website_local_review_run.json"
    ],
    packet_statuses: packetStatuses,
    manual_checks_pending: manualIntake.manual_checks_pending,
    manual_checks_pending_count: manualIntake.manual_checks_pending.length,
    manual_evidence_contract_complete: manualEvidenceContract.human_evidence_complete === true,
    manual_evidence_contract_report: manualEvidenceContract.report,
    local_preview_health_report: previewHealth.report,
    local_preview_base_url: previewHealth.base_url,
    local_preview_routes_ready: previewHealth.routes_ready === true,
    manual_review_receipt_status: manualReviewReceipt.status,
    manual_review_receipt_report: manualReviewReceipt.report,
    real_device_scan_proven: lineQr.decision?.real_device_scan_proven === true,
    deploy_gate: "BLOCKED_FOR_DEPLOY",
    push_gate: "BLOCKED_UNTIL_EXPLICIT_PUSH_APPROVAL",
    completion_claim_allowed: false,
    closed_gates: closedGates,
    report: reportPath,
    next_safe_action:
      "Human reviewer fills manual review evidence, scans LINE QR on a real device, confirms existing bot/contact behavior, then reruns review:evidence."
  };
}

function renderReport(packet) {
  const statusRows = Object.entries(packet.packet_statuses)
    .map(([id, status]) => `| ${id} | \`${status}\` |`)
    .join("\n");
  const pendingChecks =
    packet.manual_checks_pending.length > 0
      ? packet.manual_checks_pending.map((check) => `- ${check}`).join("\n")
      : "- None";

  return `# SIRINX Website Review Evidence Refresh

Status: ${packet.status}
Date: ${packet.created_at}
Scope: \`${packet.scope}\`
Mode: ${packet.mode}
Completion claim allowed: ${packet.completion_claim_allowed ? "yes" : "no"}
Deploy gate: \`${packet.deploy_gate}\`
Push gate: \`${packet.push_gate}\`

## Purpose

This packet is the one-command local evidence refresh for the website review lane. It refreshes GitHub/live/local comparison, LINE QR/link checks, manual review intake, master audit, human review board, manual gate, and local review summary in a serial order.

## Refreshed Packet Statuses

| Packet | Status |
| --- | --- |
${statusRows}

## Refreshed Packet Files

${packet.refreshed_packets.map((item) => `- \`${item}\``).join("\n")}

## Pending Manual Checks

${pendingChecks}

## Closed Gates

${packet.closed_gates.map((gate) => `- ${gate}`).join("\n")}

## Next Safe Action

${packet.next_safe_action}

This refresh does not push, does not deploy, does not open a public tunnel, does not activate LINE webhook, does not connect production analytics, and does not store customer data.
`;
}

export async function writeReviewEvidenceRefresh() {
  const githubLive = await writeGithubLiveLocalRecheck();
  const lineQr = await writeLineQrLinkRecheck();
  const manualEvidenceContract = await writeManualReviewEvidenceContract();
  const previewHealth = await writeLocalPreviewHealth();

  // First pass ensures packet 062 is current before manual intake reads it.
  await writeLocalReviewRun();
  const manualIntake = await writeManualReviewIntake();
  const manualReviewReceipt = await writeManualReviewReceipt();

  // Second pass ensures the master audit and review summary see the fresh intake packet.
  const localReview = await writeLocalReviewRun();
  const packet = createReviewEvidenceRefreshPacket({
    createdAt: nowBangkok(),
    githubLive,
    lineQr,
    manualEvidenceContract,
    previewHealth,
    manualIntake,
    manualReviewReceipt,
    localReview
  });

  await mkdir(resolve(repoRoot, dirname(reportPath)), { recursive: true });
  await mkdir(resolve(repoRoot, dirname(packetPath)), { recursive: true });
  await writeFile(resolve(repoRoot, reportPath), renderReport(packet), "utf8");
  await writeFile(resolve(repoRoot, packetPath), `${JSON.stringify(packet, null, 2)}\n`, "utf8");
  return packet;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const packet = await writeReviewEvidenceRefresh();
  console.log(JSON.stringify(packet, null, 2));
}
