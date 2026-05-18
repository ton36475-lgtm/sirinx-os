import { mkdir, writeFile } from "node:fs/promises";
import { listApprovalQueue } from "./approval-queue.mjs";
import { listAuditEvents } from "./audit-events.mjs";
import { getProposalReviewStatus } from "./proposal-review.mjs";

const mobilePacketRoot =
  "/Users/sirinx/Documents/Obsidian Vault/SIRINX/06_OPERATIONS/Codex Mobile Review Packets";

function timestampForFile(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function approvalSummary(queue) {
  const totals = queue.totals || {};
  return {
    items: queue.items?.length || 0,
    pending: totals.pending || 0,
    approved: totals.approved || 0,
    rejected: totals.rejected || 0,
    blocked: totals.blocked || 0
  };
}

export async function getMobileReviewPacket() {
  const [proposalReview, approvalQueue, auditEvents] = await Promise.all([
    getProposalReviewStatus(),
    Promise.resolve(listApprovalQueue()),
    Promise.resolve(listAuditEvents())
  ]);
  const approvals = approvalSummary(approvalQueue);

  return {
    title: "SIRINX Codex Mobile review packet",
    mode: "local-mobile-review-only",
    status: "ready-local-mobile-review",
    externalWrites: false,
    productionWrites: false,
    customerVisible: false,
    mobileCanApproveExternally: false,
    reviewPacketTargetRoot: mobilePacketRoot,
    summary: {
      approvalItems: approvals.items,
      pendingApprovals: approvals.pending,
      blockedApprovals: approvals.blocked,
      proposalBlockingItems: proposalReview.summary.blockingExternalSend,
      auditEvents: auditEvents.items?.length || 0
    },
    proposalReview: {
      status: proposalReview.status,
      localWorkflowReady: proposalReview.localWorkflowReady,
      canSendExternally: proposalReview.canSendExternally,
      blockingExternalSend: proposalReview.summary.blockingExternalSend
    },
    approvals,
    approvalItems: approvalQueue.items || [],
    reviewCommands: [
      "Review proposal gate status.",
      "Review approval queue and blocked switches.",
      "Do not approve CRM/customer/production actions from this packet alone.",
      "Use exact per-gate approval phrases only when target, recipient, rollback, and verification are defined."
    ],
    nextActions: [
      "Use this packet as a mobile-readable local evidence bundle.",
      "Keep external writes blocked until a specific action packet is reviewed.",
      "Attach bill, site-survey, PEA verification, and math review before customer-facing proposal approval."
    ],
    updatedAt: new Date().toISOString()
  };
}

function buildMobileReviewPacket(packet) {
  return `---
title: "SIRINX Codex Mobile Review Packet"
created: ${new Date().toISOString()}
status: ${packet.status}
system: SIRINX
generated_by: sirinx-codex-mobile-review-packet-writer
external_writes: false
customer_visible: false
mobile_can_approve_externally: ${packet.mobileCanApproveExternally}
proposal_blocking_items: ${packet.summary.proposalBlockingItems}
pending_approvals: ${packet.summary.pendingApprovals}
---

# SIRINX Codex Mobile Review Packet

## Summary

- Status: ${packet.status}
- External writes: ${packet.externalWrites}
- Customer visible: ${packet.customerVisible}
- Mobile can approve externally from this packet alone: ${packet.mobileCanApproveExternally}
- Proposal review status: ${packet.proposalReview.status}
- Proposal blocking items: ${packet.proposalReview.blockingExternalSend}
- Pending approvals: ${packet.summary.pendingApprovals}
- Blocked approvals: ${packet.summary.blockedApprovals}
- Audit events loaded: ${packet.summary.auditEvents}

## Approval Queue

| Action | Status | Risk | Reason |
|---|---|---|---|
${packet.approvalItems.map((item) => `| ${item.action} | ${item.status} | ${item.riskLevel} | ${item.reason.replace(/\|/g, "/")} |`).join("\n")}

## Mobile Review Commands

${packet.reviewCommands.map((item) => `- ${item}`).join("\n")}

## Required Next Actions

${packet.nextActions.map((item) => `- ${item}`).join("\n")}

## Guardrail

This packet is local evidence for Codex Mobile review. It is not approval to deploy, push, write CRM, send customers, run production POST, mutate Cloudflare, call Supabase, call Solis, send Telegram/LINE, or write to external SaaS.
`;
}

export async function writeMobileReviewPacket(options = {}) {
  const packet = await getMobileReviewPacket();
  const stamp = timestampForFile();
  const targetPath = `${mobilePacketRoot}/SIRINX Codex Mobile Review Packet ${stamp}.md`;
  const content = buildMobileReviewPacket(packet);
  const payload = {
    title: "SIRINX Codex Mobile review packet writer",
    mode: "local-file-write-gated",
    externalWrites: false,
    productionWrites: false,
    customerVisible: false,
    targetRoot: mobilePacketRoot,
    targetPath,
    didWrite: false,
    dryRun: Boolean(options.dryRun),
    requiresConfirmLocalWrite: true,
    status: "pending-confirmation",
    mobileCanApproveExternally: packet.mobileCanApproveExternally,
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
      reason: "Set confirmLocalWrite=true to write a local Obsidian Codex Mobile review packet."
    };
  }

  await mkdir(mobilePacketRoot, { recursive: true });
  await writeFile(targetPath, content, { encoding: "utf8", flag: "wx" });

  return {
    ...payload,
    status: "written-local",
    didWrite: true,
    byteLength: content.length
  };
}
