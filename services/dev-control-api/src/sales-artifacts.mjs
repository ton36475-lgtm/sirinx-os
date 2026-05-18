import { access, readFile } from "node:fs/promises";
import { basename } from "node:path";

const vaultRoot = process.env.SIRINX_OBSIDIAN_ROOT || "/Users/sirinx/Documents/Obsidian Vault/SIRINX";

const artifacts = [
  {
    id: "sales-dashboard",
    title: "Sales Engineering Dashboard",
    type: "dashboard",
    lane: "sales-engineering-review",
    path: "12_DASHBOARDS/Sales Engineering Dashboard.md",
    requiredText: ["Local Qualification Lanes", "qualificationModel.workflowLane"]
  },
  {
    id: "lead-lane-database",
    title: "Lead Qualification Lane Database",
    type: "database",
    lane: "all",
    path: "13_DATABASES/Lead Qualification Lane Database.md",
    requiredText: ["sales-engineering-review", "missing-contact-channel"]
  },
  {
    id: "proposal-template",
    title: "Residential Solar ESS Proposal Template",
    type: "template",
    lane: "proposal-draft",
    path: "14_TEMPLATES/Residential Solar ESS Proposal Template.md",
    requiredText: ["Savings Model", "Equipment Approval Evidence"]
  },
  {
    id: "proposal-workflow",
    title: "Residential ESS Proposal Workflow",
    type: "workflow",
    lane: "proposal-draft",
    path: "06_OPERATIONS/Residential ESS Proposal Workflow.md",
    requiredText: ["Proposal Sections", "Required Evidence Before Customer Release"]
  },
  {
    id: "qualification-workflow",
    title: "Residential ESS Sales Qualification Workflow",
    type: "workflow",
    lane: "qualification-follow-up",
    path: "06_OPERATIONS/Residential ESS Sales Qualification Workflow.md",
    requiredText: ["Intake Questions", "Routing"]
  },
  {
    id: "roi-assumptions",
    title: "Solar ROI Assumption Database",
    type: "database",
    lane: "proposal-draft",
    path: "13_DATABASES/Solar ROI Assumption Database.md",
    requiredText: ["Default Assumptions", "Effective residential tariff"]
  }
];

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function inspectArtifact(artifact) {
  const absolutePath = `${vaultRoot}/${artifact.path}`;
  const exists = await fileExists(absolutePath);
  const content = exists ? await readFile(absolutePath, "utf8") : "";
  const missingText = artifact.requiredText.filter((text) => !content.includes(text));
  const ready = exists && missingText.length === 0;

  return {
    ...artifact,
    absolutePath,
    fileName: basename(artifact.path),
    exists,
    ready,
    missingText,
    sizeBytes: content.length,
    externalWrites: false
  };
}

export async function getSalesArtifactsStatus() {
  const items = await Promise.all(artifacts.map(inspectArtifact));
  const readyItems = items.filter((item) => item.ready).length;
  const missingItems = items.filter((item) => !item.exists).length;
  const incompleteItems = items.filter((item) => item.exists && !item.ready).length;
  const proposalReady =
    items.find((item) => item.id === "proposal-template")?.ready &&
    items.find((item) => item.id === "proposal-workflow")?.ready &&
    items.find((item) => item.id === "roi-assumptions")?.ready;

  return {
    title: "SIRINX sales artifacts readiness",
    mode: "local-obsidian-read-only",
    vaultRoot,
    externalWrites: false,
    productionWrites: false,
    status: readyItems === items.length ? "ready-local" : "needs-local-artifact-review",
    proposalDraftReadiness: proposalReady ? "ready-local-draft" : "blocked-local-artifacts",
    summary: {
      artifacts: items.length,
      ready: readyItems,
      missing: missingItems,
      incomplete: incompleteItems
    },
    items,
    lanes: [
      "sales-engineering-review",
      "qualification-follow-up",
      "nurture-and-education",
      "missing-contact-channel",
      "proposal-draft"
    ],
    reviewGates: [
      "PEA inverter verification required before proposal release.",
      "Site survey assumptions required before quote.",
      "CRM writes require explicit target workspace/list approval.",
      "Customer messages require valid recipient and send approval."
    ],
    nextActions: proposalReady
      ? [
          "Use local proposal template with /api/lead-health qualification evidence.",
          "Attach PEA inverter verification before customer-facing proposal.",
          "Keep CRM/customer sends blocked until target approval."
        ]
      : [
          "Regenerate Obsidian sales artifacts.",
          "Review missing or incomplete local notes.",
          "Re-run GET /api/sales-artifacts before proposal drafting."
        ],
    updatedAt: new Date().toISOString()
  };
}
