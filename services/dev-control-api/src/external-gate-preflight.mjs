import { mkdir, writeFile } from "node:fs/promises";
import { getExternalGatePackets } from "./external-gate-packets.mjs";

const preflightRoot =
  "/Users/sirinx/Documents/Obsidian Vault/SIRINX/06_OPERATIONS/External Gate Audit Preflight";

const preflightRules = {
  "gate-codex-mobile-qr-mfa": {
    status: "manual-human-gate",
    reviewState: "reviewed",
    owner: "shogun",
    blockingReason: "QR/MFA pairing must be completed by the human operator on the Mac and phone.",
    evidenceRequired: [
      "Same ChatGPT account/workspace on host and phone.",
      "Codex host appears in ChatGPT mobile.",
      "Mac stays online and awake."
    ],
    currentEvidence: [
      "Local runbooks exist.",
      "Hermes pairing list currently reports no pending pairings."
    ],
    nextLocalAction: "Open Codex App on Mac and complete QR/MFA pairing manually."
  },
  "gate-telegram-line-target-token": {
    status: "blocked-target-and-token-required",
    reviewState: "blocked",
    owner: "backend",
    blockingReason:
      "Messaging target, credential rotation/confirmation, and LINE webhook verification are not complete.",
    evidenceRequired: [
      "Confirmed Telegram recipient has messaged the bot or joined the intended chat.",
      "Token value is never printed.",
      "LINE OA webhook signature verification exists before any LINE send.",
      "One smoke send target is explicitly named."
    ],
    currentEvidence: [
      "Hermes gateway is running.",
      "Hermes status reports Telegram configured with home target 8719485384, but delivery is not proven.",
      "/Users/sirinx/.local/bin/hermes-telegram-test --help attempted a Telegram request and returned 403; do not run it again until credential and target are confirmed.",
      "No production-safe LINE adapter is confirmed in the current handoff."
    ],
    nextLocalAction: "Rotate or confirm Telegram credential and recipient target; prepare LINE OA webhook verification."
  },
  "gate-solis-readonly-telemetry": {
    status: "blocked-consent-credential-mapping-required",
    reviewState: "blocked",
    owner: "solis",
    blockingReason:
      "Customer consent, SolisCloud credentials, station mapping, and engineer signoff are missing.",
    evidenceRequired: [
      "Written customer/site consent exists.",
      "Credential storage path is defined without printing credentials.",
      "Station, inverter, logger, meter, and customer/site mapping are known.",
      "Read-only smoke excludes control, schedule, export-limit, battery dispatch, and load commands."
    ],
    currentEvidence: [
      "Solis policy exists in read-only/dry-run mode.",
      "Local safety engine exists and does not call SolisCloud.",
      "No verified live Solis telemetry adapter has been approved in this flow."
    ],
    nextLocalAction: "Collect consent, credential storage path, and station mapping before any Solis API call."
  },
  "gate-cloudflare-bot-management-review": {
    status: "optional-official-review",
    reviewState: "reviewed",
    owner: "devops",
    blockingReason:
      "Production PageSpeed gate is mitigated by CSP, but official Bot Management/WAF policy review still needs Cloudflare permission.",
    evidenceRequired: [
      "Current CSP allowlist remains live.",
      "Public pages do not load /cdn-cgi/challenge-platform/scripts/jsd/main.js.",
      "Admin/API/auth/webhook/telemetry routes are not loosened.",
      "Rollback path is recorded before any dashboard/API security rule change."
    ],
    currentEvidence: [
      "Production CSP mitigation is live.",
      "Homepage mobile Lighthouse reached performance 76 with TBT 30ms and CLS 0.",
      "Home Solution mobile Lighthouse reached performance 77 with TBT 10ms and CLS 0."
    ],
    nextLocalAction:
      "Keep CSP mitigation unless Cloudflare dashboard/API Bot Management write permission is available for a reversible official rule."
  }
};

function timestampForFile(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeMarkdownCell(value) {
  return String(value || "").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function summarize(entries) {
  return {
    entries: entries.length,
    reviewed: entries.filter((entry) => entry.reviewState === "reviewed").length,
    blocked: entries.filter((entry) => entry.reviewState === "blocked").length,
    readyForTargetedApproval: entries.filter((entry) => entry.status === "ready-for-targeted-approval").length,
    optionalOfficialReview: entries.filter((entry) => entry.status === "optional-official-review").length,
    manualHumanGates: entries.filter((entry) => entry.status === "manual-human-gate").length,
    canExecuteNow: entries.filter((entry) => entry.canExecuteNow).length,
    externalWrites: entries.some((entry) => entry.externalWrites)
  };
}

function buildEntry(packet) {
  const rule = preflightRules[packet.id] || {
    status: "blocked-unmapped",
    reviewState: "blocked",
    owner: "shogun",
    blockingReason: "Packet is not mapped to a local preflight rule.",
    evidenceRequired: ["Add a local preflight rule before external action."],
    currentEvidence: [],
    nextLocalAction: "Map this packet before execution."
  };

  return {
    id: packet.id,
    packetId: packet.id,
    gate: packet.gate,
    title: packet.title,
    owner: rule.owner,
    status: rule.status,
    reviewState: rule.reviewState,
    target: packet.target,
    approvalPhrase: packet.approvalPhrase,
    action: packet.action,
    rollback: packet.rollback,
    verificationCommands: packet.verificationCommands,
    stopRule: packet.stopRule,
    blockingReason: rule.blockingReason,
    evidenceRequired: rule.evidenceRequired,
    currentEvidence: rule.currentEvidence,
    nextLocalAction: rule.nextLocalAction,
    canExecuteNow: false,
    externalWrites: false,
    productionWrites: false,
    customerVisible: false,
    auditOnly: true
  };
}

export function getExternalGatePreflight() {
  const packetSet = getExternalGatePackets();
  const entries = packetSet.packets.map(buildEntry);

  return {
    title: "SIRINX current external gate audit preflight",
    mode: "local-audit-preflight",
    status: "ready-local-preflight",
    externalWrites: false,
    productionWrites: false,
    customerVisible: false,
    canExecuteNow: false,
    preflightTargetRoot: preflightRoot,
    packetStatus: packetSet.status,
    summary: summarize(entries),
    entries,
    nextActions: [
      "Use this preflight as local evidence only; it is not permission to execute external work.",
      "Complete Codex Mobile QR/MFA manually before using the phone as the approval surface.",
      "Resolve blocked entries by collecting the named recipient, credential, consent, station mapping, or Cloudflare permission.",
      "Move one gate at a time only after the exact gate phrase is supplied."
    ],
    updatedAt: new Date().toISOString()
  };
}

function buildExternalGatePreflightFile(preflight) {
  return `---
title: "SIRINX Current External Gate Audit Preflight"
created: ${new Date().toISOString()}
status: ${preflight.status}
system: SIRINX
generated_by: sirinx-external-gate-preflight-writer
external_writes: false
can_execute_now: false
entry_count: ${preflight.summary.entries}
blocked_entries: ${preflight.summary.blocked}
manual_human_gates: ${preflight.summary.manualHumanGates}
optional_official_review: ${preflight.summary.optionalOfficialReview}
---

# SIRINX Current External Gate Audit Preflight

## Summary

- Status: ${preflight.status}
- Entries: ${preflight.summary.entries}
- Reviewed: ${preflight.summary.reviewed}
- Blocked: ${preflight.summary.blocked}
- Manual human gates: ${preflight.summary.manualHumanGates}
- Optional official review: ${preflight.summary.optionalOfficialReview}
- Can execute now: ${preflight.canExecuteNow}
- External writes: ${preflight.externalWrites}

## Gate Table

| Gate | Title | Owner | Status | Review State | Blocking Reason |
| --- | --- | --- | --- | --- | --- |
${preflight.entries.map((entry) => `| ${escapeMarkdownCell(entry.gate)} | ${escapeMarkdownCell(entry.title)} | ${escapeMarkdownCell(entry.owner)} | ${escapeMarkdownCell(entry.status)} | ${escapeMarkdownCell(entry.reviewState)} | ${escapeMarkdownCell(entry.blockingReason || "none")} |`).join("\n")}

## Gate Details

${preflight.entries.map((entry) => `### ${entry.gate}: ${entry.title}

- Owner: ${entry.owner}
- Status: ${entry.status}
- Review state: ${entry.reviewState}
- Target: ${entry.target}
- Can execute now: ${entry.canExecuteNow}
- External writes: ${entry.externalWrites}
- Blocking reason: ${entry.blockingReason || "none"}
- Next local action: ${entry.nextLocalAction}
- Current evidence:
${entry.currentEvidence.map((item) => `  - ${item}`).join("\n") || "  - none"}
- Evidence required:
${entry.evidenceRequired.map((item) => `  - ${item}`).join("\n")}
- Verification commands:
${entry.verificationCommands.map((command) => `  - ${command}`).join("\n")}
- Stop rule: ${entry.stopRule}
`).join("\n")}

## Guardrail

This preflight file is local audit evidence only. It is not approval to push, deploy, mutate Cloudflare, create keys, inspect secrets, write Supabase, send Telegram/LINE, call Solis, or write to any external SaaS.
`;
}

export async function writeExternalGatePreflight(options = {}) {
  const preflight = getExternalGatePreflight();
  const stamp = timestampForFile();
  const targetPath = `${preflightRoot}/SIRINX Current External Gate Audit Preflight ${stamp}.md`;
  const content = buildExternalGatePreflightFile(preflight);
  const payload = {
    title: "SIRINX current external gate audit preflight writer",
    mode: "local-file-write-gated",
    externalWrites: false,
    productionWrites: false,
    customerVisible: false,
    targetRoot: preflightRoot,
    targetPath,
    didWrite: false,
    dryRun: Boolean(options.dryRun),
    requiresConfirmLocalWrite: true,
    status: "pending-confirmation",
    canExecuteNow: false,
    summary: preflight.summary,
    updatedAt: new Date().toISOString()
  };

  if (options.dryRun) {
    return {
      ...payload,
      status: "dry-run-ready",
      wouldWrite: true,
      byteLength: content.length
    };
  }

  if (options.confirmLocalWrite !== true) {
    return {
      ...payload,
      status: "blocked-confirm-local-write-required",
      wouldWrite: false,
      reason: "Set confirmLocalWrite=true to write a local Obsidian external gate preflight file."
    };
  }

  await mkdir(preflightRoot, { recursive: true });
  await writeFile(targetPath, content, { encoding: "utf8", flag: "wx" });

  return {
    ...payload,
    status: "written-local",
    didWrite: true,
    byteLength: content.length
  };
}
