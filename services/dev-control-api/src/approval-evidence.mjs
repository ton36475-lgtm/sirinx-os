import { mkdir, writeFile } from "node:fs/promises";
import { listApprovalQueue } from "./approval-queue.mjs";

const approvalEvidenceRoot =
  "/Users/sirinx/Documents/Obsidian Vault/SIRINX/06_OPERATIONS/Approval Evidence Snapshots";

function timestampForFile(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeMarkdownCell(value) {
  return String(value || "").replace(/\|/g, "/").replace(/\n/g, " ");
}

function summarize(queue) {
  const totals = queue.totals || {};

  return {
    items: queue.items?.length || 0,
    pending: totals.pending || 0,
    approved: totals.approved || 0,
    rejected: totals.rejected || 0,
    blocked: totals.blocked || 0,
    externalWrites: false
  };
}

export function getApprovalEvidenceSnapshot() {
  const queue = listApprovalQueue();
  const summary = summarize(queue);

  return {
    title: "SIRINX approval evidence snapshot",
    mode: "local-approval-evidence-only",
    status: "ready-local-approval-evidence",
    externalWrites: false,
    productionWrites: false,
    customerVisible: false,
    targetRoot: approvalEvidenceRoot,
    summary,
    items: queue.items || [],
    nextActions: [
      "Review pending and blocked approvals before any external gate action.",
      "Treat this snapshot as evidence only, not approval.",
      "Use exact per-target approval phrases before deploy, push, send, Solis, Cloudflare, Supabase, or production work."
    ],
    updatedAt: new Date().toISOString()
  };
}

function buildApprovalEvidenceFile(snapshot) {
  return `---
title: "SIRINX Approval Evidence Snapshot"
created: ${new Date().toISOString()}
status: ${snapshot.status}
system: SIRINX
generated_by: sirinx-approval-evidence-writer
external_writes: false
customer_visible: false
approval_items: ${snapshot.summary.items}
pending_approvals: ${snapshot.summary.pending}
blocked_approvals: ${snapshot.summary.blocked}
---

# SIRINX Approval Evidence Snapshot

## Summary

- Status: ${snapshot.status}
- Approval items: ${snapshot.summary.items}
- Pending: ${snapshot.summary.pending}
- Approved: ${snapshot.summary.approved}
- Rejected: ${snapshot.summary.rejected}
- Blocked: ${snapshot.summary.blocked}
- External writes: ${snapshot.externalWrites}
- Customer visible: ${snapshot.customerVisible}

## Approval Queue

| ID | Action | Status | Risk | Source | Reason |
| --- | --- | --- | --- | --- | --- |
${snapshot.items.map((item) => `| ${escapeMarkdownCell(item.id)} | ${escapeMarkdownCell(item.action)} | ${escapeMarkdownCell(item.status)} | ${escapeMarkdownCell(item.riskLevel)} | ${escapeMarkdownCell(item.source)} | ${escapeMarkdownCell(item.reason)} |`).join("\n")}

## Evidence

${snapshot.items.map((item) => `### ${item.action}

- Action ID: ${item.actionId}
- Status: ${item.status}
- Risk: ${item.riskLevel}
- Requested by: ${item.requestedBy || "unknown"}
- Requested at: ${item.requestedAt || "unknown"}
- Evidence:
${(item.evidence || []).map((entry) => `  - ${entry}`).join("\n") || "  - none"}
`).join("\n")}

## Required Next Actions

${snapshot.nextActions.map((item) => `- ${item}`).join("\n")}

## Guardrail

This snapshot is a local evidence artifact. It is not approval to deploy, push, write CRM, send Telegram/LINE, send customers, call Solis, mutate Cloudflare, run database migrations, call Supabase, create production leads, read secrets, or write to external SaaS.
`;
}

export async function writeApprovalEvidenceSnapshot(options = {}) {
  const snapshot = getApprovalEvidenceSnapshot();
  const stamp = timestampForFile();
  const targetPath = `${approvalEvidenceRoot}/SIRINX Approval Evidence Snapshot ${stamp}.md`;
  const content = buildApprovalEvidenceFile(snapshot);
  const payload = {
    title: "SIRINX approval evidence snapshot writer",
    mode: "local-file-write-gated",
    externalWrites: false,
    productionWrites: false,
    customerVisible: false,
    targetRoot: approvalEvidenceRoot,
    targetPath,
    didWrite: false,
    dryRun: Boolean(options.dryRun),
    requiresConfirmLocalWrite: true,
    status: "pending-confirmation",
    summary: snapshot.summary,
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
      reason: "Set confirmLocalWrite=true to write a local Obsidian approval evidence snapshot."
    };
  }

  await mkdir(approvalEvidenceRoot, { recursive: true });
  await writeFile(targetPath, content, { encoding: "utf8", flag: "wx" });

  return {
    ...payload,
    status: "written-local",
    didWrite: true,
    byteLength: content.length
  };
}
