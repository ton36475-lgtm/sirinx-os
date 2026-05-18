import { mkdir, writeFile } from "node:fs/promises";
import { getLeadBackendHealth } from "./lead-health.mjs";
import { getProposalDraftPreview } from "./proposal-draft.mjs";
import { getRoiPreview } from "./roi-preview.mjs";
import { getSalesArtifactsStatus } from "./sales-artifacts.mjs";

const reviewPacketRoot =
  "/Users/sirinx/Documents/Obsidian Vault/SIRINX/06_OPERATIONS/Proposal Review Packets";

function makeItem(id, title, detail, state, blocksExternalSend = true) {
  return {
    id,
    title,
    detail,
    state,
    complete: state === "complete",
    blocksExternalSend: blocksExternalSend && state !== "complete"
  };
}

function summarize(items) {
  return {
    items: items.length,
    complete: items.filter((item) => item.complete).length,
    missing: items.filter((item) => item.state === "missing").length,
    blocked: items.filter((item) => item.state === "blocked").length,
    reviewRequired: items.filter((item) => item.state === "review-required").length,
    blockingExternalSend: items.filter((item) => item.blocksExternalSend).length
  };
}

function timestampForFile(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function buildReviewPacket(status) {
  return `---
title: "SIRINX Proposal External Send Review Packet"
created: ${new Date().toISOString()}
status: ${status.status}
system: SIRINX
generated_by: sirinx-proposal-review-packet-writer
external_writes: false
customer_visible: false
can_send_externally: ${status.canSendExternally}
blocking_external_send: ${status.summary.blockingExternalSend}
---

# SIRINX Proposal External Send Review Packet

## Summary

- Status: ${status.status}
- Local workflow ready: ${status.localWorkflowReady}
- Can send externally: ${status.canSendExternally}
- Complete items: ${status.summary.complete}/${status.summary.items}
- Blocking external-send items: ${status.summary.blockingExternalSend}
- External writes: ${status.externalWrites}
- Customer visible: ${status.customerVisible}

## Checklist

| Item | State | Blocks External Send | Detail |
|---|---|---:|---|
${status.items.map((item) => `| ${item.title} | ${item.state} | ${item.blocksExternalSend ? "yes" : "no"} | ${item.detail.replace(/\|/g, "/")} |`).join("\n")}

## Required Next Actions

${status.nextActions.map((action) => `- ${action}`).join("\n")}

## Guardrail

This packet is a local review artifact. It is not approval to write CRM, send a customer message, run production POST smoke, deploy Cloudflare, edit DNS, call Supabase, call Solis, or write to any external SaaS.
`;
}

export async function getProposalReviewStatus() {
  const [leadHealth, salesArtifacts, roiPreview, proposalDraft] = await Promise.all([
    getLeadBackendHealth(),
    getSalesArtifactsStatus(),
    getRoiPreview(),
    getProposalDraftPreview()
  ]);

  const localReadyItems = [
    makeItem(
      "lead-local-self-test",
      "Lead backend local self-test",
      `${leadHealth.status}; production POST probe run: ${leadHealth.productionPostProbeRun}`,
      leadHealth.local?.ok ? "complete" : "blocked"
    ),
    makeItem(
      "sales-artifacts",
      "Sales artifacts",
      `${salesArtifacts.summary.ready}/${salesArtifacts.summary.artifacts} local artifacts ready`,
      salesArtifacts.status === "ready-local" ? "complete" : "blocked"
    ),
    makeItem(
      "roi-preview",
      "ROI preview",
      `${roiPreview.result?.recommendedPackage?.id || "unknown"} with ${roiPreview.result?.cases?.length || 0} savings cases`,
      roiPreview.status === "ready-local-roi-preview" ? "complete" : "blocked"
    ),
    makeItem(
      "proposal-draft-preview",
      "Proposal draft preview",
      `${proposalDraft.draft?.sectionCount || 0} sections; ROI metadata ${proposalDraft.roiPreview?.recommendedPackage || "unknown"}`,
      proposalDraft.status === "ready-local-preview" ? "complete" : "blocked"
    )
  ];

  const externalSendItems = [
    makeItem(
      "bill-load-evidence",
      "Customer bill and load evidence",
      "Real customer bill, daytime/nighttime split, and measured load profile are not attached to this local probe.",
      "missing"
    ),
    makeItem(
      "site-survey-evidence",
      "Site survey evidence",
      "Roof area, shading, cable route, phase type, load-panel split, and battery location still require field evidence.",
      "missing"
    ),
    makeItem(
      "pea-inverter-verification",
      "PEA inverter verification",
      "Exact inverter model must be verified against current official PEA Smartlist before customer-facing use.",
      "missing"
    ),
    makeItem(
      "proposal-math-review",
      "Proposal math review",
      "Senior engineer or sales engineer must review ROI/payback assumptions before external release.",
      "review-required"
    ),
    makeItem(
      "crm-target-approval",
      "CRM target approval",
      "CRM workspace/list/customer record target is not selected or approved.",
      "blocked"
    ),
    makeItem(
      "customer-message-approval",
      "Customer message approval",
      "Recipient, channel, message body, and send approval are not approved.",
      "blocked"
    ),
    makeItem(
      "production-lead-post-smoke",
      "Production lead POST smoke",
      "Production POST smoke test remains blocked; only safe GET probing is allowed in this local phase.",
      "blocked"
    )
  ];

  const items = [...localReadyItems, ...externalSendItems];
  const summary = summarize(items);

  return {
    title: "SIRINX proposal external-send review gate",
    mode: "local-review-only",
    status: summary.blockingExternalSend === 0 ? "ready-for-external-send-review" : "blocked-external-send",
    localWorkflowReady: localReadyItems.every((item) => item.complete),
    canSendExternally: false,
    externalWrites: false,
    productionWrites: false,
    customerVisible: false,
    reviewPacketTargetRoot: reviewPacketRoot,
    summary,
    items,
    nextActions: [
      "Attach real customer bill and load profile evidence.",
      "Attach site survey evidence for roof, shading, phase, load panel, and battery location.",
      "Verify exact inverter model against current official PEA Smartlist.",
      "Run senior proposal math review before external release.",
      "Keep CRM writes, customer messages, and production POST smoke separately approval-gated."
    ],
    updatedAt: new Date().toISOString()
  };
}

export async function writeProposalReviewPacket(options = {}) {
  const status = await getProposalReviewStatus();
  const stamp = timestampForFile();
  const targetPath = `${reviewPacketRoot}/SIRINX Proposal External Send Review Packet ${stamp}.md`;
  const content = buildReviewPacket(status);
  const payload = {
    title: "SIRINX proposal review packet writer",
    mode: "local-file-write-gated",
    externalWrites: false,
    productionWrites: false,
    customerVisible: false,
    targetRoot: reviewPacketRoot,
    targetPath,
    didWrite: false,
    dryRun: Boolean(options.dryRun),
    requiresConfirmLocalWrite: true,
    status: "pending-confirmation",
    reviewStatus: status.status,
    blockingExternalSend: status.summary.blockingExternalSend,
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
      reason: "Set confirmLocalWrite=true to write a local Obsidian proposal review packet."
    };
  }

  await mkdir(reviewPacketRoot, { recursive: true });
  await writeFile(targetPath, content, { encoding: "utf8", flag: "wx" });

  return {
    ...payload,
    status: "written-local",
    didWrite: true,
    byteLength: content.length
  };
}
