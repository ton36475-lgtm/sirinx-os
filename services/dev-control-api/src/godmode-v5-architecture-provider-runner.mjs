import { createHash, createHmac } from "node:crypto";
import { readFile, realpath } from "node:fs/promises";
import { relative, resolve } from "node:path";

import {
  authorizeProviderCallExactGate,
  createProviderCallTarget,
  digestProviderCallTarget
} from "./provider-call-exact-gate.mjs";
import { getGodmodeV5ArchitectureRequestStatus } from "./godmode-v5-architecture-request.mjs";

export const GODMODE_V5_ARCHITECTURE_PROVIDER_COMMAND =
  "godmode_v5_claude_architecture_read_only";
export const GODMODE_V5_ARCHITECTURE_PROVIDER_MODEL = "opus";
export const GODMODE_V5_ARCHITECTURE_REQUIRED_EXACT_GATE =
  "APPROVE_CLAUDE_CODE_PROVIDER_CALL_GODMODE_V5_ARCH_20260715_001";
export const GODMODE_V5_ARCHITECTURE_PROVIDER_APPROVAL_TOKEN_ESTIMATE = 8192;
export const GODMODE_V5_ARCHITECTURE_PROVIDER_OUTPUT_CHARACTER_CAP = 32768;
export const GODMODE_V5_ARCHITECTURE_PROVIDER_MAX_TURNS = 6;
export const GODMODE_V5_ARCHITECTURE_PROVIDER_MAX_BUDGET_USD = 2;
export const GODMODE_V5_ARCHITECTURE_PROVIDER_CALL_LIMIT = 1;
export const GODMODE_V5_ARCHITECTURE_PROVIDER_RESULT_ROOT =
  ".ghostclaw_runtime/a2a2a/evidence/godmode-v5-provider-results";

const ALLOWED_TOOLS = Object.freeze(["Glob", "Grep", "Read"]);
const REQUIRED_TARGET_FIELDS = Object.freeze([
  "TaskId",
  "CorrelationId",
  "RequestDigestSha256",
  "StateReceiptDigest",
  "PromptDigestSha256",
  "OutputPath",
  "WorkingDirectory",
  "Route",
  "Mode",
  "ExecutableDigestSha256",
  "AllowedTools",
  "MaxTurns",
  "MaxBudgetUsd",
  "InvocationCountLimit",
  "ProviderCallAccounting",
  "TokenLimitEnforcement",
  "OutputCharacterCap"
]);

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function digestJson(value) {
  return sha256(JSON.stringify(stableValue(value)));
}

function validRequestId(value) {
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(String(value || ""));
}

function resultRelativePath(repoRoot, requestId) {
  if (!validRequestId(requestId)) {
    throw new Error("architecture_provider_request_id_invalid");
  }
  const resultRoot = resolve(repoRoot, GODMODE_V5_ARCHITECTURE_PROVIDER_RESULT_ROOT);
  const absolute = resolve(resultRoot, `${requestId}.json`);
  const scopedToResultRoot = relative(resultRoot, absolute);
  if (
    !scopedToResultRoot ||
    scopedToResultRoot.startsWith("..") ||
    resolve(resultRoot, scopedToResultRoot) !== absolute
  ) {
    throw new Error(`architecture_provider_path_outside_result_root:${requestId}`);
  }
  return relative(repoRoot, absolute);
}

function validateDigest(value, name) {
  if (!/^[0-9a-f]{64}$/.test(String(value || ""))) {
    throw new Error(`architecture_provider_${name}_invalid`);
  }
}

export function buildGodmodeV5ArchitecturePrompt(request = {}) {
  const inputs = Array.isArray(request.Inputs) ? request.Inputs : [];
  const skills = Array.isArray(request.SkillBundle?.RequiredSkills)
    ? request.SkillBundle.RequiredSkills.map(
      (skill) => `${request.SkillBundle.CanonicalSourceRoot}/${skill}/SKILL.md`
    )
    : [];
  const sections = Array.isArray(request.RequiredSections) ? request.RequiredSections : [];
  return [
    "You are the read-only Claude Architect for GODMODE V5.",
    "Inspect only the listed repository files using Read, Glob, and Grep.",
    "Do not edit files, run shell commands, use MCP, browse the web, install packages, read secrets, send messages, stage Git, push, or deploy.",
    `Architecture request: configs/godmode_v5_architecture.request.json`,
    "Required inputs:",
    ...inputs.map((path) => `- ${path}`),
    "Required local skill references:",
    ...skills.map((path) => `- ${path}`),
    "Return Markdown only. Include these exact level-two headings once each:",
    ...sections.map((section) => `## ${section}`),
    "The output is an architecture proposal, not implementation authorization.",
    "Call out unknowns explicitly and keep all live provider, Telegram, Cloudflare, Git, install, and secret gates closed."
  ].join("\n");
}

export function validateGodmodeV5ArchitectureMarkdown(markdown, requiredSections = []) {
  const text = String(markdown || "").trim();
  const issues = [];
  if (!text) issues.push("architecture_provider_result_empty");
  if (text.length > GODMODE_V5_ARCHITECTURE_PROVIDER_OUTPUT_CHARACTER_CAP) {
    issues.push("architecture_provider_result_exceeds_output_cap");
  }
  for (const section of requiredSections) {
    const escaped = String(section).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matches = text.match(new RegExp(`^##\\s+${escaped}\\s*$`, "gmi")) || [];
    if (matches.length !== 1) issues.push(`architecture_provider_section_count:${section}:${matches.length}`);
  }
  return { passed: issues.length === 0, issues };
}

export async function buildGodmodeV5ArchitectureProviderPlan(options = {}) {
  const repoRoot = resolve(options.repoRoot || process.cwd());
  const request = options.request || JSON.parse(
    await readFile(resolve(repoRoot, "configs/godmode_v5_architecture.request.json"), "utf8")
  );
  const status = options.status || await getGodmodeV5ArchitectureRequestStatus({ repoRoot, request });
  if (status.Status !== "ArchitectureRequestReadyProviderGateClosed") {
    throw new Error(`architecture_provider_request_not_ready:${status.Status}`);
  }
  if (request.ProviderDispatch?.Route !== "claude-code/first-party") {
    throw new Error("architecture_provider_route_not_allowed");
  }
  if (request.ProviderDispatch?.Mode !== "read_only_plan") {
    throw new Error("architecture_provider_mode_not_read_only");
  }
  if (
    request.ProviderDispatch?.RequiredExactGate !==
    GODMODE_V5_ARCHITECTURE_REQUIRED_EXACT_GATE
  ) {
    throw new Error("architecture_provider_required_exact_gate_mismatch");
  }
  const requestedTools = [...new Set(request.ProviderDispatch?.AllowedTools || [])].sort();
  if (JSON.stringify(requestedTools) !== JSON.stringify(ALLOWED_TOOLS)) {
    throw new Error("architecture_provider_tools_not_exact_allowlist");
  }

  const executablePath = await realpath(
    options.claudeExecutable || "/Users/sirinx/.local/bin/claude"
  );
  const executableDigestSha256 = sha256(await readFile(executablePath));
  const requestDigestSha256 = status.RequestDigestSha256 || digestJson(request);
  validateDigest(requestDigestSha256, "request_digest");
  validateDigest(request.StateReceiptDigest, "state_receipt_digest");
  const prompt = buildGodmodeV5ArchitecturePrompt(request);
  const promptDigestSha256 = sha256(prompt);
  const outputPath = resultRelativePath(repoRoot, request.RequestId);
  const target = createProviderCallTarget({
    requestId: request.RequestId,
    commandId: GODMODE_V5_ARCHITECTURE_PROVIDER_COMMAND,
    provider: "Claude Code",
    model: GODMODE_V5_ARCHITECTURE_PROVIDER_MODEL,
    maxTokens: GODMODE_V5_ARCHITECTURE_PROVIDER_APPROVAL_TOKEN_ESTIMATE,
    taskId: request.TaskId,
    correlationId: request.CorrelationId,
    requestDigestSha256,
    stateReceiptDigest: request.StateReceiptDigest,
    promptDigestSha256,
    outputPath,
    workingDirectory: ".",
    route: request.ProviderDispatch.Route,
    mode: request.ProviderDispatch.Mode,
    executableDigestSha256,
    providerCallAccounting: "one_cli_session_up_to_six_model_turns_api_calls_unobserved",
    tokenLimitEnforcement: "post_call_character_cap_only_not_provider_cli",
    outputCharacterCap: GODMODE_V5_ARCHITECTURE_PROVIDER_OUTPUT_CHARACTER_CAP,
    allowedTools: requestedTools,
    maxTurns: GODMODE_V5_ARCHITECTURE_PROVIDER_MAX_TURNS,
    maxBudgetUsd: GODMODE_V5_ARCHITECTURE_PROVIDER_MAX_BUDGET_USD,
    invocationCountLimit: GODMODE_V5_ARCHITECTURE_PROVIDER_CALL_LIMIT
  });
  const args = [
    "--safe-mode",
    "--print",
    "--model", GODMODE_V5_ARCHITECTURE_PROVIDER_MODEL,
    "--permission-mode", "plan",
    "--tools", requestedTools.join(","),
    "--disallowedTools", "mcp__*",
    "--strict-mcp-config",
    "--disable-slash-commands",
    "--no-chrome",
    "--no-session-persistence",
    "--output-format", "json",
    "--max-turns", String(GODMODE_V5_ARCHITECTURE_PROVIDER_MAX_TURNS),
    "--max-budget-usd", GODMODE_V5_ARCHITECTURE_PROVIDER_MAX_BUDGET_USD.toFixed(2),
    prompt
  ];
  return {
    schema: "ghostclaw.godmode-v5.architecture-provider-plan.v1",
    request,
    requestStatus: status,
    requiredExactGate: GODMODE_V5_ARCHITECTURE_REQUIRED_EXACT_GATE,
    target,
    targetDigestSha256: digestProviderCallTarget(target),
    executablePath,
    executableDigestSha256,
    args,
    promptDigestSha256,
    outputPath,
    providerCalled: false,
    providerAttemptCount: 0,
    secretRead: false,
    keyValuePrinted: false,
    repoMutation: false,
    deploy: false,
    push: false
  };
}

function parseClaudeJson(stdout) {
  try {
    const parsed = JSON.parse(String(stdout || ""));
    return {
      parsed,
      markdown: typeof parsed.result === "string" ? parsed.result : ""
    };
  } catch {
    return { parsed: null, markdown: "" };
  }
}

function signExecutionReceipt(receipt, signingKey) {
  return createHmac("sha256", signingKey)
    .update(JSON.stringify(stableValue(receipt)))
    .digest("hex");
}

export async function runGodmodeV5ArchitectureProvider(options = {}) {
  const plan = options.plan || await buildGodmodeV5ArchitectureProviderPlan(options);
  if (options.execute !== true) return { ...plan, status: "dry-run-ready", execute: false };
  if (typeof options.runClaude !== "function") {
    throw new Error("architecture_provider_runner_required");
  }

  const approval = await authorizeProviderCallExactGate(plan.target, {
    requiredExactGate: plan.requiredExactGate,
    exactGate: plan.requiredExactGate,
    approvalReceipt: options.approvalReceipt,
    approvalReceiptPath: options.approvalReceiptPath,
    approvalReceiptRoot: options.approvalReceiptRoot,
    consumedReceiptRoot: options.consumedReceiptRoot,
    expectedReceiptId: options.expectedReceiptId,
    allowProvidedReceiptObject: options.allowProvidedReceiptObject === true,
    receiptSigningKey: options.receiptSigningKey,
    consumeReceipt: options.consumeReceipt,
    allowedApprovers: ["operator"],
    allowedRequesters: ["hermes_commander"],
    maxTokensCeiling: GODMODE_V5_ARCHITECTURE_PROVIDER_APPROVAL_TOKEN_ESTIMATE,
    maxBudgetUsdCeiling: GODMODE_V5_ARCHITECTURE_PROVIDER_MAX_BUDGET_USD,
    requiredTargetFields: REQUIRED_TARGET_FIELDS,
    now: options.now
  });
  if (!approval.authorized) {
    const approvalSigningKeyBindingUsed =
      typeof options.receiptSigningKey === "string" && options.receiptSigningKey.length > 0;
    return {
      schema: "ghostclaw.godmode-v5.architecture-provider-execution.v1",
      status: "blocked-exact-provider-gate",
      requestId: plan.target.RequestId,
      approval,
      providerCalled: false,
      providerAttemptCount: 0,
      approvalSigningKeyBindingUsed,
      providerCredentialValueObservedByWrapper: false,
      secretRead: approvalSigningKeyBindingUsed,
      secretValuePrinted: false,
      keyValuePrinted: false,
      runtimeEvidenceMutation: options.runtimeEvidenceMutation === true,
      sourceMutation: false,
      repoMutation: false,
      deploy: false,
      push: false
    };
  }

  const startedAt = new Date().toISOString();
  const child = await options.runClaude({
    executablePath: plan.executablePath,
    args: plan.args,
    cwd: options.repoRoot || process.cwd()
  });
  const completedAt = new Date().toISOString();
  const processStarted = child.processStarted === true;
  const spawnErrorCode = String(child.spawnErrorCode || "") || null;
  const parsed = parseClaudeJson(child.stdout);
  const validation = validateGodmodeV5ArchitectureMarkdown(
    parsed.markdown,
    plan.request.RequiredSections
  );
  const succeeded = processStarted && !spawnErrorCode && child.exitCode === 0 && validation.passed;
  const unsignedReceipt = {
    schema: "ghostclaw.godmode-v5.architecture-provider-execution.v1",
    status: succeeded ? "provider-result-ready-for-review" : "provider-result-rejected",
    requestId: plan.target.RequestId,
    taskId: plan.target.TaskId,
    targetDigestSha256: plan.targetDigestSha256,
    requestDigestSha256: plan.target.RequestDigestSha256,
    promptDigestSha256: plan.promptDigestSha256,
    executableDigestSha256: plan.executableDigestSha256,
    approvalReceiptId: approval.receiptId,
    approvalReceiptConsumed: approval.receiptConsumed === true,
    startedAt,
    completedAt,
    exitCode: Number.isInteger(child.exitCode) ? child.exitCode : null,
    spawnErrorCode,
    providerCliInvocationAttempted: true,
    providerCliProcessStarted: processStarted,
    providerCliInvocationAttemptCount: 1,
    providerCliSessionCount: processStarted ? 1 : 0,
    providerCalled: processStarted ? null : false,
    providerAttemptCount: processStarted ? null : 0,
    providerModelTurnCeiling: plan.target.MaxTurns,
    providerApiCallCountObserved: null,
    retryAttempted: false,
    outputDigestSha256: sha256(parsed.markdown),
    stdoutDigestSha256: sha256(String(child.stdout || "")),
    stderrDigestSha256: sha256(String(child.stderr || "")),
    outputLength: parsed.markdown.length,
    validation,
    architectureMarkdown: succeeded ? parsed.markdown : null,
    approvalSigningKeyBindingUsed: true,
    providerCredentialValueObservedByWrapper: false,
    secretRead: true,
    secretValuePrinted: false,
    keyValuePrinted: false,
    childOutputIncludedInConsole: false,
    runtimeEvidenceMutation: true,
    sourceMutation: false,
    repoMutation: false,
    deploy: false,
    push: false
  };
  return {
    ...unsignedReceipt,
    executionReceiptSignatureAlgorithm: "hmac-sha256",
    executionReceiptSignature: signExecutionReceipt(unsignedReceipt, options.receiptSigningKey)
  };
}
