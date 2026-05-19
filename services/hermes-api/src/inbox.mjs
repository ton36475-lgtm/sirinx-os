import { evaluatePolicy, summarizePolicyDecision } from "../../../packages/policy-core/src/index.mjs";

const PHASE = "2026-05-20.hermes-inbox-dry-run.v1";
const LOCAL_SOURCES = new Set(["codex-local", "hermes-dashboard"]);

function isObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function pickSource(body, context) {
  return String(context.source || body.source || body.operator?.channel || "unknown").trim();
}

function pickTarget(body) {
  if (body.action?.target) {
    return body.action.target;
  }

  if (body.target?.id) {
    return body.target.id;
  }

  if (typeof body.target === "string") {
    return body.target;
  }

  return "";
}

function bool(value) {
  return value === true;
}

export function normalizeHermesInboxRequest(body = {}, context = {}) {
  if (!isObject(body)) {
    return {
      ok: false,
      status: 400,
      error: "invalid_request_body",
      message: "Hermes inbox body must be a JSON object."
    };
  }

  const source = pickSource(body, context);
  const actionInput = isObject(body.action) ? body.action : {};
  const intent = isObject(body.intent) ? body.intent : {};
  const target = pickTarget(body);
  const actionType = String(actionInput.type || intent.type || "local-review");
  const actionId = String(actionInput.id || body.requestId || actionType);
  const rawTextIncluded = bool(intent.rawTextIncluded) || bool(body.rawTextIncluded);
  const dryRun = body.dryRun !== false;

  if (!actionId || actionId === "undefined") {
    return {
      ok: false,
      status: 400,
      error: "missing_action_id",
      message: "Hermes inbox request requires action.id or requestId."
    };
  }

  if (!target) {
    return {
      ok: false,
      status: 400,
      error: "missing_target",
      message: "Hermes inbox request requires target.id or action.target."
    };
  }

  return {
    ok: true,
    requestId: String(body.requestId || actionId),
    source,
    dryRun,
    action: {
      id: actionId,
      type: actionType,
      description: String(intent.summary || actionInput.description || ""),
      command: actionInput.command ? String(actionInput.command) : "",
      target,
      paths: actionInput.paths,
      connectors: actionInput.connectors,
      externalWrite: bool(actionInput.externalWrite),
      productionWrite: bool(actionInput.productionWrite),
      customerVisible: bool(actionInput.customerVisible),
      paidApi: bool(actionInput.paidApi),
      destructive: bool(actionInput.destructive),
      readsSecretValues: bool(actionInput.readsSecretValues),
      printsSecrets: bool(actionInput.printsSecrets),
      rawChatToMemory: bool(actionInput.rawChatToMemory) || rawTextIncluded,
      readOnly: bool(actionInput.readOnly),
      evidence: body.evidence || actionInput.evidence || {}
    }
  };
}

function authFailure(normalized) {
  return {
    status: 401,
    body: {
      status: "auth_required",
      phase: PHASE,
      requestId: normalized.requestId || "unknown",
      source: normalized.source || "unknown",
      result: "blocked_external_source_without_verified_signature",
      externalWrites: false,
      productionWrites: false,
      customerVisible: false,
      requiresHumanApproval: true
    }
  };
}

function phaseExecutionFailure(normalized) {
  return {
    status: 403,
    body: {
      status: "execution_disabled",
      phase: PHASE,
      requestId: normalized.requestId,
      source: normalized.source,
      result: "phase_1_dry_run_only",
      externalWrites: false,
      productionWrites: false,
      customerVisible: false,
      requiresHumanApproval: true
    }
  };
}

function statusForDecision(decision) {
  if (decision.decision === "blocked") {
    return 403;
  }

  if (decision.decision === "approval_required") {
    return 202;
  }

  return 200;
}

function auditEventFor(normalized, decisionSummary, status) {
  return {
    source: "hermes-inbox-dry-run",
    action: normalized.action.id,
    target: normalized.action.target,
    risk_level: status >= 400 ? "high" : decisionSummary.requiresApproval ? "medium" : "low",
    approval_status: decisionSummary.requiresApproval ? "required" : "not-required",
    kill_switch_status: decisionSummary.decision === "blocked" ? "blocked" : "clear",
    external_writes: false,
    result: decisionSummary.decision,
    evidence: [
      `phase=${PHASE}`,
      `source=${normalized.source}`,
      `policy=${decisionSummary.policyVersion}`,
      `externalWrites=false`
    ]
  };
}

export function evaluateHermesInboxDryRun(body = {}, context = {}) {
  const normalized = normalizeHermesInboxRequest(body, context);

  if (!normalized.ok) {
    return {
      status: normalized.status,
      body: {
        status: "invalid_request",
        phase: PHASE,
        error: normalized.error,
        message: normalized.message,
        externalWrites: false,
        productionWrites: false,
        customerVisible: false,
        requiresHumanApproval: true
      }
    };
  }

  if (!LOCAL_SOURCES.has(normalized.source) && !context.signatureVerified) {
    return authFailure(normalized);
  }

  if (!normalized.dryRun) {
    return phaseExecutionFailure(normalized);
  }

  const policyDecision = evaluatePolicy(normalized.action, {
    approval: body.evidence?.approval || body.approval || null
  });
  const decisionSummary = summarizePolicyDecision(policyDecision);
  const status = statusForDecision(policyDecision);

  return {
    status,
    body: {
      status: policyDecision.decision,
      phase: PHASE,
      requestId: normalized.requestId,
      source: normalized.source,
      dryRun: true,
      result: policyDecision.decision,
      externalWrites: false,
      productionWrites: false,
      customerVisible: false,
      requiresHumanApproval: decisionSummary.requiresApproval || policyDecision.decision !== "allowed",
      normalizedAction: normalized.action,
      policy: decisionSummary,
      auditEvent: auditEventFor(normalized, decisionSummary, status)
    }
  };
}
