import { mkdir, writeFile } from "node:fs/promises";
import { getExternalGatePackets } from "./external-gate-packets.mjs";

const preflightRoot =
  "/Users/sirinx/Documents/Obsidian Vault/SIRINX/06_OPERATIONS/External Gate Audit Preflight";

const preflightRules = {
  "gate-1-github-pr-push": {
    status: "ready-for-targeted-approval",
    reviewState: "reviewed",
    owner: "devops",
    blockingReason: "",
    evidenceRequired: [
      "Local git status is clean.",
      "PR target is ton36475-lgtm/sirinx PR #1.",
      "Exact approval phrase and rollback rule are visible before push."
    ],
    nextLocalAction: "Wait for exact Gate 1 phrase, then run push/PR commands only for the named target."
  },
  "gate-2-coderabbit-review": {
    status: "blocked-prerequisite",
    reviewState: "blocked",
    owner: "qa",
    blockingReason: "Requires Gate 1 push/PR state to be current before CodeRabbit review threads are authoritative.",
    evidenceRequired: [
      "PR #1 is updated.",
      "Review status is no longer stale.",
      "Autofix proposals are shown as local diff before any commit."
    ],
    nextLocalAction: "Keep CodeRabbit as inspect-only until PR branch is pushed and review target is current."
  },
  "gate-3a-cloudflare-preview": {
    status: "blocked-prerequisite",
    reviewState: "blocked",
    owner: "devops",
    blockingReason: "Requires current PR/build artifact and explicit preview-only target before Cloudflare preview work.",
    evidenceRequired: [
      "Preview target is not production.",
      "Build artifact path is recorded.",
      "Homepage live background lock is recorded."
    ],
    nextLocalAction: "Prepare preview command only after PR/build status is clean."
  },
  "gate-3b-cloudflare-production": {
    status: "blocked-prerequisite",
    reviewState: "blocked",
    owner: "devops",
    blockingReason: "Requires approved preview result and rollback deployment target before production deployment.",
    evidenceRequired: [
      "Cloudflare preview passed.",
      "Rollback deployment is recorded.",
      "Production smoke matrix is ready."
    ],
    nextLocalAction: "Do not deploy production until preview evidence and rollback target are attached."
  },
  "gate-4-codex-mobile-pairing": {
    status: "manual-human-gate",
    reviewState: "reviewed",
    owner: "shogun",
    blockingReason: "QR/MFA pairing must be completed by the human operator on the Mac and phone.",
    evidenceRequired: [
      "Same ChatGPT account/workspace on host and phone.",
      "Codex host appears on ChatGPT mobile.",
      "Mac stays online and awake."
    ],
    nextLocalAction: "Open Codex App on Mac and complete QR/MFA pairing manually."
  },
  "gate-5-telegram-line-target": {
    status: "blocked-target-required",
    reviewState: "blocked",
    owner: "backend",
    blockingReason: "Chat target and LINE webhook target are not confirmed; delivery is unsafe.",
    evidenceRequired: [
      "Confirmed recipient has messaged the bot or joined the intended chat.",
      "Token value is never printed.",
      "One smoke send target is explicitly named."
    ],
    nextLocalAction: "Collect target metadata without sending until the exact recipient is confirmed."
  },
  "gate-6-openai-key": {
    status: "blocked-exact-confirmation-required",
    reviewState: "blocked",
    owner: "backend",
    blockingReason: "OpenAI key creation requires the exact key name, path, and storage confirmation.",
    evidenceRequired: [
      "Exact approval phrase is present.",
      ".env.local is ignored.",
      "Key value will not be printed or committed."
    ],
    nextLocalAction: "Use secure OpenAI key flow only after exact phrase is repeated."
  },
  "gate-7-supabase-schema-draft": {
    status: "ready-for-targeted-approval",
    reviewState: "reviewed",
    owner: "data",
    blockingReason: "",
    evidenceRequired: [
      "Read-only schema/config inspection only.",
      "No migration, seed, RLS mutation, or data write.",
      "Local migration plan includes rollback notes."
    ],
    nextLocalAction: "Wait for exact Gate 7 phrase, then inspect schema read-only and draft local plan."
  },
  "gate-8-solis-readonly-telemetry": {
    status: "blocked-consent-required",
    reviewState: "blocked",
    owner: "solis",
    blockingReason: "Customer consent, credential storage path, station mapping, and engineer signoff are missing.",
    evidenceRequired: [
      "Written consent exists.",
      "Credential storage path is defined without printing credentials.",
      "Read-only smoke excludes control/schedule/export-limit commands."
    ],
    nextLocalAction: "Prepare local telemetry checklist; do not call Solis until consent and credentials are approved."
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
    title: "SIRINX external gate audit preflight",
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
      "Resolve blocked entries by collecting the named target, consent, rollback, or prerequisite evidence.",
      "Move one gate at a time from ready-for-targeted-approval to execution only after the exact gate phrase is supplied."
    ],
    updatedAt: new Date().toISOString()
  };
}

function buildExternalGatePreflightFile(preflight) {
  return `---
title: "SIRINX External Gate Audit Preflight"
created: ${new Date().toISOString()}
status: ${preflight.status}
system: SIRINX
generated_by: sirinx-external-gate-preflight-writer
external_writes: false
can_execute_now: false
entry_count: ${preflight.summary.entries}
blocked_entries: ${preflight.summary.blocked}
ready_for_targeted_approval: ${preflight.summary.readyForTargetedApproval}
---

# SIRINX External Gate Audit Preflight

## Summary

- Status: ${preflight.status}
- Entries: ${preflight.summary.entries}
- Reviewed: ${preflight.summary.reviewed}
- Blocked: ${preflight.summary.blocked}
- Ready for targeted approval: ${preflight.summary.readyForTargetedApproval}
- Manual human gates: ${preflight.summary.manualHumanGates}
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
  const targetPath = `${preflightRoot}/SIRINX External Gate Audit Preflight ${stamp}.md`;
  const content = buildExternalGatePreflightFile(preflight);
  const payload = {
    title: "SIRINX external gate audit preflight writer",
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
