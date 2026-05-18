import { readFile } from "node:fs/promises";
import { getLeadBackendHealth } from "./lead-health.mjs";
import { getSalesArtifactsStatus } from "./sales-artifacts.mjs";

const templatePath =
  "/Users/sirinx/Documents/Obsidian Vault/SIRINX/14_TEMPLATES/Residential Solar ESS Proposal Template.md";

const packageMap = {
  "on-grid-og5": { id: "OG-5", type: "on-grid", size: "5 kW", battery: "none", price: "129,000 THB" },
  "on-grid-og10": { id: "OG-10", type: "on-grid", size: "10 kW", battery: "none", price: "209,000 THB" },
  "hybrid-h5": { id: "H-5", type: "hybrid", size: "5 kW", battery: "16 kWh", price: "329,000 THB" },
  "hybrid-h10": { id: "H-10", type: "hybrid", size: "10 kW", battery: "32 kWh", price: "529,000 THB" },
  "hybrid-h15-engineered": { id: "H-15", type: "hybrid engineered", size: "15 kW 3-phase", battery: "48 kWh", price: "789,000 THB" },
  "hybrid-h20-engineered": { id: "H-20", type: "hybrid engineered", size: "20 kW 3-phase", battery: "64 kWh", price: "959,000 THB" }
};

function buildDraftMarkdown(leadHealth, salesArtifacts, template) {
  const qualification = leadHealth.qualificationModel || {};
  const packageInfo = packageMap[qualification.packageLane] || {
    id: "manual-review",
    type: "manual review",
    size: "pending",
    battery: "pending",
    price: "pending"
  };
  const templateSections = (template.match(/^##\s+.+$/gm) || []).map((line) => line.replace(/^##\s+/, ""));

  return `# Local Proposal Draft Preview - SIRINX Solar ESS

## Customer Summary

- Source: local Command Center health probe, not a real customer handoff.
- Qualification priority: ${qualification.priority || "unknown"}.
- Workflow lane: ${qualification.workflowLane || "unknown"}.
- Monthly bill signal: ${qualification.monthlyBill || 0} THB.
- Contact completeness: ${qualification.contactChannelCount || 0} channel(s).

## Recommended System

- Package lane: ${qualification.packageLane || "unknown"}.
- Package: ${packageInfo.id}.
- Type: ${packageInfo.type}.
- Inverter class: ${packageInfo.size}.
- Battery: ${packageInfo.battery}.
- Planning price: ${packageInfo.price}.

## Why This Package Fits

This draft is based on local qualification signals only. It indicates a high-load, backup/battery-oriented path when the lead score and package lane justify sales-engineering review.

## Savings Model

### Weak Case

Pending customer bill and load profile evidence.

### Realistic Case

Pending daytime/nighttime usage split, roof survey, and export-limit review.

### Best Case

Pending measured load behavior, high self-consumption, and verified battery cycling assumptions.

## Energy Independence Value

Battery value must be presented separately from financial ROI: outage protection, night usage, comfort, and long-term grid independence.

## Backup Scope

Pending critical-load list. Start with networking, selected lighting, refrigeration, water pump, and selected air-conditioning only after panel review.

## Equipment Approval Evidence

PEA Smartlist exact inverter verification is required before customer-facing proposal release.

## Installation Plan

Site survey required: phase type, roof area, shading, panel route, battery location, internet connectivity, and load-panel split.

## Risks And Exclusions

- This is a local draft preview, not a quote.
- No CRM write has been performed.
- No customer message has been sent.
- No production lead POST has been created.
- Proposal math requires review before external use.

## Next Action

${qualification.nextAction || "Review lead manually."}

## Local Artifact Evidence

- Sales artifacts readiness: ${salesArtifacts.status}.
- Proposal draft readiness: ${salesArtifacts.proposalDraftReadiness}.
- Template sections detected: ${templateSections.join(", ") || "none"}.
`;
}

export async function getProposalDraftPreview() {
  const [leadHealth, salesArtifacts, template] = await Promise.all([
    getLeadBackendHealth(),
    getSalesArtifactsStatus(),
    readFile(templatePath, "utf8")
  ]);
  const markdown = buildDraftMarkdown(leadHealth, salesArtifacts, template);

  return {
    title: "SIRINX local proposal draft preview",
    mode: "local-read-only-preview",
    status: salesArtifacts.proposalDraftReadiness === "ready-local-draft" ? "ready-local-preview" : "blocked-local-artifacts",
    externalWrites: false,
    productionWrites: false,
    customerVisible: false,
    sourceApis: ["/api/lead-health", "/api/sales-artifacts"],
    templatePath,
    qualification: leadHealth.qualificationModel,
    readiness: {
      salesArtifacts: salesArtifacts.status,
      proposalDraft: salesArtifacts.proposalDraftReadiness,
      artifactReadyCount: salesArtifacts.summary.ready,
      artifactTotal: salesArtifacts.summary.artifacts
    },
    draft: {
      title: "Local Proposal Draft Preview - SIRINX Solar ESS",
      markdown,
      sectionCount: (markdown.match(/^##\s+/gm) || []).length,
      byteLength: markdown.length
    },
    reviewGates: [
      "PEA inverter verification required before customer-facing proposal release.",
      "Site survey and bill evidence required before quote.",
      "Proposal math review required before external use.",
      "CRM writes and customer messages remain separately approval-gated."
    ],
    nextActions: [
      "Use this preview to review structure only.",
      "Run local ROI calculator with real customer assumptions before quote.",
      "Create a local markdown proposal file only after operator confirms target path."
    ],
    updatedAt: new Date().toISOString()
  };
}
