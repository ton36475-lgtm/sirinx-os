import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { summarizeAutoVisualBotReceipt } from "./auto-review/auto-visual-bot-check.mjs";

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

const autoReviewResultPath = "reports/review/p087/auto_review_result.json";
const autoVisualBotReceiptPath = "reports/review/p087b/auto_visual_bot_receipt.json";

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

function manualRowPassed(markdown, check) {
  return markdown
    .split("\n")
    .filter((line) => line.trim().startsWith("|"))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
    .some(([rowCheck, status, evidence]) => rowCheck === check && status?.toLowerCase() === "passed" && evidence?.length > 0);
}

export function hasExactDeployApproval(manualReviewTemplate) {
  return /APPROVE_DEPLOY_SIRINX_SITE_\d{4}-\d{2}-\d{2}/.test(manualReviewTemplate);
}

async function readOptionalJson(path) {
  try {
    return JSON.parse(await readFile(resolve(repoRoot, path), "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export function summarizeAutoReviewEvidence(autoReviewResult) {
  if (!autoReviewResult) {
    return {
      present: false,
      evidence_ready: false,
      verdict: "missing",
      warning_count: 0,
      artifact_count: 0,
      low_risk_checks_accepted: []
    };
  }

  const checks = autoReviewResult.checks || [];
  const findings = autoReviewResult.findings || [];
  const verdictAllowsLowRiskEvidence = [
    "auto_review_pass",
    "auto_review_pass_needs_human_approval"
  ].includes(autoReviewResult.verdict);
  const allChecksPassed = checks.length > 0 && checks.every((check) => check.status === "passed");
  const hasHighRiskFinding = findings.some((finding) => ["high", "critical"].includes(finding.severity));
  const artifactCount = (autoReviewResult.artifacts || []).length;
  const evidenceReady = verdictAllowsLowRiskEvidence && allChecksPassed && !hasHighRiskFinding && artifactCount > 0;

  return {
    present: true,
    evidence_ready: evidenceReady,
    verdict: autoReviewResult.verdict || "unknown",
    warning_count: findings.filter((finding) => finding.severity === "warning").length,
    artifact_count: artifactCount,
    low_risk_checks_accepted: evidenceReady
      ? [
          "Confirm Add LINE target",
          "Confirm Chat target",
          "Confirm LINE did not replace existing inquiry path",
          "Keyboard skip-link spot check",
          "Mobile overlap / layout spot check"
        ]
      : []
  };
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
  const autoReviewEvidence = summarizeAutoReviewEvidence(await readOptionalJson(autoReviewResultPath));
  const autoVisualBotEvidence = summarizeAutoVisualBotReceipt(await readOptionalJson(autoVisualBotReceiptPath));
  const realDeviceScanProvenByManualTemplate =
    manualRowPassed(entries.manualReviewTemplate, "Real-device LINE QR scan") &&
    manualRowPassed(entries.manualReviewTemplate, "Confirm QR opens `SIRINX โซล่าเซลล์`");
  const realDeviceScanProven =
    lineQrPacket.decision?.real_device_scan_proven === true || realDeviceScanProvenByManualTemplate;
  const acceptedManualRequirements = [
    ...(realDeviceScanProven ? ["QR is scannable on a real device"] : []),
    ...(autoReviewEvidence.evidence_ready ? ["Mobile overlap and spacing are acceptable"] : []),
    ...autoVisualBotEvidence.accepted_manual_requirements,
    ...(deployApprovalPresent ? ["Deployment can proceed"] : [])
  ];
  const acceptedManualChecks = [
    ...(realDeviceScanProven
      ? ["Real-device LINE QR scan", "Confirm QR opens `SIRINX โซล่าเซลล์`"]
      : []),
    ...autoReviewEvidence.low_risk_checks_accepted,
    ...autoVisualBotEvidence.accepted_manual_checks
  ];
  const activePendingManualRequirements = pendingManualRequirements.filter(
    (requirement) => !acceptedManualRequirements.includes(requirement)
  );
  const activePendingManualChecks = pendingManualChecks.filter((check) => !acceptedManualChecks.includes(check));
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
  const manualEvidencePendingDetails = (manualEvidenceContractPacket.manual_checks_pending || []).filter(
    (check) => !acceptedManualChecks.includes(check)
  );
  const manualReceiptPendingDetails = (manualReviewReceiptPacket.manual_checks_pending || []).filter(
    (check) => !acceptedManualChecks.includes(check)
  );
  const manualEvidenceCompleteAfterAuto =
    manualEvidenceContractPacket.human_evidence_complete === true || manualEvidencePendingDetails.length === 0;
  const manualReviewReceiptCompleteAfterAuto =
    manualReviewReceiptPacket.receipt_complete === true || manualReceiptPendingDetails.length === 0;
  const blockers = [
    ...(activePendingManualRequirements.length > 0
      ? [
          {
            id: "pending_manual_requirements",
            status: "blocked",
            details: activePendingManualRequirements
          }
        ]
      : []),
    ...(activePendingManualChecks.length > 0
      ? [
          {
            id: "pending_manual_checks",
            status: "blocked",
            details: activePendingManualChecks
          }
        ]
      : []),
    ...(!manualEvidenceCompleteAfterAuto
      ? [
          {
            id: "manual_evidence_incomplete",
            status: "blocked",
            details: manualEvidencePendingDetails
          }
        ]
      : []),
    ...(!manualReviewReceiptCompleteAfterAuto
      ? [
          {
            id: "manual_review_receipt_incomplete",
            status: "blocked",
            details: manualReceiptPendingDetails
          }
        ]
      : []),
    ...(!realDeviceScanProven
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
    activePendingManualRequirements.length === 0 &&
    activePendingManualChecks.length === 0 &&
    manualEvidenceCompleteAfterAuto &&
    manualReviewReceiptCompleteAfterAuto &&
    realDeviceScanProven &&
    deployApprovalPresent;
  const onlyDeployDecisionRemaining =
    activePendingManualRequirements.length === 1 &&
    activePendingManualRequirements[0] === "Deployment can proceed" &&
    activePendingManualChecks.length === 0 &&
    manualEvidenceCompleteAfterAuto &&
    manualReviewReceiptCompleteAfterAuto &&
    realDeviceScanProven &&
    autoVisualBotEvidence.evidence_ready;

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
    auto_review_evidence_present: autoReviewEvidence.present,
    auto_review_evidence_ready: autoReviewEvidence.evidence_ready,
    auto_review_verdict: autoReviewEvidence.verdict,
    auto_review_warning_count: autoReviewEvidence.warning_count,
    auto_review_artifact_count: autoReviewEvidence.artifact_count,
    auto_review_low_risk_checks_accepted: autoReviewEvidence.low_risk_checks_accepted,
    auto_visual_bot_evidence_present: autoVisualBotEvidence.present,
    auto_visual_bot_evidence_ready: autoVisualBotEvidence.evidence_ready,
    auto_visual_bot_verdict: autoVisualBotEvidence.verdict || "missing",
    auto_visual_bot_routes_checked: autoVisualBotEvidence.routes_checked || [],
    review_evidence_status: reviewEvidencePacket.status,
    manual_gate_status: manualGatePacket.status,
    manual_evidence_contract_status: manualEvidenceContractPacket.status,
    manual_evidence_complete: manualEvidenceContractPacket.human_evidence_complete === true,
    manual_evidence_complete_after_auto_review: manualEvidenceCompleteAfterAuto,
    manual_review_receipt_status: manualReviewReceiptPacket.status,
    manual_review_receipt_complete: manualReviewReceiptPacket.receipt_complete === true,
    manual_review_receipt_complete_after_auto_review: manualReviewReceiptCompleteAfterAuto,
    local_preview_health_status: previewHealthPacket.status,
    local_preview_routes_ready: previewHealthPacket.routes_ready === true,
    line_qr_link_status: lineQrPacket.status,
    real_device_scan_proven: realDeviceScanProven,
    real_device_scan_source: realDeviceScanProvenByManualTemplate ? "manual_review_template" : "line_qr_packet",
    deploy_approval_present: deployApprovalPresent,
    pending_manual_requirements: activePendingManualRequirements,
    pending_manual_checks: activePendingManualChecks,
    accepted_manual_requirements: acceptedManualRequirements,
    accepted_manual_checks: acceptedManualChecks,
    blockers,
    can_deploy_after_preflight: canDeployAfterPreflight,
    completion_claim_allowed: false,
    report: reportPath,
    closed_gates: canDeployAfterPreflight ? closedGates.filter((gate) => gate !== "deploy") : closedGates,
    next_safe_action: canDeployAfterPreflight
      ? "Open the scoped website commit gate first; push and deploy remain separate exact gates."
      : onlyDeployDecisionRemaining
        ? "Open a separate exact human deploy approval gate only if accepted; do not deploy from this preflight alone."
        : "Human review remaining visual/bot checks, then use a separate exact deploy approval only if accepted."
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
- P087 auto-review verdict: \`${packet.auto_review_verdict}\`
- P087 auto-review evidence ready: ${packet.auto_review_evidence_ready ? "yes" : "no"}
- P087 auto-review warnings: ${packet.auto_review_warning_count}
- P087 auto-review artifacts: ${packet.auto_review_artifact_count}
- P087B visual bot verdict: \`${packet.auto_visual_bot_verdict}\`
- P087B visual bot evidence ready: ${packet.auto_visual_bot_evidence_ready ? "yes" : "no"}
- P087B routes checked: ${(packet.auto_visual_bot_routes_checked || []).join(", ") || "-"}
- LINE QR/link status: \`${packet.line_qr_link_status}\`
- Real-device scan proven: ${packet.real_device_scan_proven ? "yes" : "no"}
- Real-device scan source: \`${packet.real_device_scan_source}\`
- Exact deploy approval present: ${packet.deploy_approval_present ? "yes" : "no"}

## Accepted Low-Risk Evidence

### Manual requirements satisfied by current evidence

${renderList(packet.accepted_manual_requirements)}

### Manual checks satisfied by current evidence

${renderList(packet.accepted_manual_checks)}

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
