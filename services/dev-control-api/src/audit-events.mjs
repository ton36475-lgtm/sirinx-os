const maxEvents = 100;
let sequence = 0;
const auditEvents = [];

function nextEventId() {
  sequence += 1;
  return `audit-${Date.now()}-${sequence}`;
}

function summarize(items) {
  return items.reduce(
    (totals, item) => {
      totals[item.result] = (totals[item.result] || 0) + 1;
      return totals;
    },
    {}
  );
}

function cleanEvidence(values = []) {
  return values
    .filter((value) => typeof value === "string" && value.trim())
    .map((value) => value.replace(/[\r\n]+/g, " ").slice(0, 180));
}

export function recordAuditEvent(input) {
  const event = {
    event_id: nextEventId(),
    timestamp: new Date().toISOString(),
    actor: input.actor || "codex-local",
    source: input.source || "control-api",
    action: input.action || "unknown",
    target: input.target || "unknown",
    risk_level: input.risk_level || "unknown",
    approval_status: input.approval_status || "not-required",
    kill_switch_status: input.kill_switch_status || "not-required",
    external_writes: Boolean(input.external_writes),
    result: input.result || "unknown",
    evidence: cleanEvidence(input.evidence)
  };

  auditEvents.unshift(event);
  auditEvents.splice(maxEvents);
  return event;
}

export function recordDryRunAuditEvent(actionId, body, status) {
  const blockedSwitches = body.blockedSwitches || [];
  const approvalRequest = body.approvalRequest || null;
  const evidence = [
    `http_status=${status}`,
    `externalWrites=${Boolean(body.externalWrites)}`,
    approvalRequest ? `approval=${approvalRequest.status}` : "",
    ...blockedSwitches.map((item) => `${item.env}=false`)
  ];

  return recordAuditEvent({
    source: "dry-run",
    action: "dry-run action",
    target: actionId || "missing-action",
    risk_level: approvalRequest?.riskLevel || "low",
    approval_status: approvalRequest?.status || (body.requiresHumanApproval ? "required" : "not-required"),
    kill_switch_status: blockedSwitches.length ? "blocked" : "clear",
    external_writes: Boolean(body.externalWrites),
    result: body.result || body.error || "unknown",
    evidence
  });
}

export function listAuditEvents() {
  return {
    items: auditEvents,
    totals: summarize(auditEvents)
  };
}
