const LOCKSPEC = deepFreeze({
  contractId: "sirinx-command-center-ui-lock-v1",
  version: "1.0.0",
  status: "LOCKED_LOCAL_READ_ONLY",
  scope: ["telegram_command_center", "private_dev_command_center"],
  productThesis:
    "A private operator cockpit that makes the next safe decision obvious and explains why unavailable actions are blocked.",
  designSystem: {
    brand: "SIRINX dark premium",
    layout: "quiet rational grid",
    dominantRegion: "Now / Needs Attention",
    rawJsonDefault: "collapsed_debug_only",
    mobileStrategy: "recompose_not_shrink"
  },
  evidenceLabels: ["OBSERVED", "INFERRED", "UNVERIFIED", "BLOCKED"],
  requiredStates: [
    "default",
    "hover",
    "focus_visible",
    "active",
    "disabled",
    "loading",
    "empty",
    "error",
    "blocked",
    "unverified",
    "success",
    "stale"
  ],
  safety: {
    readOnly: true,
    dryRun: true,
    externalWrites: false,
    liveSend: false,
    providerCalls: false,
    secretAccess: false,
    publicExposure: false
  },
  schemaRef: "schemas/ghostclaw/telegram-ui-lockspec.v1.schema.json"
});

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value)) deepFreeze(nested);
  }
  return value;
}

export function getCommandCenterUiLock() {
  return LOCKSPEC;
}

export function formatCommandCenterUiLockMessage(lock = LOCKSPEC) {
  return [
    "SIRINX Command Center UI Lock",
    "",
    `Status: ${lock.status}`,
    `Contract: ${lock.contractId}@${lock.version}`,
    `Thesis: ${lock.productThesis}`,
    `Layout: ${lock.designSystem.layout}`,
    `Priority: ${lock.designSystem.dominantRegion}`,
    `Mobile: ${lock.designSystem.mobileStrategy}`,
    `Evidence: ${lock.evidenceLabels.join(" / ")}`,
    "",
    "[SAFETY]",
    `read_only: ${lock.safety.readOnly}`,
    `dry_run: ${lock.safety.dryRun}`,
    `external_writes: ${lock.safety.externalWrites}`,
    `live_send: ${lock.safety.liveSend}`,
    `provider_calls: ${lock.safety.providerCalls}`,
    `secret_access: ${lock.safety.secretAccess}`,
    `public_exposure: ${lock.safety.publicExposure}`,
    `schema: ${lock.schemaRef}`
  ].join("\n");
}
