import { mkdir, readFile, writeFile } from "node:fs/promises";
import { getLeadBackendHealth } from "./lead-health.mjs";
import { getRoiPreview } from "./roi-preview.mjs";
import { getSalesArtifactsStatus } from "./sales-artifacts.mjs";

const templatePath =
  "/Users/sirinx/Documents/Obsidian Vault/SIRINX/14_TEMPLATES/Residential Solar ESS Proposal Template.md";
const proposalDraftRoot =
  "/Users/sirinx/Documents/Obsidian Vault/SIRINX/05_PROJECTS/Proposal Drafts";

const packageMap = {
  "on-grid-og5": { id: "OG-5", type: "on-grid", size: "5 kW", battery: "none", price: "129,000 THB" },
  "on-grid-og10": { id: "OG-10", type: "on-grid", size: "10 kW", battery: "none", price: "209,000 THB" },
  "hybrid-h5": { id: "H-5", type: "hybrid", size: "5 kW", battery: "16 kWh", price: "329,000 THB" },
  "hybrid-h10": { id: "H-10", type: "hybrid", size: "10 kW", battery: "32 kWh", price: "529,000 THB" },
  "hybrid-h15-engineered": { id: "H-15", type: "hybrid engineered", size: "15 kW 3-phase", battery: "48 kWh", price: "789,000 THB" },
  "hybrid-h20-engineered": { id: "H-20", type: "hybrid engineered", size: "20 kW 3-phase", battery: "64 kWh", price: "959,000 THB" }
};

function buildRoiTable(roiPreview) {
  const cases = roiPreview.result?.cases || [];
  if (!cases.length) {
    return "ROI cases pending local calculation.";
  }

  return [
    "| Case | Self-consumption | Captured kWh/month | Monthly savings | Payback |",
    "|---|---:|---:|---:|---:|",
    ...cases.map((item) => {
      const payback = item.estimatedPaybackYears === null ? "n/a" : `${item.estimatedPaybackYears} years`;
      return `| ${item.name} | ${item.selfConsumption} | ${item.capturedKwh} | ${item.estimatedMonthlySavingsThb} THB | ${payback} |`;
    })
  ].join("\n");
}

function buildDraftMarkdown(leadHealth, salesArtifacts, template, roiPreview) {
  const qualification = leadHealth.qualificationModel || {};
  const packageInfo = packageMap[qualification.packageLane] || {
    id: "manual-review",
    type: "manual review",
    size: "pending",
    battery: "pending",
    price: "pending"
  };
  const templateSections = (template.match(/^##\s+.+$/gm) || []).map((line) => line.replace(/^##\s+/, ""));
  const roiPackage = roiPreview.result?.recommendedPackage || {};

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

This savings model is a local planning preview only. It must be replaced with reviewed customer bill, roof, phase, load profile, export-limit, and PEA approval evidence before any customer-facing proposal.

### Local ROI Planning Preview

- ROI endpoint: /api/roi-preview.
- ROI package: ${roiPackage.id || "unknown"}.
- Estimated monthly consumption: ${roiPreview.result?.estimatedMonthlyKwh || 0} kWh.
- Estimated monthly PV output: ${roiPreview.result?.estimatedMonthlyPvKwh || 0} kWh.

${buildRoiTable(roiPreview)}

### ROI Guardrail

Savings, ROI, payback, and cashflow are estimates, not guarantees. Battery resilience value is separate from financial payback.

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

function timestampForFile(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function buildProposalFile(preview) {
  return `---
title: "${preview.draft.title}"
created: ${new Date().toISOString()}
status: local-draft
system: SIRINX
generated_by: sirinx-local-proposal-draft-writer
external_writes: false
customer_visible: false
review_required: true
proposal_source: command-center
workflow_lane: ${preview.qualification?.workflowLane || "unknown"}
package_lane: ${preview.qualification?.packageLane || "unknown"}
---

${preview.draft.markdown}

## Review Gates Before External Use

${preview.reviewGates.map((gate) => `- ${gate}`).join("\n")}
`;
}

export async function getProposalDraftPreview() {
  const [leadHealth, salesArtifacts, template, roiPreview] = await Promise.all([
    getLeadBackendHealth(),
    getSalesArtifactsStatus(),
    readFile(templatePath, "utf8"),
    getRoiPreview()
  ]);
  const markdown = buildDraftMarkdown(leadHealth, salesArtifacts, template, roiPreview);

  return {
    title: "SIRINX local proposal draft preview",
    mode: "local-read-only-preview",
    status: salesArtifacts.proposalDraftReadiness === "ready-local-draft" ? "ready-local-preview" : "blocked-local-artifacts",
    externalWrites: false,
    productionWrites: false,
    customerVisible: false,
    sourceApis: ["/api/lead-health", "/api/sales-artifacts"],
    templatePath,
    safeWriteTargetRoot: proposalDraftRoot,
    qualification: leadHealth.qualificationModel,
    roiPreview: {
      status: roiPreview.status,
      recommendedPackage: roiPreview.result?.recommendedPackage?.id || "unknown",
      caseCount: roiPreview.result?.cases?.length || 0,
      externalWrites: roiPreview.externalWrites
    },
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

export async function writeLocalProposalDraft(options = {}) {
  const preview = await getProposalDraftPreview();
  const stamp = timestampForFile();
  const targetPath = `${proposalDraftRoot}/SIRINX Local Proposal Draft ${stamp}.md`;
  const payload = {
    title: "SIRINX local proposal draft writer",
    mode: "local-file-write-gated",
    externalWrites: false,
    productionWrites: false,
    customerVisible: false,
    targetRoot: proposalDraftRoot,
    targetPath,
    didWrite: false,
    dryRun: Boolean(options.dryRun),
    requiresConfirmLocalWrite: true,
    status: "pending-confirmation",
    reviewGates: preview.reviewGates,
    updatedAt: new Date().toISOString()
  };

  if (options.dryRun) {
    return {
      ...payload,
      status: "dry-run-ready",
      wouldWrite: true,
      byteLength: buildProposalFile(preview).length
    };
  }

  if (options.confirmLocalWrite !== true) {
    return {
      ...payload,
      status: "blocked-confirm-local-write-required",
      wouldWrite: false,
      reason: "Set confirmLocalWrite=true to write a local Obsidian proposal draft."
    };
  }

  await mkdir(proposalDraftRoot, { recursive: true });
  const content = buildProposalFile(preview);
  await writeFile(targetPath, content, { encoding: "utf8", flag: "wx" });

  return {
    ...payload,
    status: "written-local",
    didWrite: true,
    byteLength: content.length
  };
}
