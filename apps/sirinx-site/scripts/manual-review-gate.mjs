import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(here, "..");
const repoRoot = resolve(siteRoot, "..", "..");

const manualReviewPath = "docs/website/SIRINX_WEBSITE_MANUAL_REVIEW_RESULT_TEMPLATE_2026-07-03.md";
const reviewBoardPacketPath = "_A2A_QUEUE/outbox/packet_061_sirinx_website_human_review_board.json";
const reportPath = "docs/website/SIRINX_WEBSITE_MANUAL_REVIEW_GATE_2026-07-03.md";
const packetPath = "_A2A_QUEUE/outbox/packet_062_sirinx_website_manual_review_gate.json";

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
  const fields = ["Reviewer name", "Review date", "Device/browser", "Network context"];

  return fields.map((field) => {
    const line = markdown.split("\n").find((candidate) => candidate.trim().startsWith(`- ${field}:`)) || "";
    const value = line.replace(new RegExp(`^\\s*-\\s*${field}:\\s*`), "").trim();

    return {
      field,
      present: value.length > 0
    };
  });
}

function hasExactDeployApproval(markdown) {
  return /APPROVE_DEPLOY_SIRINX_SITE_\d{4}-\d{2}-\d{2}/.test(markdown);
}

function checkedDecision(markdown, label) {
  return markdown.split("\n").some((line) => line.includes("[x]") && line.includes(label));
}

export function evaluateManualReviewGate({ manualReviewMarkdown, reviewBoardPacket }) {
  const rows = parseManualEvidenceRows(manualReviewMarkdown);
  const reviewerFields = parseReviewerFields(manualReviewMarkdown);
  const pendingRows = rows.filter((row) => row.status.toLowerCase() !== "passed");
  const passedRows = rows.filter((row) => row.status.toLowerCase() === "passed");
  const reviewerFieldsComplete = reviewerFields.every((field) => field.present);
  const exactDeployApprovalPresent = hasExactDeployApproval(manualReviewMarkdown);
  const readyDiscussionChecked = checkedDecision(
    manualReviewMarkdown,
    "Ready for deploy approval discussion, but deploy is not approved by this checkbox"
  );
  const deployApprovalCheckboxChecked = checkedDecision(
    manualReviewMarkdown,
    "Deploy approval granted separately with exact phrase"
  );

  let status = "BLOCKED_PENDING_HUMAN_REVIEW";
  let deployGate = "BLOCKED_FOR_DEPLOY";

  if (pendingRows.length === 0 && reviewerFieldsComplete && !exactDeployApprovalPresent) {
    status = "READY_FOR_DEPLOY_APPROVAL_DISCUSSION_NOT_APPROVED";
    deployGate = "BLOCKED_UNTIL_EXACT_DEPLOY_APPROVAL";
  }

  if (pendingRows.length === 0 && reviewerFieldsComplete && exactDeployApprovalPresent) {
    status = "EXACT_DEPLOY_APPROVAL_RECORDED_LOCAL_ONLY";
    deployGate = "EXACT_APPROVAL_RECORDED_STILL_NO_DEPLOY_RUN";
  }

  return {
    packet_id: "packet_062_sirinx_website_manual_review_gate",
    created_at: "2026-07-03T02:50:00+0700",
    status,
    mode: "local_only_manual_review_gate_validator",
    manual_review_template: manualReviewPath,
    review_board_packet: reviewBoardPacketPath,
    review_board_status: reviewBoardPacket.status,
    manual_checks_total: rows.length,
    manual_checks_passed: passedRows.length,
    manual_checks_pending: pendingRows.map((row) => row.check),
    reviewer_fields_complete: reviewerFieldsComplete,
    missing_reviewer_fields: reviewerFields.filter((field) => !field.present).map((field) => field.field),
    ready_for_deploy_discussion_checked: readyDiscussionChecked,
    deploy_approval_checkbox_checked: deployApprovalCheckboxChecked,
    exact_deploy_approval_present: exactDeployApprovalPresent,
    deploy_gate: deployGate,
    push_gate: "BLOCKED_UNTIL_EXPLICIT_PUSH_APPROVAL",
    completion_claim_allowed: false,
    closed_gates: closedGates,
    report: reportPath,
    next_safe_action:
      pendingRows.length > 0 || !reviewerFieldsComplete
        ? "Human reviewer must fill the manual review template with reviewer details and real evidence for all pending checks."
        : "If deployment is desired, use a separate exact approval and target confirmation before any deploy run."
  };
}

function renderReport(packet) {
  const pendingList =
    packet.manual_checks_pending.length > 0
      ? packet.manual_checks_pending.map((check) => `- ${check}`).join("\n")
      : "- None";
  const missingReviewerFields =
    packet.missing_reviewer_fields.length > 0
      ? packet.missing_reviewer_fields.map((field) => `- ${field}`).join("\n")
      : "- None";

  return `# SIRINX Website Manual Review Gate

Status: ${packet.status}
Date: ${packet.created_at}
Mode: ${packet.mode}
Deploy gate: ${packet.deploy_gate}
Push gate: ${packet.push_gate}
Completion claim allowed: ${packet.completion_claim_allowed ? "yes" : "no"}

## Purpose

This local validator reads the manual review result template and blocks deploy/push claims until real human evidence is recorded. It does not deploy and does not approve production changes by itself.

## Manual Check Summary

- Total manual checks: ${packet.manual_checks_total}
- Passed manual checks: ${packet.manual_checks_passed}
- Exact deploy approval present: ${packet.exact_deploy_approval_present}
- Ready-for-discussion checkbox checked: ${packet.ready_for_deploy_discussion_checked}
- Deploy approval checkbox checked: ${packet.deploy_approval_checkbox_checked}

## Pending Manual Checks

${pendingList}

## Missing Reviewer Fields

${missingReviewerFields}

## Closed Gates

${packet.closed_gates.map((gate) => `- ${gate}`).join("\n")}

## Next Safe Action

${packet.next_safe_action}

This validator is not push approval and not deploy approval.
`;
}

export async function collectManualReviewGate() {
  const [manualReviewMarkdown, reviewBoardPacket] = await Promise.all([
    readFile(resolve(repoRoot, manualReviewPath), "utf8"),
    readFile(resolve(repoRoot, reviewBoardPacketPath), "utf8").then(JSON.parse)
  ]);

  return evaluateManualReviewGate({ manualReviewMarkdown, reviewBoardPacket });
}

export async function writeManualReviewGate() {
  const packet = await collectManualReviewGate();
  await mkdir(resolve(repoRoot, dirname(reportPath)), { recursive: true });
  await mkdir(resolve(repoRoot, dirname(packetPath)), { recursive: true });
  await writeFile(resolve(repoRoot, reportPath), renderReport(packet), "utf8");
  await writeFile(resolve(repoRoot, packetPath), `${JSON.stringify(packet, null, 2)}\n`, "utf8");
  return packet;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const packet = await writeManualReviewGate();
  console.log(JSON.stringify(packet, null, 2));
}
