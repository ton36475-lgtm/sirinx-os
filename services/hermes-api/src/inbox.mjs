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

function pickAttachments(body, actionInput = {}) {
  const candidates = [
    body.attachments,
    body.media,
    body.message?.attachments,
    actionInput.attachments
  ];

  return candidates.find((value) => Array.isArray(value)) || [];
}

function pickImageAttachment(attachments) {
  return attachments.find((attachment) => {
    if (!isObject(attachment)) {
      return false;
    }
    const type = String(attachment.type || attachment.kind || "").toLowerCase();
    const mime = String(attachment.mimeType || attachment.mime_type || attachment.contentType || "").toLowerCase();
    return type === "image" || type === "photo" || mime.startsWith("image/");
  }) || null;
}

function pickImageRef(body, actionInput, imageAttachment) {
  return String(
    actionInput.image_ref ||
      actionInput.imageRef ||
      body.image_ref ||
      body.imageRef ||
      imageAttachment?.image_ref ||
      imageAttachment?.imageRef ||
      imageAttachment?.path ||
      imageAttachment?.url ||
      imageAttachment?.id ||
      ""
  ).trim();
}

function pickImageEditInstruction(body, actionInput, intent, imageAttachment) {
  return String(
    actionInput.prompt ||
      actionInput.instruction ||
      actionInput.caption ||
      body.caption ||
      body.instruction ||
      body.message?.caption ||
      imageAttachment?.caption ||
      intent.caption ||
      intent.instruction ||
      ""
  ).trim();
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
  const attachments = pickAttachments(body, actionInput);
  const imageAttachment = pickImageAttachment(attachments);
  const imageRef = pickImageRef(body, actionInput, imageAttachment);
  const editInstruction = pickImageEditInstruction(body, actionInput, intent, imageAttachment);
  const actionType = String(actionInput.type || intent.type || "local-review");
  const wantsImageEdit = actionType === "image-edit" || intent.type === "image-edit" || Boolean(imageRef && editInstruction);
  const target = pickTarget(body) || (wantsImageEdit ? "hermes:image-edit" : "");
  const actionId = String(actionInput.id || body.requestId || actionType);
  const rawTextIncluded = bool(intent.rawTextIncluded) || bool(body.rawTextIncluded);
  const dryRun = body.dryRun !== false;
  const imageEdit = wantsImageEdit
    ? {
        image_edit: true,
        imageEdit: true,
        mode: imageRef && editInstruction ? "image-to-image" : "caption-bound-image-edit-required",
        tool: "image_edit",
        image_ref: imageRef,
        imageRef,
        edit_instruction: editInstruction,
        editInstruction,
        caption_required: true,
        captionRequired: true,
        fallback_text_to_image_blocked: true,
        fallbackTextToImageBlocked: true,
        externalWrites: false,
        canExecuteExternally: false,
        canRunMcp: false,
        canReadSecrets: false,
        providerMustSupportEdit: true,
        status: imageRef && editInstruction ? "ready" : "caption_required",
        message: imageRef && editInstruction
          ? "Caption-bound image edit is ready for local dry-run only."
          : "True image-to-image editing requires the source image and instruction in the same image caption."
      }
    : null;

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
      evidence: body.evidence || actionInput.evidence || {},
      imageEdit
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

  if (normalized.action.imageEdit?.status === "caption_required") {
    return {
      status: 400,
      body: {
        status: "image_edit_caption_required",
        phase: PHASE,
        requestId: normalized.requestId,
        source: normalized.source,
        dryRun: true,
        result: "blocked_caption_required",
        image_edit: true,
        imageEdit: normalized.action.imageEdit,
        externalWrites: false,
        productionWrites: false,
        customerVisible: false,
        canExecuteExternally: false,
        canRunMcp: false,
        canReadSecrets: false,
        requiresHumanApproval: true,
        message: normalized.action.imageEdit.message
      }
    };
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
      image_edit: Boolean(normalized.action.imageEdit),
      imageEdit: normalized.action.imageEdit,
      requiresHumanApproval: decisionSummary.requiresApproval || policyDecision.decision !== "allowed",
      normalizedAction: normalized.action,
      policy: decisionSummary,
      auditEvent: auditEventFor(normalized, decisionSummary, status)
    }
  };
}
