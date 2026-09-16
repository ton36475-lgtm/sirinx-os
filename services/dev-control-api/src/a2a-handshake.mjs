const AGENT_REFERENCE_PATTERN = /^agent:[a-z0-9][a-z0-9_-]{1,63}$/;
const AGENT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 _.-]{1,127}$/;
const CAPABILITY_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;

function normalizeCapabilities(value) {
  const raw = Array.isArray(value) ? value : String(value ?? "").split(",");
  return [...new Set(raw.map((item) => String(item).trim().toLowerCase()).filter(Boolean))];
}

export function createA2aHandshakeDryRun(input = {}, options = {}) {
  const agentReference = String(input.agent_reference ?? "").trim().toLowerCase();
  const agentId = String(input.agent_id ?? "").trim();
  const capabilities = normalizeCapabilities(input.capabilities);
  const issues = [];

  if (!AGENT_REFERENCE_PATTERN.test(agentReference)) issues.push("invalid_agent_reference");
  if (!AGENT_ID_PATTERN.test(agentId)) issues.push("invalid_agent_id");
  if (capabilities.length === 0 || capabilities.length > 16) issues.push("invalid_capability_count");
  if (capabilities.some((item) => !CAPABILITY_PATTERN.test(item))) issues.push("invalid_capability");
  if (input.dry_run_only !== true) issues.push("dry_run_only_required");

  if (issues.length > 0) {
    const error = new Error("invalid_a2a_handshake");
    error.code = "invalid_a2a_handshake";
    error.issues = issues;
    throw error;
  }

  const now = options.now instanceof Date ? options.now : new Date();
  return {
    status: "a2a-handshake-dry-run-ready",
    agentReference,
    agentId,
    capabilities,
    dryRunOnly: true,
    authenticatedSessionCreated: false,
    providerCalled: false,
    externalWrites: false,
    queueMutated: false,
    handshakeAt: now.toISOString()
  };
}
