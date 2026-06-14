const evidencePath = "docs/knowledge/SIRINX_REPO_INTAKE_GATE_V1.md";

export const repoIntakeBlockedActions = [
  "clone_repo",
  "install_packages",
  "run_postinstall",
  "execute_repo_code",
  "mcp_server_start",
  "secret_read_or_print",
  "message_send",
  "deploy",
  "push",
  "publish",
  "external_connector_activation",
  "paid_api_call"
];

export const repoIntakeReviewChecklist = [
  "repo_url_required",
  "license_check",
  "readme_scope_check",
  "package_manifest_check",
  "postinstall_script_check",
  "secret_scan_plan",
  "network_side_effect_review",
  "external_execution_block",
  "human_install_approval_required"
];

const dangerousPurposeRules = [
  ["clone_repo", /\b(clone|git clone|checkout)\b/i],
  ["install_packages", /\b(install|npm i|pnpm add|pnpm install|yarn add|bun add|pip install|brew install|go install|cargo install)\b/i],
  ["run_postinstall", /\b(postinstall|prepare script|lifecycle script)\b/i],
  ["execute_repo_code", /\b(run|execute|node |python |tsx |npm run|pnpm run|make |go run|cargo run)\b/i],
  ["mcp_server_start", /\b(mcp|model context protocol|start server|start-server)\b/i],
  ["secret_read_or_print", /\b(secrets?|tokens?|api key|apikey|password|cookie|\.env|credentials?)\b/i],
  ["message_send", /\b(send|dm|telegram|line|email|reply|publish message)\b/i],
  ["deploy", /\b(deploy|wrangler deploy|vercel deploy|cloudflare pages deploy)\b/i],
  ["push", /\b(push|git push)\b/i],
  ["publish", /\b(publish|release|submit|upload)\b/i]
];

const shellLikePattern = /(&&|\|\||;|`|\$\(|\|[ \t]*(sh|bash|zsh|python|node|ruby)|\b(curl|wget)\b.*\|)/i;

function nowIso(options) {
  const now = options.now || (() => new Date());
  return now().toISOString();
}

function capabilityLock() {
  return {
    externalWrites: false,
    productionWrites: false,
    customerVisible: false,
    canExecuteExternally: false,
    canCloneRepo: false,
    canInstallPackages: false,
    canRunPostinstall: false,
    canExecuteCode: false,
    canReadSecrets: false,
    canRunMcp: false,
    canStartMcp: false,
    canSendMessages: false,
    canDeploy: false,
    canPush: false,
    canPublish: false,
    canActivateConnectors: false,
    canCallPaidApi: false,
    externalNetworkCall: false,
    commandExecuted: false,
    requiresHumanApproval: true
  };
}

function makeEvidencePacket(classification, options) {
  return {
    path: evidencePath,
    mode: "local-docs-evidence",
    didWriteFromApi: false,
    classification,
    commandExecuted: false,
    externalNetworkCall: false,
    updatedAt: nowIso(options)
  };
}

function classifyPurpose(purpose) {
  const normalizedPurpose = purpose
    .replace(/\bbefore\s+install(?:ation)?\b/gi, "preinstall-review")
    .replace(/\bprior\s+to\s+install(?:ation)?\b/gi, "preinstall-review")
    .replace(/\bpre[- ]install(?:ation)?\s+review\b/gi, "preinstall-review");

  return dangerousPurposeRules
    .filter(([, pattern]) => pattern.test(normalizedPurpose))
    .map(([reason]) => reason);
}

function parseRepoUrl(repoUrl) {
  const value = String(repoUrl || "").trim();

  if (!value) {
    return {
      ok: false,
      classification: "missing_repo_url",
      blockedReasons: ["repo_url_required"],
      repo: null
    };
  }

  if (shellLikePattern.test(value)) {
    return {
      ok: false,
      classification: "invalid_repo_url",
      blockedReasons: ["shell_like_repo_url"],
      repo: null
    };
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return {
      ok: false,
      classification: "invalid_repo_url",
      blockedReasons: ["repo_url_parse_failed"],
      repo: null
    };
  }

  if (!["https:", "http:"].includes(parsed.protocol)) {
    return {
      ok: false,
      classification: "invalid_repo_url",
      blockedReasons: ["unsupported_repo_url_protocol"],
      repo: null
    };
  }

  const parts = parsed.pathname
    .replace(/\.git$/i, "")
    .split("/")
    .filter(Boolean);

  if (parts.length < 2) {
    return {
      ok: false,
      classification: "invalid_repo_url",
      blockedReasons: ["repo_owner_and_name_required"],
      repo: null
    };
  }

  return {
    ok: true,
    classification: "review_required",
    blockedReasons: [],
    repo: {
      url: value,
      host: parsed.hostname.toLowerCase(),
      owner: parts[0],
      name: parts[1],
      path: `/${parts.slice(0, 2).join("/")}`,
      networkFetched: false,
      cloned: false,
      installed: false,
      postinstallRan: false
    }
  };
}

export function getRepoIntakeGateStatus(options = {}) {
  return {
    title: "Repo Intake Gate",
    status: "repo-intake-gate-ready-local-only",
    mode: "local-only-repo-review-gate",
    ...capabilityLock(),
    purpose: "Review third-party Git repositories and skills before any install, clone, postinstall, or execution path is approved.",
    acceptedInputs: {
      repoUrl: "https URL only; no shell fragments; no clone from API",
      purpose: "plain-text review goal",
      requestId: "operator-supplied trace id"
    },
    reviewChecklist: repoIntakeReviewChecklist,
    blockedActions: repoIntakeBlockedActions,
    evidence: {
      path: evidencePath,
      apiWritesEvidence: false,
      currentState: "local-docs-contract"
    },
    manualApprovalPhases: [
      "metadata_review_approval",
      "license_security_review_approval",
      "sandbox_clone_approval",
      "dependency_install_approval",
      "postinstall_execution_approval"
    ],
    stopRules: [
      "Do not install or clone from this API.",
      "Do not run postinstall, prepare, or lifecycle scripts.",
      "Do not read or print secrets.",
      "Do not start MCP servers, send messages, deploy, push, or publish.",
      "Use this gate to produce review evidence and the next manual step only."
    ],
    stopPoint: "REPO INTAKE GATE READY — LOCAL ONLY — WAITING FOR REPO URL AND INSTALL APPROVAL",
    updatedAt: nowIso(options)
  };
}

export function createRepoIntakeReviewDryRun(body = {}, options = {}) {
  const requestId = String(body.requestId || "repo-intake-review-dry-run");
  const purpose = String(body.purpose || "repo intake review").trim();
  const source = String(body.source || "codex-local").trim();
  const parsed = parseRepoUrl(body.repoUrl);
  const purposeBlockedReasons = classifyPurpose(purpose);
  const blockedReasons = [...new Set([...parsed.blockedReasons, ...purposeBlockedReasons])];

  if (!parsed.ok || purposeBlockedReasons.length > 0) {
    return {
      title: "Repo Intake Gate Review Dry-Run",
      status: "blocked-repo-intake-review",
      mode: "local-only-dry-run",
      requestId,
      purpose,
      source,
      ...capabilityLock(),
      classification: parsed.ok ? "blocked" : parsed.classification,
      repo: parsed.repo,
      blockedReasons,
      blockedActions: repoIntakeBlockedActions,
      reviewChecklist: repoIntakeReviewChecklist,
      evidencePacket: makeEvidencePacket(parsed.ok ? "blocked" : parsed.classification, options),
      nextManualStep: parsed.classification === "missing_repo_url" ? "Provide a repository URL for local-only review." : "Reduce the request to read-only metadata review.",
      stopPoint: "REPO INTAKE REVIEW BLOCKED — NO COMMAND EXECUTED",
      updatedAt: nowIso(options)
    };
  }

  return {
    title: "Repo Intake Gate Review Dry-Run",
    status: "dry-run-repo-intake-review-ready",
    mode: "local-only-dry-run",
    requestId,
    purpose,
    source,
    ...capabilityLock(),
    classification: "review_required",
    repo: parsed.repo,
    blockedReasons: [],
    blockedActions: repoIntakeBlockedActions,
    reviewChecklist: repoIntakeReviewChecklist,
    evidencePacket: makeEvidencePacket("review_required", options),
    nextManualStep: "Open the repo in a browser or connector for read-only metadata review after approval.",
    manualReviewPacket: {
      license: "required_before_install",
      manifest: "required_before_install",
      scripts: "postinstall_prepare_lifecycle_required_before_install",
      dependencyRisk: "required_before_install",
      secretExposure: "secret_scan_required_before_install",
      sandboxPlan: "required_before_clone_or_install"
    },
    stopPoint: "REPO INTAKE REVIEW READY — LOCAL ONLY — WAITING FOR HUMAN APPROVAL",
    updatedAt: nowIso(options)
  };
}
