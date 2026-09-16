import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(here, "..");
const repoRoot = resolve(siteRoot, "..", "..");

const manualReviewPath = "docs/website/SIRINX_WEBSITE_MANUAL_REVIEW_RESULT_TEMPLATE_2026-07-03.md";
const manualEvidenceContractPath = "_A2A_QUEUE/outbox/packet_069_sirinx_website_manual_review_evidence_contract.json";
const releasePreflightPath = "_A2A_QUEUE/outbox/packet_071_sirinx_website_release_preflight.json";
const reportPath = "docs/website/SIRINX_WEBSITE_MANUAL_REVIEW_RECEIPT_2026-07-03.md";
const packetPath = "_A2A_QUEUE/outbox/packet_072_sirinx_website_manual_review_receipt.json";

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

function parseManualEvidenceRows(markdown) {
  return markdown
    .split("\n")
    .filter((line) => line.trim().startsWith("|"))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.length >= 3)
    .filter(([check, status]) => check !== "Check" && !check.startsWith("---") && !status.startsWith("---"))
    .map(([check, status, evidence]) => ({
      check,
      status,
      evidence: evidence || ""
    }));
}

function parseReviewerFields(markdown) {
  const fields = ["Reviewer name", "Review date", "Device/browser", "Network context", "Notes"];
  return Object.fromEntries(
    fields.map((field) => {
      const line = markdown.split("\n").find((candidate) => candidate.trim().startsWith(`- ${field}:`)) || "";
      const value = line.replace(new RegExp(`^\\s*-\\s*${field}:\\s*`), "").trim();
      return [field.toLowerCase().replaceAll(" ", "_").replace("/", "_"), value];
    })
  );
}

function checkedDecision(markdown, label) {
  return markdown.split("\n").some((line) => line.includes("[x]") && line.includes(label));
}

function hasExactDeployApproval(markdown) {
  return /APPROVE_DEPLOY_SIRINX_SITE_\d{4}-\d{2}-\d{2}/.test(markdown);
}

function meaningful(value) {
  return value.trim().length >= 12 && !/^(n\/a|na|none|ไม่มี|-|pending)$/i.test(value.trim());
}

function meaningfulReviewerField(field, value) {
  const trimmed = value.trim();
  if (/^(n\/a|na|none|ไม่มี|-|pending)$/i.test(trimmed)) {
    return false;
  }
  if (field === "review_date") {
    return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) || trimmed.length >= 8;
  }
  return meaningful(trimmed);
}

function statusBucket(row) {
  const value = row.status.toLowerCase();
  if (value === "passed" || value === "pass" || value === "ผ่าน") {
    return "passed";
  }
  if (value === "failed" || value === "fail" || value === "ไม่ผ่าน") {
    return "failed";
  }
  return "pending";
}

function rowByCheck(rows, check) {
  return rows.find((row) => row.check === check) || { check, status: "Missing", evidence: "" };
}

export function createManualReviewReceiptPacket({
  createdAt,
  manualReviewMarkdown,
  manualEvidenceContract,
  releasePreflight
}) {
  const rows = parseManualEvidenceRows(manualReviewMarkdown);
  const reviewer = parseReviewerFields(manualReviewMarkdown);
  const passedRows = rows.filter((row) => statusBucket(row) === "passed");
  const failedRows = rows.filter((row) => statusBucket(row) === "failed");
  const pendingRows = rows.filter((row) => statusBucket(row) === "pending");
  const passedWithoutEvidence = passedRows.filter((row) => !meaningful(row.evidence));
  const exactDeployApprovalPresent = hasExactDeployApproval(manualReviewMarkdown);
  const decisions = {
    not_ready_for_deploy_review: checkedDecision(manualReviewMarkdown, "Not ready for deploy review"),
    ready_for_deploy_discussion: checkedDecision(
      manualReviewMarkdown,
      "Ready for deploy approval discussion, but deploy is not approved by this checkbox"
    ),
    deploy_approval_checkbox_checked: checkedDecision(
      manualReviewMarkdown,
      "Deploy approval granted separately with exact phrase"
    )
  };
  const qrScanRow = rowByCheck(rows, "Real-device LINE QR scan");
  const botBehaviorRow = rowByCheck(rows, "Existing bot / inquiry path behavior");
  const lineDidNotReplaceRow = rowByCheck(rows, "Confirm LINE did not replace existing inquiry path");
  const qrConfirmedRow = rowByCheck(rows, "Confirm QR opens `SIRINX โซล่าเซลล์`");
  const reviewerFieldsComplete = ["reviewer_name", "review_date", "device_browser", "network_context"].every(
    (field) => meaningfulReviewerField(field, reviewer[field] || "")
  );
  const manualEvidenceComplete = manualEvidenceContract.human_evidence_complete === true;
  const receiptComplete =
    rows.length === 17 &&
    pendingRows.length === 0 &&
    failedRows.length === 0 &&
    passedWithoutEvidence.length === 0 &&
    reviewerFieldsComplete &&
    manualEvidenceComplete;

  let status = "MANUAL_REVIEW_RECEIPT_READY_PENDING_HUMAN_INPUT";
  if (failedRows.length > 0) {
    status = "MANUAL_REVIEW_RECEIPT_RECORDED_FIXES_REQUIRED";
  } else if (passedWithoutEvidence.length > 0) {
    status = "MANUAL_REVIEW_RECEIPT_REQUIRES_EVIDENCE_DETAILS";
  } else if (receiptComplete && exactDeployApprovalPresent) {
    status = "MANUAL_REVIEW_RECEIPT_COMPLETE_APPROVAL_RECORDED_LOCAL_ONLY";
  } else if (receiptComplete) {
    status = "MANUAL_REVIEW_RECEIPT_COMPLETE_READY_FOR_DEPLOY_DISCUSSION";
  }

  return {
    packet_id: "packet_072_sirinx_website_manual_review_receipt",
    created_at: createdAt,
    lane: "codex_builder",
    mode: "local_only_manual_review_receipt_no_push_no_deploy",
    scope: "apps/sirinx-site",
    status,
    manual_review_template: manualReviewPath,
    reviewer,
    reviewer_fields_complete: reviewerFieldsComplete,
    manual_checks_total: rows.length,
    manual_checks_passed: passedRows.length,
    manual_checks_failed: failedRows.length,
    manual_checks_pending: pendingRows.map((row) => row.check),
    failed_checks: failedRows.map((row) => ({ check: row.check, evidence: row.evidence })),
    passed_without_evidence: passedWithoutEvidence.map((row) => row.check),
    qr_scan: {
      status: statusBucket(qrScanRow),
      evidence: qrScanRow.evidence,
      correct_account_confirmed: statusBucket(qrConfirmedRow) === "passed" && meaningful(qrConfirmedRow.evidence)
    },
    existing_bot: {
      behavior_status: statusBucket(botBehaviorRow),
      behavior_evidence: botBehaviorRow.evidence,
      line_did_not_replace_inquiry_path:
        statusBucket(lineDidNotReplaceRow) === "passed" && meaningful(lineDidNotReplaceRow.evidence)
    },
    decisions,
    exact_deploy_approval_present: exactDeployApprovalPresent,
    manual_evidence_contract_status: manualEvidenceContract.status,
    manual_evidence_complete: manualEvidenceComplete,
    release_preflight_status: releasePreflight.status,
    release_preflight_deploy_gate: releasePreflight.deploy_gate,
    receipt_complete: receiptComplete,
    completion_claim_allowed: false,
    deploy_gate: exactDeployApprovalPresent
      ? "EXACT_APPROVAL_RECORDED_STILL_NO_DEPLOY_RUN"
      : "BLOCKED_FOR_DEPLOY",
    push_gate: "BLOCKED_UNTIL_EXPLICIT_PUSH_APPROVAL",
    closed_gates: closedGates,
    report: reportPath,
    next_safe_action: receiptComplete
      ? "Run release:preflight again before any exact deploy run."
      : "Human reviewer must complete the manual review template with real evidence, QR scan proof, and existing bot/contact behavior proof."
  };
}

function renderList(items) {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- None";
}

function renderReport(packet) {
  return `# SIRINX Website Manual Review Receipt

Status: ${packet.status}
Date: ${packet.created_at}
Scope: \`${packet.scope}\`
Mode: ${packet.mode}
Receipt complete: ${packet.receipt_complete ? "yes" : "no"}
Completion claim allowed: ${packet.completion_claim_allowed ? "yes" : "no"}
Deploy gate: \`${packet.deploy_gate}\`
Push gate: \`${packet.push_gate}\`

## Purpose

This receipt records the current human-review template state in a machine-readable packet. It does not perform human review, push, deploy, open a public tunnel, activate LINE webhook, connect analytics, or store customer data.

## Summary

- Reviewer fields complete: ${packet.reviewer_fields_complete ? "yes" : "no"}
- Manual checks total: ${packet.manual_checks_total}
- Manual checks passed: ${packet.manual_checks_passed}
- Manual checks failed: ${packet.manual_checks_failed}
- Manual evidence complete: ${packet.manual_evidence_complete ? "yes" : "no"}
- Real-device QR scan status: ${packet.qr_scan.status}
- Existing bot behavior status: ${packet.existing_bot.behavior_status}
- Exact deploy approval present: ${packet.exact_deploy_approval_present ? "yes" : "no"}
- Release preflight: \`${packet.release_preflight_status}\`

## Pending Manual Checks

${renderList(packet.manual_checks_pending)}

## Failed Checks

${renderList(packet.failed_checks.map((row) => `${row.check}: ${row.evidence}`))}

## Passed Items Without Evidence

${renderList(packet.passed_without_evidence)}

## Closed Gates

${packet.closed_gates.map((gate) => `- ${gate}`).join("\n")}

## Next Safe Action

${packet.next_safe_action}

This receipt is not push approval and not deploy approval.
`;
}

async function readJson(path) {
  return JSON.parse(await readFile(resolve(repoRoot, path), "utf8"));
}

export async function writeManualReviewReceipt() {
  const [manualReviewMarkdown, manualEvidenceContract, releasePreflight] = await Promise.all([
    readFile(resolve(repoRoot, manualReviewPath), "utf8"),
    readJson(manualEvidenceContractPath),
    readJson(releasePreflightPath)
  ]);
  const packet = createManualReviewReceiptPacket({
    createdAt: nowBangkok(),
    manualReviewMarkdown,
    manualEvidenceContract,
    releasePreflight
  });

  await mkdir(resolve(repoRoot, dirname(reportPath)), { recursive: true });
  await mkdir(resolve(repoRoot, dirname(packetPath)), { recursive: true });
  await writeFile(resolve(repoRoot, reportPath), renderReport(packet), "utf8");
  await writeFile(resolve(repoRoot, packetPath), `${JSON.stringify(packet, null, 2)}\n`, "utf8");
  return packet;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const packet = await writeManualReviewReceipt();
  console.log(JSON.stringify(packet, null, 2));
}
