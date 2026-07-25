import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(here, "..");
const repoRoot = resolve(siteRoot, "..", "..");

const manualReviewPath = "docs/website/SIRINX_WEBSITE_MANUAL_REVIEW_RESULT_TEMPLATE_2026-07-03.md";
const checklistPath = "docs/website/SIRINX_WEBSITE_HUMAN_REVIEW_CHECKLIST_2026-07-03.md";
const manualGatePacketPath = "_A2A_QUEUE/outbox/packet_062_sirinx_website_manual_review_gate.json";
const githubLivePacketPath = "_A2A_QUEUE/outbox/packet_065_sirinx_website_github_live_local_recheck_automation.json";
const lineQrPacketPath = "_A2A_QUEUE/outbox/packet_066_sirinx_website_line_qr_link_recheck.json";
const reportPath = "docs/website/SIRINX_WEBSITE_MANUAL_REVIEW_INTAKE_2026-07-03.md";
const packetPath = "_A2A_QUEUE/outbox/packet_067_sirinx_website_manual_review_intake.json";

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

function missingSnippets(content, snippets) {
  return snippets.filter((snippet) => !content.includes(snippet));
}

export function evaluateManualReviewIntake({
  createdAt,
  manualReviewMarkdown,
  checklistMarkdown,
  manualGatePacket,
  githubLivePacket,
  lineQrPacket
}) {
  const manualRows = parseManualEvidenceRows(manualReviewMarkdown);
  const pendingManualRows = manualRows.filter((row) => row.status.toLowerCase() !== "passed");
  const manualReviewRequiredSnippets = [
    "pnpm --filter @sirinx/site test:line`: passed, 106 Playwright checks",
    "pnpm --filter @sirinx/site review:github-live",
    "pnpm --filter @sirinx/site review:line-qr",
    "packet_065",
    "packet_066"
  ];
  const checklistRequiredSnippets = [
    "pnpm --filter @sirinx/site test:line`: passed, 106 Playwright checks",
    "pnpm --filter @sirinx/site review:github-live",
    "pnpm --filter @sirinx/site review:line-qr",
    "packet_065",
    "packet_066",
    "Confirm primary CTA routes to `/contact?interest=solar-carport`"
  ];
  const staleChecklistSnippets = [
    "70 Playwright checks",
    "Confirm primary CTA routes to `/quote`"
  ];
  const missingManualReviewSnippets = missingSnippets(manualReviewMarkdown, manualReviewRequiredSnippets);
  const missingChecklistSnippets = missingSnippets(checklistMarkdown, checklistRequiredSnippets);
  const staleChecklistMatches = staleChecklistSnippets.filter((snippet) => checklistMarkdown.includes(snippet));
  const docsFresh =
    missingManualReviewSnippets.length === 0 &&
    missingChecklistSnippets.length === 0 &&
    staleChecklistMatches.length === 0;
  const companionEvidenceReady =
    githubLivePacket.status === "GITHUB_LIVE_LOCAL_RECHECK_READY_LOCAL_REVIEW_TARGET_CONFIRMED" &&
    lineQrPacket.status === "LINE_QR_LINK_RECHECK_READY_PENDING_REAL_DEVICE_SCAN";
  const status =
    docsFresh && companionEvidenceReady
      ? "MANUAL_REVIEW_INTAKE_READY_PENDING_HUMAN_INPUT"
      : "MANUAL_REVIEW_INTAKE_REQUIRES_ATTENTION";

  return {
    packet_id: "packet_067_sirinx_website_manual_review_intake",
    created_at: createdAt,
    lane: "codex_builder",
    mode: "local_only_manual_review_intake_no_push_no_deploy",
    scope: "apps/sirinx-site",
    status,
    manual_review_template: manualReviewPath,
    human_review_checklist: checklistPath,
    manual_checks_total: manualRows.length,
    manual_checks_pending: pendingManualRows.map((row) => row.check),
    manual_gate_status: manualGatePacket.status,
    manual_gate_deploy_gate: manualGatePacket.deploy_gate,
    github_live_local_status: githubLivePacket.status,
    line_qr_link_status: lineQrPacket.status,
    docs_fresh: docsFresh,
    missing_manual_review_snippets: missingManualReviewSnippets,
    missing_checklist_snippets: missingChecklistSnippets,
    stale_checklist_matches: staleChecklistMatches,
    completion_claim_allowed: false,
    deploy_gate: "BLOCKED_FOR_DEPLOY",
    push_gate: "BLOCKED_UNTIL_EXPLICIT_PUSH_APPROVAL",
    closed_gates: closedGates,
    report: reportPath,
    next_safe_action:
      "Human reviewer fills the manual review result template with real visual review, real-device QR scan, and existing bot/contact behavior evidence."
  };
}

function renderReport(packet) {
  const pendingRows =
    packet.manual_checks_pending.length > 0
      ? packet.manual_checks_pending.map((check) => `- ${check}`).join("\n")
      : "- None";
  const missingManual =
    packet.missing_manual_review_snippets.length > 0
      ? packet.missing_manual_review_snippets.map((snippet) => `- \`${snippet}\``).join("\n")
      : "- None";
  const missingChecklist =
    packet.missing_checklist_snippets.length > 0
      ? packet.missing_checklist_snippets.map((snippet) => `- \`${snippet}\``).join("\n")
      : "- None";
  const staleChecklist =
    packet.stale_checklist_matches.length > 0
      ? packet.stale_checklist_matches.map((snippet) => `- \`${snippet}\``).join("\n")
      : "- None";

  return `# SIRINX Website Manual Review Intake

Status: ${packet.status}
Date: ${packet.created_at}
Scope: \`${packet.scope}\`
Mode: ${packet.mode}
Completion claim allowed: ${packet.completion_claim_allowed ? "yes" : "no"}
Deploy gate: \`${packet.deploy_gate}\`
Push gate: \`${packet.push_gate}\`

## Purpose

This packet checks whether the manual review checklist and manual result template are current with the latest automated evidence. It prepares the human review lane, but does not perform the review and does not approve deploy.

## Current Evidence State

- Manual gate status: \`${packet.manual_gate_status}\`
- Manual gate deploy gate: \`${packet.manual_gate_deploy_gate}\`
- GitHub/live/local recheck: \`${packet.github_live_local_status}\`
- LINE QR/link recheck: \`${packet.line_qr_link_status}\`
- Manual checks total: ${packet.manual_checks_total}
- Docs fresh: ${packet.docs_fresh ? "yes" : "no"}

## Pending Manual Checks

${pendingRows}

## Missing Manual Template Snippets

${missingManual}

## Missing Checklist Snippets

${missingChecklist}

## Stale Checklist Matches

${staleChecklist}

## Closed Gates

${packet.closed_gates.map((gate) => `- ${gate}`).join("\n")}

## Next Safe Action

${packet.next_safe_action}

This intake packet is not deploy approval and not push approval.
`;
}

async function readJson(path) {
  return JSON.parse(await readFile(resolve(repoRoot, path), "utf8"));
}

export async function writeManualReviewIntake() {
  const [manualReviewMarkdown, checklistMarkdown, manualGatePacket, githubLivePacket, lineQrPacket] =
    await Promise.all([
      readFile(resolve(repoRoot, manualReviewPath), "utf8"),
      readFile(resolve(repoRoot, checklistPath), "utf8"),
      readJson(manualGatePacketPath),
      readJson(githubLivePacketPath),
      readJson(lineQrPacketPath)
    ]);
  const packet = evaluateManualReviewIntake({
    createdAt: nowBangkok(),
    manualReviewMarkdown,
    checklistMarkdown,
    manualGatePacket,
    githubLivePacket,
    lineQrPacket
  });

  await mkdir(resolve(repoRoot, dirname(reportPath)), { recursive: true });
  await mkdir(resolve(repoRoot, dirname(packetPath)), { recursive: true });
  await writeFile(resolve(repoRoot, reportPath), renderReport(packet), "utf8");
  await writeFile(resolve(repoRoot, packetPath), `${JSON.stringify(packet, null, 2)}\n`, "utf8");
  return packet;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const packet = await writeManualReviewIntake();
  console.log(JSON.stringify(packet, null, 2));
}
