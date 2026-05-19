const contractVersion = "2026-05-20.solar-ops-contract.v1";
const sourceRoot = "/Users/sirinx/restore-sources/github-audit/sirinx-solar-energy";

const entities = [
  {
    id: "lead",
    title: "Lead",
    sourceEntities: ["database.leads", "sirinx-app/src/services/leads.ts"],
    currentTarget: ["/api/lead-health", "/api/lead-event-audit", "lead-qualification.mjs"],
    purpose: "Website, assessment, chatbot, partner, and marketing lead intake before CRM handoff.",
    canonicalFields: [
      "id",
      "namePresent",
      "contactChannelEvidence",
      "source",
      "province",
      "monthlyBill",
      "systemType",
      "bessInterest",
      "utmAttribution",
      "score",
      "priority",
      "workflowLane",
      "packageLane",
      "riskFlags",
      "reasons",
      "createdAt",
      "updatedAt"
    ],
    localStatus: "implemented-partial",
    migrationStatus: "blocked-approval-required",
    writeGate: "Production lead POST, CRM, or Supabase writes require target-specific approval.",
    piiPolicy: "Store raw contact values only in approved lead store; audit views keep contact evidence only.",
    externalWrites: false
  },
  {
    id: "customer-profile",
    title: "Customer Profile",
    sourceEntities: ["database.customers", "sirinx-app/src/services/customers.ts", "sirinx-customer/src/**"],
    currentTarget: ["future CRM/customer profile module", "future customer.sirinx.co"],
    purpose: "Customer identity, consent, installed-system ownership, service status, and lifecycle state.",
    canonicalFields: [
      "id",
      "leadId",
      "customerType",
      "province",
      "consentState",
      "contactPolicy",
      "systemSizeKw",
      "batteryKwh",
      "installationDate",
      "servicePlan",
      "status"
    ],
    localStatus: "contract-only",
    migrationStatus: "blocked-approval-required",
    writeGate: "Requires CRM target, consent policy, auth boundary, and RLS review.",
    piiPolicy: "Do not expose raw phone/email in Command Center summaries.",
    externalWrites: false
  },
  {
    id: "installation-project",
    title: "Installation Project",
    sourceEntities: ["database.installations", "sirinx-app/src/services/installations.ts"],
    currentTarget: ["future project/install tracker", "proposal review packet", "ROI preview"],
    purpose: "Engineering, procurement, installation, commissioning, monitoring, savings, and ROI state.",
    canonicalFields: [
      "id",
      "customerId",
      "province",
      "systemSizeKw",
      "panelCount",
      "inverterModel",
      "batteryKwh",
      "totalCost",
      "monthlySavings",
      "roiYears",
      "npv",
      "irr",
      "status",
      "commissioningEvidence",
      "completedAt"
    ],
    localStatus: "contract-only",
    migrationStatus: "blocked-approval-required",
    writeGate: "Requires engineering evidence, approved inverter model, customer consent, and project owner approval.",
    piiPolicy: "Project records may reference customer IDs only until CRM/auth is approved.",
    externalWrites: false
  },
  {
    id: "contractor-profile",
    title: "Contractor Profile",
    sourceEntities: ["database.contractors", "sirinx-app/src/services/contractors.ts", "sirinx-contractor/src/**"],
    currentTarget: ["future contractor.sirinx.co", "field operations backlog"],
    purpose: "Installer eligibility, province coverage, checklist ownership, work evidence, and performance status.",
    canonicalFields: [
      "id",
      "company",
      "provinceCoverage",
      "rating",
      "jobsCompleted",
      "activeStatus",
      "assignedProjects",
      "checklistEvidence",
      "photoEvidencePolicy"
    ],
    localStatus: "contract-only",
    migrationStatus: "blocked-approval-required",
    writeGate: "Requires role-based auth, storage policy, contractor onboarding approval, and evidence retention policy.",
    piiPolicy: "Do not expose contractor private contacts before role/auth boundary review.",
    externalWrites: false
  },
  {
    id: "seo-page",
    title: "SEO / AEO Province Page",
    sourceEntities: ["database.seo_pages", "sirinx-app/src/app/solar/[province]/page.tsx", "sirinx-app/src/app/sitemap.ts"],
    currentTarget: ["protected public website SEO/AEO backlog", "growth profile lane"],
    purpose: "77-province metadata, local solar content, FAQ, schema, lead count, and publish status.",
    canonicalFields: [
      "province",
      "provinceTh",
      "slug",
      "title",
      "metaDescription",
      "faq",
      "schemaJsonLd",
      "keywords",
      "status",
      "views",
      "leadsGenerated",
      "publishedAt"
    ],
    localStatus: "contract-only",
    migrationStatus: "blocked-public-site-review",
    writeGate: "Public website routes and metadata require exact public-site task and SEO review.",
    piiPolicy: "No PII expected.",
    externalWrites: false
  },
  {
    id: "campaign",
    title: "Campaign",
    sourceEntities: ["database.campaigns", "sirinx-app/src/services/campaigns.ts"],
    currentTarget: ["marketing/CRM schema comparison", "growth profile lane"],
    purpose: "Marketing spend, source, lead generation, conversion, ROI, and attribution planning.",
    canonicalFields: [
      "id",
      "name",
      "channel",
      "budget",
      "spent",
      "leadsGenerated",
      "conversions",
      "roi",
      "status",
      "startedAt",
      "endedAt"
    ],
    localStatus: "contract-only",
    migrationStatus: "blocked-approval-required",
    writeGate: "Ad platform, CRM, ClickUp, Notion, or spreadsheet writes require exact target approval.",
    piiPolicy: "Campaign metrics must not contain raw customer identifiers.",
    externalWrites: false
  },
  {
    id: "agent-task",
    title: "Agent Task",
    sourceEntities: ["database.agent_tasks", "sirinx-app/src/services/agents.ts"],
    currentTarget: ["Command Center backlog", "47 Ronin active profile lanes", "Hermes approval queue"],
    purpose: "Local task planning, assigned agent profile, priority, status, result evidence, and revenue impact.",
    canonicalFields: [
      "id",
      "agentName",
      "agentLayer",
      "taskType",
      "description",
      "status",
      "priority",
      "revenueImpact",
      "resultEvidence",
      "startedAt",
      "completedAt"
    ],
    localStatus: "implemented-partial",
    migrationStatus: "blocked-approval-required",
    writeGate: "External project-management writes require ClickUp/Notion target approval.",
    piiPolicy: "Task result evidence must not include raw chat logs or secrets.",
    externalWrites: false
  },
  {
    id: "system-metric",
    title: "System Metric",
    sourceEntities: ["database.system_metrics", "sirinx-app/src/services/metrics.ts"],
    currentTarget: ["Command Center health cards", "proposal review", "external gate preflight"],
    purpose: "Local KPI, health, conversion, lead, project, and agent-readiness metrics.",
    canonicalFields: [
      "id",
      "metricName",
      "metricValue",
      "metricUnit",
      "agentName",
      "recordedAt",
      "evidenceSource"
    ],
    localStatus: "implemented-partial",
    migrationStatus: "blocked-approval-required",
    writeGate: "External analytics/database writes require schema and target approval.",
    piiPolicy: "Metrics must be aggregate or non-identifying.",
    externalWrites: false
  }
];

const relationships = [
  ["lead", "can_promote_to", "customer-profile"],
  ["customer-profile", "owns", "installation-project"],
  ["installation-project", "may_assign", "contractor-profile"],
  ["seo-page", "generates", "lead"],
  ["campaign", "generates", "lead"],
  ["agent-task", "acts_on", "lead"],
  ["agent-task", "acts_on", "installation-project"],
  ["system-metric", "summarizes", "lead"],
  ["system-metric", "summarizes", "installation-project"]
].map(([from, type, to]) => ({ from, type, to, externalWrites: false }));

const blockedImports = [
  {
    id: "supabase-service-import",
    source: "sirinx-app/src/lib/supabase.ts and service insert/update/delete functions",
    reason: "Runtime target, credentials, RLS, and schema ownership are not approved.",
    replacement: "Use this local contract plus read-only Command Center previews."
  },
  {
    id: "database-schema-apply",
    source: "database/schema.sql",
    reason: "The schema includes broad service-role policies and cannot be applied without migration/RLS review.",
    replacement: "Create a SIRINX-owned migration after entity contract approval."
  },
  {
    id: "legacy-mock-pii-copy",
    source: "MOCK_* records in service files",
    reason: "Mock phone/email/person names are not needed in SIRINX OS and should not become memory.",
    replacement: "Keep only structural fields and non-identifying examples."
  },
  {
    id: "cloudflare-worker-deploy",
    source: "cloudflare/worker-*",
    reason: "Worker routes may overlap current public website and require Cloudflare approval.",
    replacement: "Route ownership review before any code import."
  }
].map((item) => ({
  ...item,
  status: "blocked",
  externalWrites: false,
  requiresHumanApproval: true
}));

export function getSolarOpsContract() {
  return {
    title: "SIRINX solar operations entity contract",
    mode: "local-entity-contract-only",
    status: "ready-local-solar-ops-contract",
    contractVersion,
    sourceRepo: {
      name: "sirinx-solar-energy",
      root: sourceRoot,
      reviewedAs: "read-only-audit-source",
      externalWrites: false
    },
    externalWrites: false,
    productionWrites: false,
    supabaseWrites: false,
    cloudflareWrites: false,
    customerVisible: false,
    summary: {
      entities: entities.length,
      relationships: relationships.length,
      blockedImports: blockedImports.length,
      implementedPartial: entities.filter((entity) => entity.localStatus === "implemented-partial").length,
      contractOnly: entities.filter((entity) => entity.localStatus === "contract-only").length,
      migrationReady: false
    },
    entities,
    relationships,
    blockedImports,
    acceptanceGates: [
      "Do not run Supabase inserts, updates, deletes, migrations, or generated SQL from the source repo.",
      "Do not copy legacy mock PII into SIRINX OS memory, docs, API responses, or tests.",
      "Do not deploy Cloudflare worker sketches until route ownership and approval are complete.",
      "Do not expose customer or contractor portals until auth, role boundary, storage, and RLS are reviewed.",
      "Map every future database field back to a SIRINX-owned entity contract before migration."
    ],
    nextActions: [
      "Use this contract as the local schema boundary for future Supabase/RLS planning.",
      "Wire a read-only Command Center summary only if operations visibility is needed.",
      "Create a separate migration design after CRM/customer/contractor ownership is approved.",
      "Keep current public lead D1 path unchanged until an exact production task says otherwise."
    ],
    updatedAt: new Date().toISOString()
  };
}

export { contractVersion as solarOpsContractVersion };
