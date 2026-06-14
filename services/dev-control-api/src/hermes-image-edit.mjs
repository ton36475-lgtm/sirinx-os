import { evaluateHermesInboxDryRun } from "../../hermes-api/src/inbox.mjs";

export const hermesImageEditBlockedActions = [
  "text_to_image_fallback_when_source_image_exists",
  "source_image_prompt_rewrite",
  "separate_text_after_image_binding",
  "provider_switch_without_approval",
  "secret_read_or_print",
  "paid_api_call",
  "external_connector_activation",
  "real_mcp_execution",
  "telegram_send",
  "deploy",
  "push",
  "publish"
];

export const hermesImageEditAcceptanceStopPoint =
  "HERMES IMAGE EDIT ACCEPTANCE PACKET READY - LOCAL ONLY - WAITING FOR MANUAL GATEWAY RESTART APPROVAL";

export const hermesImageEditAcceptanceEvidenceFields = [
  {
    id: "source_image_present",
    label: "Source image present",
    expected: true,
    status: "operator-supplied"
  },
  {
    id: "caption_bound_same_event",
    label: "Caption bound in same event",
    expected: true,
    status: "required"
  },
  {
    id: "image_ref_preserved",
    label: "image_ref preserved",
    expected: true,
    status: "required"
  },
  {
    id: "image_edit_selected",
    label: "image_edit selected",
    expected: true,
    status: "required"
  },
  {
    id: "image_generate_not_selected",
    label: "image_generate not selected",
    expected: true,
    status: "required"
  },
  {
    id: "result_reviewed_by_human",
    label: "Result reviewed by human",
    expected: true,
    status: "pending_manual_review"
  }
];

export const hermesImageEditManualChecklist = [
  "Review local Hermes image-edit and inbox tests.",
  "Confirm the active provider exposes true image edit without reading or printing OAuth material.",
  "Restart the Hermes gateway manually only after explicit operator approval.",
  "Send the source image and edit instruction together in one image caption.",
  "Confirm the route selected image_edit and did not select image_generate.",
  "Attach the result screenshot and human review note to Mission Control evidence."
];

export const hermesImageEditAcceptanceTest = {
  inputImage: "food on black plate",
  caption: "change only the plate from black to white",
  expected: "same food, same framing, same composition, only plate color changes",
  passCriteria: [
    "Hermes routes to image_edit.",
    "Provider returns edited image or fails closed as unsupported.",
    "No text-to-image fallback happens.",
    "No secret, token, OAuth material, or provider credential is printed.",
    "Evidence appears in Mission Control and docs."
  ]
};

export function getHermesImageEditAcceptancePacket() {
  return {
    id: "hermes-image-edit-acceptance",
    title: "Image Edit Acceptance Packet",
    status: "acceptance-packet-ready-local-only",
    patch_ready: true,
    patchReady: true,
    gateway_restart_required: true,
    gatewayRestartRequired: true,
    caption_required: true,
    captionRequired: true,
    provider_edit_capability: "needs_manual_probe",
    providerEditCapability: "needs_manual_probe",
    text_to_image_fallback: "blocked",
    textToImageFallback: "blocked",
    externalWrites: false,
    productionWrites: false,
    customerVisible: false,
    canExecuteExternally: false,
    canRunMcp: false,
    canReadSecrets: false,
    canCallProvider: false,
    canRestartGateway: false,
    canSendMessages: false,
    manualOnly: true,
    providerCapabilityCheck: {
      status: "needs_manual_probe",
      checkedLive: false,
      tokenRead: false,
      tokenPrinted: false,
      oauthMaterialPrinted: false,
      providerSwitch: false,
      paidApiCall: false
    },
    gatewayRestartChecklist: {
      required: true,
      autoRestart: false,
      manualApprovalRequired: true,
      steps: hermesImageEditManualChecklist
    },
    acceptanceTest: hermesImageEditAcceptanceTest,
    evidenceFields: hermesImageEditAcceptanceEvidenceFields,
    stopPoint: hermesImageEditAcceptanceStopPoint
  };
}

export function getHermesImageEditStatus() {
  const acceptancePacket = getHermesImageEditAcceptancePacket();

  return {
    title: "Hermes Image-to-Image Gateway Patch",
    status: "ready-local-only",
    mode: "caption-bound-image-edit-contract",
    image_edit: true,
    imageEdit: true,
    caption_required: true,
    captionRequired: true,
    fallback_text_to_image_blocked: true,
    fallbackTextToImageBlocked: true,
    providerMustSupportEdit: true,
    externalWrites: false,
    productionWrites: false,
    customerVisible: false,
    canExecuteExternally: false,
    canRunMcp: false,
    canReadSecrets: false,
    canSendMessages: false,
    canSwitchProviderAutomatically: false,
    toolContract: {
      tool: "image_edit",
      required: ["prompt", "image_ref"],
      optional: ["aspect_ratio"],
      responseFields: ["operation", "source_image", "provider", "status"]
    },
    validUsage: [
      "Attach one source image",
      "Put the edit instruction in the same image caption",
      "Use image_ref as the source image handle",
      "Route to image_edit only"
    ],
    invalidUsage: [
      "Image and edit instruction sent as separate turns",
      "Prompt-only generation when a source image exists",
      "Provider switch without explicit approval",
      "Secret read, paid API call, connector activation, or message send"
    ],
    blockedActions: hermesImageEditBlockedActions,
    summary: {
      imageEdit: true,
      captionRequired: true,
      fallbackTextToImageBlocked: true,
      acceptancePacketReady: true,
      gatewayRestartRequired: acceptancePacket.gatewayRestartRequired,
      providerEditCapability: acceptancePacket.providerEditCapability,
      localOnly: true,
      blockedActions: hermesImageEditBlockedActions.length
    },
    acceptancePacket,
    stopPoint: hermesImageEditAcceptanceStopPoint
  };
}

export function createHermesImageEditDryRun(body = {}) {
  const imageRef = String(body.image_ref || body.imageRef || "/tmp/food-on-black-plate.jpg").trim();
  const caption = String(body.caption || body.prompt || "change only the plate from black to white").trim();
  const requestId = String(body.requestId || "hermes-image-edit-dry-run");

  const hermesInbox = evaluateHermesInboxDryRun({
    requestId,
    source: String(body.source || "codex-local"),
    attachments: [
      {
        type: "image",
        mimeType: String(body.mimeType || "image/jpeg"),
        path: imageRef
      }
    ],
    caption,
    action: {
      id: "caption-bound-image-edit",
      type: "image-edit",
      externalWrite: false,
      productionWrite: false,
      customerVisible: false,
      paidApi: false,
      destructive: false,
      readsSecretValues: false,
      printsSecrets: false,
      readOnly: true
    },
    dryRun: true
  });

  return {
    title: "Hermes Image Edit Dry-Run",
    status: hermesInbox.status < 400 ? "dry-run-image-edit-ready" : "dry-run-image-edit-blocked",
    requestId,
    image_ref: imageRef,
    caption,
    externalWrites: false,
    productionWrites: false,
    customerVisible: false,
    canExecuteExternally: false,
    canRunMcp: false,
    canReadSecrets: false,
    hermesInbox: hermesInbox.body,
    nextActions: [
      "Verify active provider exposes true image edit.",
      "Restart Hermes gateway manually only after tests pass.",
      "Send image and instruction together in one image caption."
    ],
    stopPoint: "HERMES IMAGE EDIT DRY-RUN READY - LOCAL ONLY - STOP BEFORE LIVE PROVIDER CALL"
  };
}

export function createHermesImageEditAcceptanceDryRun(body = {}) {
  const requestId = String(body.requestId || "hermes-image-edit-acceptance-dry-run").trim();
  const source = String(body.source || "codex-local").trim();
  const imageRef = String(body.image_ref || body.imageRef || "/tmp/food-on-black-plate.jpg").trim();
  const caption = String(body.caption || body.prompt || hermesImageEditAcceptanceTest.caption).trim();
  const requestedAction = String(body.action || "acceptance-packet").trim();
  const acceptancePacket = getHermesImageEditAcceptancePacket();
  const hermesInboxSource = String(body.hermesInboxSource || "codex-local").trim();
  const attemptedExternalAction = Boolean(
    body.execute ||
      body.restartGateway ||
      body.callProvider ||
      body.sendMessage ||
      body.activateConnector ||
      body.runMcp ||
      body.readSecret
  );

  const imageEditDryRun = createHermesImageEditDryRun({
    requestId,
    source: hermesInboxSource,
    image_ref: imageRef,
    caption
  });

  return {
    title: "Hermes Image Edit Acceptance Dry-Run",
    status: attemptedExternalAction ? "acceptance-dry-run-blocked" : "acceptance-dry-run-ready",
    mode: "local-only-acceptance-packet",
    requestId,
    source,
    hermesInboxSource,
    requestedAction,
    image_ref: imageRef,
    caption,
    patch_ready: true,
    gateway_restart_required: true,
    caption_required: true,
    provider_edit_capability: "needs_manual_probe",
    text_to_image_fallback: "blocked",
    externalWrites: false,
    productionWrites: false,
    customerVisible: false,
    canExecuteExternally: false,
    canRunMcp: false,
    canReadSecrets: false,
    canCallProvider: false,
    canRestartGateway: false,
    canSendMessages: false,
    providerCapabilityCheck: acceptancePacket.providerCapabilityCheck,
    gatewayRestartChecklist: acceptancePacket.gatewayRestartChecklist,
    manualTestInstructions: acceptancePacket.acceptanceTest,
    evidence: {
      source_image_present: "operator-supplied",
      caption_bound_same_event: true,
      image_ref_preserved: true,
      image_edit_selected: true,
      image_generate_not_selected: true,
      result_reviewed_by_human: false,
      image_ref: imageRef,
      prompt: caption,
      operation: "image_edit"
    },
    hermesInbox: imageEditDryRun.hermesInbox,
    blockedActions: attemptedExternalAction
      ? ["requested_external_action_blocked", ...hermesImageEditBlockedActions]
      : hermesImageEditBlockedActions,
    nextActions: [
      "Keep this packet local until the operator approves the manual Hermes gateway restart.",
      "Probe provider edit capability manually without printing tokens or OAuth material.",
      "Run the food-on-black-plate caption test and attach the result evidence.",
      "Record human review before any live external image edit is accepted."
    ],
    stopPoint: hermesImageEditAcceptanceStopPoint
  };
}
