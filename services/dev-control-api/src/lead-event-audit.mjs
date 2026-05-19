import { qualifyLead } from "./lead-qualification.mjs";

const modelVersion = "2026-05-20.lead-event-audit.v1";

const defaultLeadPayload = {
  source: "assessment",
  name: "High Load Home Office Owner",
  phone: "0812345678",
  email: "owner@example.invalid",
  monthlyBill: "18,000",
  systemType: "hybrid solar with BESS",
  bessInterest: "backup",
  timeline: "this month",
  utmSource: "google",
  utmMedium: "cpc",
  utmCampaign: "home-solution-high-load",
  landingPage: "/home-solution/",
  referrer: "https://www.google.com",
  deviceType: "mobile",
  message: "Large home office needs backup power and high-load solar assessment."
};

function stringValue(value) {
  return String(value || "").trim();
}

function boolFromValue(value) {
  return Boolean(stringValue(value));
}

function contactEvidence(lead) {
  return {
    hasPhone: boolFromValue(lead.phone),
    hasEmail: boolFromValue(lead.email),
    hasLineUserId: boolFromValue(lead.lineUserId),
    contactChannelCount: [lead.phone, lead.email, lead.lineUserId].filter(boolFromValue).length,
    rawContactValuesStored: false
  };
}

function buildEventId(qualification) {
  return `lead-audit-preview-${qualification.workflowLane}-${qualification.packageLane}`;
}

function buildBlockedExternalActions(qualification) {
  return [
    {
      id: "crm-write",
      target: "CRM / ClickUp / Notion / Google Sheet",
      status: "blocked-approval-required",
      reason: "Exact target workspace/list/page is required before writing lead records."
    },
    {
      id: "supabase-write",
      target: "Supabase customer or lead table",
      status: "blocked-approval-required",
      reason: "Schema, migration plan, RLS review, and target project approval are required before database writes."
    },
    {
      id: "production-lead-post",
      target: "https://www.sirinx.co/api/trpc/lead.submit?batch=1",
      status: "blocked-approval-required",
      reason: "Production POST creates real lead records and must use a controlled approved smoke payload."
    },
    {
      id: "customer-message-send",
      target: "Telegram / LINE / email / phone follow-up",
      status: "blocked-approval-required",
      reason: "Recipient, template, and send approval are required before customer-visible messages."
    }
  ].map((action) => ({
    ...action,
    externalWrites: false,
    customerVisible: action.id === "customer-message-send",
    requiresHumanApproval: true,
    relatedWorkflowLane: qualification.workflowLane
  }));
}

function buildEvidenceChecklist(qualification) {
  const baseItems = [
    {
      id: "contact-channel",
      label: "At least one valid contact channel",
      status: qualification.contactChannelCount > 0 ? "present-local" : "missing",
      requiredBefore: "CRM handoff"
    },
    {
      id: "bill-photo",
      label: "Electricity bill photo or verified monthly bill",
      status: qualification.monthlyBill > 0 ? "estimated-from-intake" : "missing",
      requiredBefore: "proposal assumptions"
    },
    {
      id: "load-profile",
      label: "Daytime/nighttime load split and air-conditioner count",
      status: "required-next",
      requiredBefore: "ROI and battery sizing"
    },
    {
      id: "site-survey",
      label: "Roof/carport/site photo, phase type, and backup load list",
      status: "required-next",
      requiredBefore: "engineer-reviewed quote"
    },
    {
      id: "pea-inverter-smartlist",
      label: "PEA Smartlist inverter model verification",
      status: "required-next",
      requiredBefore: "customer-facing proposal"
    },
    {
      id: "crm-target-approval",
      label: "Exact CRM/SaaS target and write approval",
      status: "blocked-approval-required",
      requiredBefore: "external CRM write"
    },
    {
      id: "production-post-approval",
      label: "Controlled production lead POST approval",
      status: "blocked-approval-required",
      requiredBefore: "production lead smoke test"
    }
  ];

  return baseItems.map((item) => ({
    ...item,
    externalWrites: false
  }));
}

function buildProfileRouting(qualification) {
  const routing = {
    "sales-engineering-review": {
      primaryProfile: "sales",
      supportProfiles: ["backend", "data", "qa", "solis"],
      commandCenterLane: "leads",
      backlogStatus: "ready-for-local-review"
    },
    "qualification-follow-up": {
      primaryProfile: "sales",
      supportProfiles: ["growth", "scribe"],
      commandCenterLane: "leads",
      backlogStatus: "needs-customer-clarification"
    },
    "nurture-and-education": {
      primaryProfile: "growth",
      supportProfiles: ["sales", "scribe"],
      commandCenterLane: "marketing",
      backlogStatus: "education-first"
    },
    "missing-contact-channel": {
      primaryProfile: "sales",
      supportProfiles: ["qa"],
      commandCenterLane: "blocked",
      backlogStatus: "blocked-missing-contact"
    }
  };

  return routing[qualification.workflowLane] || routing["qualification-follow-up"];
}

function normalizeLeadInput(input) {
  if (!input || Object.keys(input).length === 0) {
    return { ...defaultLeadPayload };
  }

  if (input.lead && typeof input.lead === "object") {
    return { ...input.lead };
  }

  return { ...input };
}

export function getDefaultLeadAuditPayload() {
  return { ...defaultLeadPayload };
}

export function getLeadEventAuditPreview(input = {}) {
  const lead = normalizeLeadInput(input);
  const qualification = qualifyLead(lead);
  const routing = buildProfileRouting(qualification);

  return {
    title: "SIRINX local lead event audit preview",
    mode: "local-lead-event-audit-only",
    status: "ready-local-lead-event-audit",
    modelVersion,
    externalWrites: false,
    productionWrites: false,
    productionPostProbeRun: false,
    crmWrites: false,
    supabaseWrites: false,
    customerVisible: false,
    leadEvent: {
      eventId: buildEventId(qualification),
      eventType: "lead.qualified.local_preview",
      source: qualification.attribution.source,
      landingPage: qualification.attribution.landingPage,
      monthlyBill: qualification.monthlyBill,
      solarSegment: qualification.solarSegment,
      packageLane: qualification.packageLane,
      workflowLane: qualification.workflowLane,
      priority: qualification.priority,
      score: qualification.score,
      trafficStatus: qualification.trafficStatus,
      contactEvidence: contactEvidence(lead),
      attribution: qualification.attribution,
      riskFlags: qualification.riskFlags,
      routing,
      allowedLocalUses: [
        "Command Center lead lane review",
        "proposal draft assumptions",
        "sales engineering backlog triage",
        "Obsidian evidence note planning"
      ]
    },
    qualification,
    evidenceChecklist: buildEvidenceChecklist(qualification),
    blockedExternalActions: buildBlockedExternalActions(qualification),
    approvalGates: [
      "Do not write CRM until exact target workspace/list/page is approved.",
      "Do not write Supabase until schema, RLS, migration, and target project are approved.",
      "Do not run production POST until a controlled smoke lead is explicitly approved.",
      "Do not send customer messages until recipient, template, and channel approval are present.",
      "Do not store raw contact values in audit evidence snapshots."
    ],
    nextActions: [
      qualification.nextAction,
      "Attach bill/load/site-survey evidence before proposal release.",
      "Use this audit preview as local evidence only; it is not a CRM, Supabase, or production write.",
      "If the lead is approved for handoff, create a separate target-specific approval packet first."
    ],
    updatedAt: new Date().toISOString()
  };
}

export { modelVersion as leadEventAuditModelVersion };
