import { getLeadBackendHealth } from "./lead-health.mjs";
import { getProposalDraftPreview } from "./proposal-draft.mjs";
import { getRoiPreview } from "./roi-preview.mjs";
import { getSalesArtifactsStatus } from "./sales-artifacts.mjs";

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
