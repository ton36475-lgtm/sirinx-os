const contractVersion = "2026-05-20.lead-crm-handoff-contract.v1";

const sourceRepos = [
  {
    name: "automated-marketing-agency",
    usefulConcepts: ["campaign performance", "lead status", "lead score reason", "external CRM id mapping"],
    rejectedConcepts: ["direct CRM credential fields", "direct ad-platform credential fields", "generic agency assumptions"]
  },
  {
    name: "chokma-growth-os",
    usefulConcepts: ["UTM attribution", "lead events", "automation runs", "follow-up profile", "deterministic risk flags"],
    rejectedConcepts: ["legacy non-solar value tiers", "broadcast-send queue", "non-solar conversion event names"]
  }
].map((repo) => ({ ...repo, externalWrites: false }));

const sirinxLeadGroups = [
  {
    id: "contact",
    canonicalFields: ["name", "phone", "email", "lineUserId", "telegramHandle"],
    auditProjection: "contactChannelEvidence",
    piiPolicy: "Raw values stay in approved lead store only; local audit/CRM preview exposes presence counts."
  },
  {
    id: "solar-qualification",
    canonicalFields: ["monthlyBill", "systemType", "bessInterest", "backupPriority", "phaseType", "roofArea", "timeline"],
    auditProjection: "qualificationModel",
    piiPolicy: "No private customer credentials or bill images are stored in local preview."
  },
  {
    id: "attribution",
    canonicalFields: ["utmSource", "utmMedium", "utmCampaign", "utmContent", "utmTerm", "referrer", "landingPage", "deviceType"],
    auditProjection: "leadEvent.attribution",
    piiPolicy: "Attribution must not include raw cookies, click IDs, or ad-platform access credentials."
  },
  {
    id: "quality",
    canonicalFields: ["score", "priority", "workflowLane", "packageLane", "trafficStatus", "solarSegment", "riskFlags", "reasons"],
    auditProjection: "leadEvent.routing",
    piiPolicy: "Reasons must be deterministic and domain-specific; no unsupported customer claims."
  },
  {
    id: "audit",
    canonicalFields: ["leadEvents", "automationRuns", "lastContactedAt", "reviewNotes", "approvalEvidence"],
    auditProjection: "blockedExternalActions and evidenceChecklist",
    piiPolicy: "Events are append-only summaries; no raw chat logs, message bodies, or secrets."
  }
].map((group) => ({ ...group, externalWrites: false }));

const sourceFieldMappings = [
  {
    source: "automated-marketing-agency.leads",
    keep: ["name parts", "email", "phone", "company", "source", "status", "score", "score reason", "notes"],
    mapTo: ["contact", "attribution", "quality", "audit"],
    rewrite: "Convert generic status and score reason into SIRINX workflow lane, package lane, deterministic reasons, and risk flags."
  },
  {
    source: "automated-marketing-agency.campaigns",
    keep: ["objective", "status", "budget", "spend", "audience", "kpi goals", "ROAS", "CPA", "impressions", "clicks", "conversions"],
    mapTo: ["attribution", "campaign"],
    rewrite: "Keep as campaign analytics context only; no ad-platform write dependency."
  },
  {
    source: "chokma-growth-os.leads",
    keep: ["campaign link", "contact channels", "source type", "landing page", "referrer", "device type", "UTM fields", "primary intent", "predicted value score", "acquisition cost"],
    mapTo: ["contact", "attribution", "quality", "audit"],
    rewrite: "Rewrite value tiers and intent into solar segments: residential, high-load home office, C&I, hotel, factory, EV/BESS."
  },
  {
    source: "chokma-growth-os.leadEvents",
    keep: ["page view", "form submit", "contact", "status change", "note added", "AI action"],
    mapTo: ["audit"],
    rewrite: "Reject customer-message send events until Telegram/LINE/email approval exists."
  },
  {
    source: "chokma-growth-os.customerProfiles",
    keep: ["assigned owner", "follow-up status", "segment label", "last contact", "next follow-up"],
    mapTo: ["audit", "future customer profile"],
    rewrite: "Rewrite into solar customer lifecycle after CRM/customer data policy is approved."
  },
  {
    source: "chokma-growth-os.automationRuns",
    keep: ["module", "status", "target entity", "planned actions", "actual actions", "expected result", "actual result", "review notes"],
    mapTo: ["audit", "Command Center backlog"],
    rewrite: "Use as local execution evidence only; no autonomous external action."
  }
].map((mapping) => ({ ...mapping, externalWrites: false }));

const rejectedRuntimeDependencies = [
  {
    id: "direct-crm-credential-fields",
    reason: "Credential fields belong in approved secret storage, never schema comparison or local memory."
  },
  {
    id: "direct-ad-platform-credential-fields",
    reason: "Ad platform access requires separate connector approval and must not be a lead entity dependency."
  },
  {
    id: "broadcast-send-queue",
    reason: "Messaging queues are customer-visible and remain blocked until Telegram/LINE/email recipient and send gates pass."
  },
  {
    id: "old-domain-statuses",
    reason: "Non-solar conversion statuses must be rewritten into SIRINX solar lifecycle states."
  },
  {
    id: "mysql-direct-migration",
    reason: "Old MySQL/Drizzle schemas are reference only; SIRINX database target and RLS are not approved."
  }
].map((item) => ({
  ...item,
  status: "blocked",
  externalWrites: false,
  requiresHumanApproval: true
}));

const handoffStages = [
  {
    id: "local-intake",
    title: "Local intake and safe production GET health",
    ownerProfile: "backend",
    currentApi: "/api/lead-health",
    externalWriteAllowed: false,
    approvalRequired: false
  },
  {
    id: "local-qualification",
    title: "Lead qualification v2",
    ownerProfile: "sales",
    currentApi: "/api/lead-health",
    externalWriteAllowed: false,
    approvalRequired: false
  },
  {
    id: "local-audit-preview",
    title: "Lead event audit preview",
    ownerProfile: "sales",
    currentApi: "/api/lead-event-audit",
    externalWriteAllowed: false,
    approvalRequired: false
  },
  {
    id: "target-specific-approval",
    title: "Target-specific CRM/SaaS approval packet",
    ownerProfile: "shogun",
    currentApi: "/api/approval-queue",
    externalWriteAllowed: false,
    approvalRequired: true
  },
  {
    id: "external-crm-write",
    title: "External CRM/Supabase/Notion/ClickUp handoff",
    ownerProfile: "data",
    currentApi: "not-enabled",
    externalWriteAllowed: false,
    approvalRequired: true
  }
];

export function getLeadCrmContract() {
  return {
    title: "SIRINX lead CRM handoff contract",
    mode: "local-schema-comparison-only",
    status: "ready-local-lead-crm-contract",
    contractVersion,
    externalWrites: false,
    productionWrites: false,
    crmWrites: false,
    supabaseWrites: false,
    customerVisible: false,
    summary: {
      sourceRepos: sourceRepos.length,
      sirinxLeadGroups: sirinxLeadGroups.length,
      sourceFieldMappings: sourceFieldMappings.length,
      rejectedRuntimeDependencies: rejectedRuntimeDependencies.length,
      handoffStages: handoffStages.length,
      databaseWorkReady: false
    },
    sourceRepos,
    sirinxLeadGroups,
    sourceFieldMappings,
    rejectedRuntimeDependencies,
    handoffStages,
    acceptanceGates: [
      "Do not migrate old MySQL/Drizzle schemas.",
      "Do not store CRM or ad-platform credentials in lead schema, docs, or memory.",
      "Do not enable broadcast/customer-message queues without recipient and send approval.",
      "Do not write external CRM/Supabase/Notion/ClickUp until target workspace/table/list/page is approved.",
      "Do not convert local scoring into customer-facing claims or quotes without sales/engineering review."
    ],
    nextActions: [
      "Use /api/lead-event-audit as the evidence packet before any CRM handoff.",
      "Create a target-specific approval packet before any external CRM or database write.",
      "Design SIRINX-owned database/RLS schema only after this contract is reviewed.",
      "Keep public lead D1/main-router path unchanged until an exact production task says otherwise."
    ],
    updatedAt: new Date().toISOString()
  };
}

export { contractVersion as leadCrmContractVersion };
