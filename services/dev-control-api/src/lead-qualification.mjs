const modelVersion = "2026-05-20.lead-qualification.v2";

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

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
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

function classifyTrafficStatus(score, riskFlags) {
  if (riskFlags.includes("suspicious-pattern-detected") || score < 35) return "suspicious";
  if (riskFlags.length > 0 || score < 60) return "review";
  return "trusted";
}

function classifySolarSegment(monthlyBill, packageLane, wantsBackupOrBattery) {
  if (monthlyBill >= 16000) return wantsBackupOrBattery ? "large-home-office-hybrid-bess" : "large-home-office-on-grid";
  if (monthlyBill >= 10000) return wantsBackupOrBattery ? "high-load-home-hybrid" : "high-load-home-on-grid";
  if (monthlyBill >= 6000) return wantsBackupOrBattery ? "residential-hybrid" : "residential-on-grid";
  return packageLane.includes("hybrid") ? "starter-backup-hybrid" : "starter-on-grid";
}

function detectRiskFlags(lead) {
  const riskFlags = [];
  const suspiciousPattern = /(bot|crawler|spider|headless|selenium|playwright|preview|localhost|127\.0\.0\.1|dummy|sample|testing|test lead)/i;
  const fields = [
    lead.name,
    lead.message,
    lead.referrer,
    lead.landingPage,
    lead.utmCampaign,
    lead.utmContent,
    lead.notes
  ].filter(Boolean);

  if (fields.some((value) => suspiciousPattern.test(String(value)))) {
    riskFlags.push("suspicious-pattern-detected");
  }
  if (!hasContactChannel(lead)) {
    riskFlags.push("missing-contact-channel");
  }
  if (normalizeText(lead.deviceType) === "unknown") {
    riskFlags.push("unknown-device-type");
  }
  return riskFlags;
}

export function qualifyLead(lead = {}) {
  const monthlyBill = parseMonthlyBill(lead.monthlyBill);
  const reasons = [];
  const attribution = {
    source: normalizeText(lead.source || "contact"),
    utmSource: normalizeText(lead.utmSource),
    utmMedium: normalizeText(lead.utmMedium),
    utmCampaign: normalizeText(lead.utmCampaign),
    landingPage: String(lead.landingPage || ""),
    referrer: String(lead.referrer || ""),
    deviceType: normalizeText(lead.deviceType || "")
  };
  const wantsBackupOrBattery =
    includesAny(lead.bessInterest, ["yes", "true", "battery", "bess", "ess", "hybrid", "backup"]) ||
    includesAny(lead.systemType, ["hybrid", "battery", "bess", "ess", "backup"]) ||
    includesAny(lead.interest, ["hybrid", "battery", "bess", "ess", "backup"]) ||
    includesAny(lead.message, ["hybrid", "battery", "bess", "ess", "backup", "ไฟดับ"]);
  const contactChannelCount = [lead.phone, lead.email, lead.lineUserId].filter(Boolean).length;
  const riskFlags = detectRiskFlags(lead);

  let score = 0;
  if (monthlyBill >= 10000) {
    score += 35;
    reasons.push("High monthly bill supports priority sales review.");
  } else if (monthlyBill >= 6000) {
    score += 28;
    reasons.push("Monthly bill fits mid/high residential solar package range.");
  } else if (monthlyBill >= 4000) {
    score += 18;
    reasons.push("Monthly bill fits entry on-grid or small hybrid package range.");
  } else if (monthlyBill > 0) {
    score += 8;
    reasons.push("Monthly bill is present but needs education-first sizing.");
  }

  if (wantsBackupOrBattery) {
    score += 22;
    reasons.push("Battery, BESS, hybrid, or backup intent is present.");
  }
  if (attribution.source === "assessment") {
    score += 12;
    reasons.push("Lead came from assessment flow.");
  }
  if (attribution.source === "partner") {
    score += 8;
    reasons.push("Partner source improves attribution trust.");
  }
  if (lead.systemSize) {
    score += 8;
    reasons.push("Lead includes a system-size signal.");
  }
  if (contactChannelCount >= 2) {
    score += 10;
    reasons.push("Multiple contact channels are available.");
  } else if (contactChannelCount === 1) {
    score += 5;
    reasons.push("One contact channel is available.");
  }
  if (includesAny(lead.timeline, ["now", "urgent", "this month", "ทันที"])) {
    score += 10;
    reasons.push("Timeline suggests near-term buying intent.");
  }
  if (attribution.utmSource) {
    score += 6;
    reasons.push("UTM source is present for campaign attribution.");
  }
  if (attribution.utmCampaign) {
    score += 6;
    reasons.push("UTM campaign is present for funnel reporting.");
  }
  if (attribution.referrer && attribution.referrer !== "direct") {
    score += 4;
    reasons.push("Referrer is present.");
  }
  if (["mobile", "desktop", "tablet"].includes(attribution.deviceType)) {
    score += 3;
    reasons.push("Device type is known.");
  }
  if (riskFlags.includes("missing-contact-channel")) {
    score -= 25;
    reasons.push("No contact channel is available.");
  }
  if (riskFlags.includes("unknown-device-type")) {
    score -= 4;
    reasons.push("Device type is unknown.");
  }
  if (riskFlags.includes("suspicious-pattern-detected")) {
    score -= 35;
    reasons.push("Suspicious test, preview, bot, or local environment pattern detected.");
  }

  score = Math.max(0, Math.min(100, score));

  const priority = score >= 70 ? "hot" : score >= 45 ? "warm" : "nurture";
  const packageLane = classifyPackageLane(monthlyBill, wantsBackupOrBattery);
  const workflowLane = classifyWorkflowLane(score, hasContactChannel(lead));
  const trafficStatus = classifyTrafficStatus(score, riskFlags);
  const solarSegment = classifySolarSegment(monthlyBill, packageLane, wantsBackupOrBattery);

  return {
    modelVersion,
    externalWrites: false,
    score,
    priority,
    workflowLane,
    packageLane,
    trafficStatus,
    solarSegment,
    monthlyBill,
    wantsBackupOrBattery,
    contactChannelCount,
    attribution,
    reasons,
    riskFlags,
    nextAction: nextActionForLane(workflowLane),
    reviewGates: [
      "Do not write CRM without target workspace/list approval.",
      "Do not send customer messages without recipient and approval.",
      "Do not convert qualification into a quote until PEA inverter verification and site assumptions are reviewed."
    ]
  };
}

export { modelVersion as leadQualificationModelVersion };
