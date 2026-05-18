const modelVersion = "2026-05-19.lead-qualification.v1";

function parseMonthlyBill(value) {
  if (value === undefined || value === null) return 0;
  const numeric = String(value).replace(/[^\d.]/g, "");
  return Number(numeric) || 0;
}

function includesAny(value, terms) {
  const text = String(value || "").toLowerCase();
  return terms.some((term) => text.includes(term));
}

function hasContactChannel(lead) {
  return Boolean(lead.phone || lead.email || lead.lineUserId);
}

function classifyPackageLane(monthlyBill, wantsBackupOrBattery) {
  if (wantsBackupOrBattery) {
    if (monthlyBill >= 16000) return "hybrid-h20-engineered";
    if (monthlyBill >= 10000) return "hybrid-h15-engineered";
    if (monthlyBill >= 6000) return "hybrid-h10";
    return "hybrid-h5";
  }

  if (monthlyBill >= 4000) return "on-grid-og10";
  return "on-grid-og5";
}

function classifyWorkflowLane(score, hasContact) {
  if (!hasContact) return "missing-contact-channel";
  if (score >= 70) return "sales-engineering-review";
  if (score >= 45) return "qualification-follow-up";
  return "nurture-and-education";
}

function nextActionForLane(lane) {
  const actions = {
    "sales-engineering-review": "Prepare site-survey checklist and engineer-reviewed proposal assumptions.",
    "qualification-follow-up": "Ask for bill photo, roof photo, phase type, backup expectation, and daytime/nighttime usage split.",
    "nurture-and-education": "Send education-first guidance; avoid ROI claims until bill/load data is clearer.",
    "missing-contact-channel": "Request at least one valid contact channel before CRM or customer follow-up."
  };
  return actions[lane] || "Review lead manually.";
}

export function qualifyLead(lead = {}) {
  const monthlyBill = parseMonthlyBill(lead.monthlyBill);
  const wantsBackupOrBattery =
    includesAny(lead.bessInterest, ["yes", "true", "battery", "bess", "ess", "hybrid", "backup"]) ||
    includesAny(lead.systemType, ["hybrid", "battery", "bess", "ess", "backup"]) ||
    includesAny(lead.interest, ["hybrid", "battery", "bess", "ess", "backup"]) ||
    includesAny(lead.message, ["hybrid", "battery", "bess", "ess", "backup", "ไฟดับ"]);
  const source = String(lead.source || "contact").toLowerCase();
  const contactChannelCount = [lead.phone, lead.email, lead.lineUserId].filter(Boolean).length;

  let score = 0;
  if (monthlyBill >= 10000) score += 35;
  else if (monthlyBill >= 6000) score += 28;
  else if (monthlyBill >= 4000) score += 18;
  else if (monthlyBill > 0) score += 8;

  if (wantsBackupOrBattery) score += 22;
  if (source === "assessment") score += 12;
  if (source === "partner") score += 8;
  if (lead.systemSize) score += 8;
  if (contactChannelCount >= 2) score += 10;
  else if (contactChannelCount === 1) score += 5;
  if (includesAny(lead.timeline, ["now", "urgent", "this month", "ทันที"])) score += 10;

  const priority = score >= 70 ? "hot" : score >= 45 ? "warm" : "nurture";
  const packageLane = classifyPackageLane(monthlyBill, wantsBackupOrBattery);
  const workflowLane = classifyWorkflowLane(score, hasContactChannel(lead));

  return {
    modelVersion,
    externalWrites: false,
    score,
    priority,
    workflowLane,
    packageLane,
    monthlyBill,
    wantsBackupOrBattery,
    contactChannelCount,
    nextAction: nextActionForLane(workflowLane),
    reviewGates: [
      "Do not write CRM without target workspace/list approval.",
      "Do not send customer messages without recipient and approval.",
      "Do not convert qualification into a quote until PEA inverter verification and site assumptions are reviewed."
    ]
  };
}

export { modelVersion as leadQualificationModelVersion };
