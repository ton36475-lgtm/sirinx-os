import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(here, "..");
const repoRoot = resolve(siteRoot, "..", "..");

const manualReviewPath = "docs/website/SIRINX_WEBSITE_MANUAL_REVIEW_RESULT_TEMPLATE_2026-07-03.md";
const reportPath = "docs/website/SIRINX_WEBSITE_MANUAL_REVIEW_EVIDENCE_CONTRACT_2026-07-03.md";
const packetPath = "_A2A_QUEUE/outbox/packet_069_sirinx_website_manual_review_evidence_contract.json";

const requiredChecks = [
  "Local homepage visual review",
  "Local `/line` visual review",
  "Local `/contact` visual review",
  "Local `/projects` visual review",
  "Local `/trust-center` visual review",
  "Local `/quote` visual review",
  "Local `/roi-calculator` visual review",
  "Desktop floating LINE dock review",
  "Mobile contact tray review",
  "Real-device LINE QR scan",
  "Confirm QR opens `SIRINX โซล่าเซลล์`",
  "Confirm Add LINE target",
  "Confirm Chat target",
  "Existing bot / inquiry path behavior",
  "Confirm LINE did not replace existing inquiry path",
  "Keyboard skip-link spot check",
  "Mobile overlap / layout spot check"
];

const reviewerFields = ["Reviewer name", "Review date", "Device/browser", "Network context"];
const decisionLabels = [
  "Not ready for deploy review. Required fixes",
  "Ready for deploy approval discussion, but deploy is not approved by this checkbox",
  "Deploy approval granted separately with exact phrase"
];
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
  return reviewerFields.map((field) => {
    const line = markdown.split("\n").find((candidate) => candidate.trim().startsWith(`- ${field}:`)) || "";
    const value = line.replace(new RegExp(`^\\s*-\\s*${field}:\\s*`), "").trim();

    return {
      field,
      present: value.length > 0
    };
  });
}

function checkedDecision(markdown, label) {
  return markdown.split("\n").some((line) => line.includes("[x]") && line.includes(label));
}

function hasExactDeployApproval(markdown) {
  return /APPROVE_DEPLOY_SIRINX_SITE_\d{4}-\d{2}-\d{2}/.test(markdown);
}

function hasMeaningfulEvidence(row) {
  const value = row.evidence.trim();
  return value.length >= 12 && !/^(n\/a|na|none|ไม่มี|-|pending)$/i.test(value);
}

function unique(values) {
  return [...new Set(values)];
}

export function evaluateManualReviewEvidenceContract({ createdAt, manualReviewMarkdown }) {
  const rows = parseManualEvidenceRows(manualReviewMarkdown);
  const rowNames = rows.map((row) => row.check);
  const duplicateChecks = unique(rowNames.filter((check, index) => rowNames.indexOf(check) !== index));
  const missingRequiredChecks = requiredChecks.filter((check) => !rowNames.includes(check));
  const unexpectedChecks = rowNames.filter((check) => !requiredChecks.includes(check));
  const pendingRows = rows.filter((row) => row.status.toLowerCase() !== "passed");
  const passedRows = rows.filter((row) => row.status.toLowerCase() === "passed");
  const passedWithoutEvidence = passedRows.filter((row) => !hasMeaningfulEvidence(row)).map((row) => row.check);
  const reviewerFieldResults = parseReviewerFields(manualReviewMarkdown);
  const missingReviewerFields = reviewerFieldResults.filter((field) => !field.present).map((field) => field.field);
  const checkedDecisions = decisionLabels.filter((label) => checkedDecision(manualReviewMarkdown, label));
  const exactDeployApprovalPresent = hasExactDeployApproval(manualReviewMarkdown);
  const deployApprovalCheckboxChecked = checkedDecisions.includes("Deploy approval granted separately with exact phrase");
  const decisionConflict = checkedDecisions.length > 1;
  const deployApprovalContradiction = deployApprovalCheckboxChecked && !exactDeployApprovalPresent;
  const exactApprovalBeforeManualComplete =
    exactDeployApprovalPresent &&
    (pendingRows.length > 0 ||
      passedWithoutEvidence.length > 0 ||
      missingReviewerFields.length > 0 ||
      missingRequiredChecks.length > 0 ||
      unexpectedChecks.length > 0 ||
      duplicateChecks.length > 0);
  const templateContractValid =
    missingRequiredChecks.length === 0 &&
    unexpectedChecks.length === 0 &&
    duplicateChecks.length === 0 &&
    !decisionConflict &&
    !deployApprovalContradiction;
  const humanEvidenceComplete =
    templateContractValid &&
    pendingRows.length === 0 &&
    passedWithoutEvidence.length === 0 &&
    missingReviewerFields.length === 0;

  let status = "MANUAL_REVIEW_EVIDENCE_CONTRACT_READY_PENDING_HUMAN_EVIDENCE";
  if (!templateContractValid || exactApprovalBeforeManualComplete || passedWithoutEvidence.length > 0) {
    status = "MANUAL_REVIEW_EVIDENCE_CONTRACT_REQUIRES_ATTENTION";
  } else if (humanEvidenceComplete && exactDeployApprovalPresent) {
    status = "MANUAL_REVIEW_EVIDENCE_COMPLETE_APPROVAL_RECORDED_LOCAL_ONLY";
  } else if (humanEvidenceComplete) {
    status = "MANUAL_REVIEW_EVIDENCE_COMPLETE_READY_FOR_APPROVAL_DISCUSSION";
  }

  return {
    packet_id: "packet_069_sirinx_website_manual_review_evidence_contract",
    created_at: createdAt,
    lane: "codex_builder",
    mode: "local_only_manual_review_evidence_contract_no_push_no_deploy",
    scope: "apps/sirinx-site",
    status,
    manual_review_template: manualReviewPath,
    required_checks_count: requiredChecks.length,
    manual_checks_total: rows.length,
    manual_checks_pending: pendingRows.map((row) => row.check),
    manual_checks_passed: passedRows.length,
    missing_required_checks: missingRequiredChecks,
    unexpected_checks: unexpectedChecks,
    duplicate_checks: duplicateChecks,
    passed_without_evidence: passedWithoutEvidence,
    missing_reviewer_fields: missingReviewerFields,
    checked_decisions: checkedDecisions,
    decision_conflict: decisionConflict,
    deploy_approval_checkbox_checked: deployApprovalCheckboxChecked,
    exact_deploy_approval_present: exactDeployApprovalPresent,
    exact_approval_before_manual_complete: exactApprovalBeforeManualComplete,
    human_evidence_complete: humanEvidenceComplete,
    completion_claim_allowed: false,
    deploy_gate: exactDeployApprovalPresent
      ? "EXACT_APPROVAL_RECORDED_STILL_NO_DEPLOY_RUN"
      : "BLOCKED_FOR_DEPLOY",
    push_gate: "BLOCKED_UNTIL_EXPLICIT_PUSH_APPROVAL",
    closed_gates: closedGates,
    report: reportPath,
    next_safe_action:
      "Human reviewer fills the manual review template with reviewer fields, real evidence for every passed item, real-device LINE QR scan, and existing bot/contact behavior proof."
  };
}

function renderList(items) {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- None";
}

function renderReport(packet) {
  return `# SIRINX Website Manual Review Evidence Contract

Status: ${packet.status}
Date: ${packet.created_at}
Scope: \`${packet.scope}\`
Mode: ${packet.mode}
Completion claim allowed: ${packet.completion_claim_allowed ? "yes" : "no"}
Deploy gate: \`${packet.deploy_gate}\`
Push gate: \`${packet.push_gate}\`

## Purpose

This contract makes the human review evidence machine-checkable before any deploy or push discussion. It does not perform human review, does not approve deploy, and does not collect customer data.

## Contract Summary

- Required manual checks: ${packet.required_checks_count}
- Manual checks in template: ${packet.manual_checks_total}
- Manual checks passed: ${packet.manual_checks_passed}
- Human evidence complete: ${packet.human_evidence_complete ? "yes" : "no"}
- Exact deploy approval present: ${packet.exact_deploy_approval_present ? "yes" : "no"}
- Exact approval before manual completion: ${packet.exact_approval_before_manual_complete ? "yes" : "no"}

## Pending Manual Checks

${renderList(packet.manual_checks_pending)}

## Missing Required Checks

${renderList(packet.missing_required_checks)}

## Unexpected Or Duplicate Checks

Unexpected:

${renderList(packet.unexpected_checks)}

Duplicate:

${renderList(packet.duplicate_checks)}

## Passed Items Without Evidence

${renderList(packet.passed_without_evidence)}

## Missing Reviewer Fields

${renderList(packet.missing_reviewer_fields)}

## Checked Decisions

${renderList(packet.checked_decisions)}

## Closed Gates

${packet.closed_gates.map((gate) => `- ${gate}`).join("\n")}

## Next Safe Action

${packet.next_safe_action}

This contract is not push approval and not deploy approval.
`;
}

export async function writeManualReviewEvidenceContract() {
  const manualReviewMarkdown = await readFile(resolve(repoRoot, manualReviewPath), "utf8");
  const packet = evaluateManualReviewEvidenceContract({
    createdAt: nowBangkok(),
    manualReviewMarkdown
  });

  await mkdir(resolve(repoRoot, dirname(reportPath)), { recursive: true });
  await mkdir(resolve(repoRoot, dirname(packetPath)), { recursive: true });
  await writeFile(resolve(repoRoot, reportPath), renderReport(packet), "utf8");
  await writeFile(resolve(repoRoot, packetPath), `${JSON.stringify(packet, null, 2)}\n`, "utf8");
  return packet;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const packet = await writeManualReviewEvidenceContract();
  console.log(JSON.stringify(packet, null, 2));
}
