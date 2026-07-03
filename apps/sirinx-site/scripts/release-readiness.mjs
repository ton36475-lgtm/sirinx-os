import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..", "..");
const reportPath = "docs/website/SIRINX_WEBSITE_RELEASE_PREFLIGHT_2026-07-03.md";
const packetPath = "_A2A_QUEUE/outbox/packet_071_sirinx_website_release_preflight.json";

const evidenceFiles = {
  completionAudit: "docs/website/SIRINX_WEBSITE_COMPLETION_AUDIT_2026-07-03.md",
  manualReviewTemplate: "docs/website/SIRINX_WEBSITE_MANUAL_REVIEW_RESULT_TEMPLATE_2026-07-03.md",
  reviewStagingManifest: "docs/website/SIRINX_WEBSITE_REVIEW_STAGING_MANIFEST_2026-07-03.md",
  localEvidencePacket: "docs/website/SIRINX_WEBSITE_LOCAL_EVIDENCE_PACKET_2026-07-03.md",
  manualGatePacket: "_A2A_QUEUE/outbox/packet_062_sirinx_website_manual_review_gate.json",
  lineQrPacket: "_A2A_QUEUE/outbox/packet_066_sirinx_website_line_qr_link_recheck.json",
  reviewEvidencePacket: "_A2A_QUEUE/outbox/packet_068_sirinx_website_review_evidence_refresh.json",
  manualEvidenceContractPacket: "_A2A_QUEUE/outbox/packet_069_sirinx_website_manual_review_evidence_contract.json",
  previewHealthPacket: "_A2A_QUEUE/outbox/packet_070_sirinx_website_local_preview_health.json",
  manualReviewReceiptPacket: "_A2A_QUEUE/outbox/packet_072_sirinx_website_manual_review_receipt.json"
};

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

function tableRowsWithStatus(markdown, status) {
  return markdown
    .split("\n")
    .filter((line) => line.trim().startsWith("|"))
    .filter((line) => line.includes(`| ${status} |`))
    .map((line) =>
      line
        .split("|")
        .map((cell) => cell.trim())
        .filter(Boolean)
    )
    .filter((cells) => cells.length >= 2)
    .map((cells) => cells[0]);
}

function hasExactDeployApproval(manualReviewTemplate) {
  return /APPROVE_DEPLOY_SIRINX_SITE_\d{4}-\d{2}-\d{2}/.test(manualReviewTemplate);
}

export async function collectReleaseReadiness() {
  const entries = Object.fromEntries(
    await Promise.all(
      Object.entries(evidenceFiles).map(async ([key, file]) => [
        key,
        await readFile(resolve(repoRoot, file), "utf8")
      ])
    )
  );

  const pendingManualRequirements = tableRowsWithStatus(entries.completionAudit, "Pending");
  const pendingManualChecks = tableRowsWithStatus(entries.manualReviewTemplate, "Pending");
  const deployApprovalPresent = hasExactDeployApproval(entries.manualReviewTemplate);
  const manualGatePacket = JSON.parse(entries.manualGatePacket);
  const lineQrPacket = JSON.parse(entries.lineQrPacket);
  const reviewEvidencePacket = JSON.parse(entries.reviewEvidencePacket);
  const manualEvidenceContractPacket = JSON.parse(entries.manualEvidenceContractPacket);
  const previewHealthPacket = JSON.parse(entries.previewHealthPacket);
  const manualReviewReceiptPacket = JSON.parse(entries.manualReviewReceiptPacket);
  const manifestHasExcludeGuidance =
    entries.reviewStagingManifest.includes("Exclude Or Review Carefully Before Any Push") &&
    entries.reviewStagingManifest.includes("floating-contact.bak.html") &&
    entries.reviewStagingManifest.includes("Do not push or deploy from this manifest alone");
  const localEvidenceHasFreshUat =
    entries.localEvidencePacket.includes("106 Playwright checks") &&
    entries.localEvidencePacket.includes("test:review-gates") &&
    entries.localEvidencePacket.includes("packet_070");
  const automatedEvidenceReady =
    reviewEvidencePacket.status === "REVIEW_EVIDENCE_REFRESH_READY_PENDING_HUMAN_INPUT" &&
    manualEvidenceContractPacket.status === "MANUAL_REVIEW_EVIDENCE_CONTRACT_READY_PENDING_HUMAN_EVIDENCE" &&
    previewHealthPacket.status === "LOCAL_PREVIEW_HEALTH_READY_FOR_HUMAN_REVIEW" &&
    manualReviewReceiptPacket.status === "MANUAL_REVIEW_RECEIPT_READY_PENDING_HUMAN_INPUT" &&
    lineQrPacket.status === "LINE_QR_LINK_RECHECK_READY_PENDING_REAL_DEVICE_SCAN";
  const blockers = [
    ...(pendingManualRequirements.length > 0
      ? [
          {
            id: "pending_manual_requirements",
            status: "blocked",
            details: pendingManualRequirements
          }
        ]
      : []),
    ...(pendingManualChecks.length > 0
      ? [
          {
            id: "pending_manual_checks",
            status: "blocked",
            details: pendingManualChecks
          }
        ]
      : []),
    ...(manualEvidenceContractPacket.human_evidence_complete !== true
      ? [
          {
            id: "manual_evidence_incomplete",
            status: "blocked",
            details: manualEvidenceContractPacket.manual_checks_pending || []
          }
        ]
      : []),
    ...(manualReviewReceiptPacket.receipt_complete !== true
      ? [
          {
            id: "manual_review_receipt_incomplete",
            status: "blocked",
            details: manualReviewReceiptPacket.manual_checks_pending || []
          }
        ]
      : []),
    ...(lineQrPacket.decision?.real_device_scan_proven !== true
      ? [
          {
            id: "real_device_qr_scan_missing",
            status: "blocked",
            details: ["Real-device LINE QR scan is not proven by local automation."]
          }
        ]
      : []),
    ...(!deployApprovalPresent
      ? [
          {
            id: "exact_deploy_approval_missing",
            status: "blocked",
            details: ["APPROVE_DEPLOY_SIRINX_SITE_<date> is not present in the manual review template."]
          }
        ]
      : [])
  ];
  const canDeployAfterPreflight =
    automatedEvidenceReady &&
    pendingManualRequirements.length === 0 &&
    pendingManualChecks.length === 0 &&
    manualEvidenceContractPacket.human_evidence_complete === true &&
    manualReviewReceiptPacket.receipt_complete === true &&
    lineQrPacket.decision?.real_device_scan_proven === true &&
    deployApprovalPresent;

  return {
    packet_id: "packet_071_sirinx_website_release_preflight",
    created_at: nowBangkok(),
    status: canDeployAfterPreflight ? "RELEASE_PREFLIGHT_READY_FOR_EXACT_DEPLOY_RUN" : "READY_FOR_HUMAN_REVIEW_BLOCKED_FOR_DEPLOY",
    mode: "local_only_release_preflight_no_push_no_deploy",
    scope: "apps/sirinx-site",
    deploy_gate: canDeployAfterPreflight ? "READY_FOR_EXACT_DEPLOY_RUN" : "BLOCKED_FOR_DEPLOY",
    push_gate: "BLOCKED_UNTIL_EXPLICIT_APPROVAL",
    local_evidence: localEvidenceHasFreshUat ? "PRESENT" : "INCOMPLETE",
    manifest_exclude_guidance: manifestHasExcludeGuidance ? "PRESENT" : "INCOMPLETE",
    automated_evidence_ready: automatedEvidenceReady,
    review_evidence_status: reviewEvidencePacket.status,
    manual_gate_status: manualGatePacket.status,
    manual_evidence_contract_status: manualEvidenceContractPacket.status,
    manual_evidence_complete: manualEvidenceContractPacket.human_evidence_complete === true,
    manual_review_receipt_status: manualReviewReceiptPacket.status,
    manual_review_receipt_complete: manualReviewReceiptPacket.receipt_complete === true,
    local_preview_health_status: previewHealthPacket.status,
    local_preview_routes_ready: previewHealthPacket.routes_ready === true,
    line_qr_link_status: lineQrPacket.status,
    real_device_scan_proven: lineQrPacket.decision?.real_device_scan_proven === true,
    deploy_approval_present: deployApprovalPresent,
    pending_manual_requirements: pendingManualRequirements,
    pending_manual_checks: pendingManualChecks,
    blockers,
    can_deploy_after_preflight: canDeployAfterPreflight,
    completion_claim_allowed: false,
    report: reportPath,
    closed_gates: canDeployAfterPreflight ? closedGates.filter((gate) => gate !== "deploy") : closedGates,
    next_safe_action:
      "Human review local website, scan LINE QR on a real device, and manually confirm existing bot/inquiry behavior before any explicit staging, push, or deploy gate."
  };
}

function renderList(items) {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- None";
}

function renderBlockers(blockers) {
  return blockers.length > 0
    ? blockers
        .map((blocker) => `### ${blocker.id}\n\n${renderList(blocker.details || [])}`)
        .join("\n\n")
    : "- None";
}

function renderReport(packet) {
  return `# SIRINX Website Release Preflight

Status: ${packet.status}
Date: ${packet.created_at}
Scope: \`${packet.scope}\`
Mode: ${packet.mode}
Deploy gate: \`${packet.deploy_gate}\`
Push gate: \`${packet.push_gate}\`
Can deploy after preflight: ${packet.can_deploy_after_preflight ? "yes" : "no"}
Completion claim allowed: ${packet.completion_claim_allowed ? "yes" : "no"}

## Purpose

This preflight reads the current local evidence packets and manual review template before any deploy discussion. It does not push, deploy, open a public tunnel, activate LINE webhook, connect production analytics, or store customer data.

## Automated Evidence

- Review evidence refresh: \`${packet.review_evidence_status}\`
- Manual review gate: \`${packet.manual_gate_status}\`
- Manual evidence contract: \`${packet.manual_evidence_contract_status}\`
- Manual evidence complete: ${packet.manual_evidence_complete ? "yes" : "no"}
- Manual review receipt: \`${packet.manual_review_receipt_status}\`
- Manual review receipt complete: ${packet.manual_review_receipt_complete ? "yes" : "no"}
- Local preview health: \`${packet.local_preview_health_status}\`
- Local preview routes ready: ${packet.local_preview_routes_ready ? "yes" : "no"}
- LINE QR/link status: \`${packet.line_qr_link_status}\`
- Real-device scan proven: ${packet.real_device_scan_proven ? "yes" : "no"}
- Exact deploy approval present: ${packet.deploy_approval_present ? "yes" : "no"}

## Release Blockers

${renderBlockers(packet.blockers)}

## Closed Gates

${packet.closed_gates.map((gate) => `- ${gate}`).join("\n")}

## Next Safe Action

${packet.next_safe_action}

This release preflight is not push approval and not deploy approval.
`;
}

export async function writeReleasePreflight() {
  const packet = await collectReleaseReadiness();
  await mkdir(resolve(repoRoot, dirname(reportPath)), { recursive: true });
  await mkdir(resolve(repoRoot, dirname(packetPath)), { recursive: true });
  await writeFile(resolve(repoRoot, reportPath), renderReport(packet), "utf8");
  await writeFile(resolve(repoRoot, packetPath), `${JSON.stringify(packet, null, 2)}\n`, "utf8");
  return packet;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const readiness = process.argv.includes("--write")
    ? await writeReleasePreflight()
    : await collectReleaseReadiness();
  console.log(JSON.stringify(readiness, null, 2));
}
