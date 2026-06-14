const STOP_POINT =
  "HERMES ADAPTIVE COMMAND GATEWAY V0.2 READY - FAST ACK QUEUE DRY-RUN - WAITING FOR GATEWAY RELOAD APPROVAL";

const COMMAND_REGISTRY = [
  "/clear",
  "/reset",
  "/status",
  "/jobs",
  "/jobs get <job_id>",
  "/kanban boards list",
  "/kanban boards switch <slug>",
  "/mission create \"<name>\"",
  "/mission route \"<route>\" --provider <provider> --sync <targets> --mode <mode>",
  "/mission status",
  "/hermes approve <job_id>",
  "/hermes cancel <job_id>",
  "/hermes sync pc",
  "/hermes sync mobile",
  "/hermes mission create --board <slug> --name \"<name>\" --route \"<route>\" --provider <provider> --sync <targets> --mode <mode>"
];

const BLOCKED_ACTIONS = [
  "agent_execution",
  "mcp_start",
  "package_install",
  "provider_call",
  "secret_read_or_print",
  "message_send",
  "deploy",
  "push",
  "publish",
  "external_connector_activation"
];

const MODEL_POLICY = {
  router: {
    provider: "openrouter",
    model: "qwen/qwen3.7-max",
    contextLength: 1000000,
    maxTokens: 512,
    temperature: 0.1,
    useFor: ["parse_command", "classify_intent", "validate_syntax", "fast_ack"]
  },
  planner: {
    provider: "openrouter",
    model: "qwen/qwen3.7-max",
    contextLength: 1000000,
    maxTokens: 4096,
    temperature: 0.2,
    useFor: ["mission_planning", "spec", "architecture", "long_context"]
  },
  reviewer: {
    provider: "openrouter",
    model: "qwen/qwen3.7-max",
    contextLength: 1000000,
    maxTokens: 3000,
    temperature: 0.1,
    useFor: ["review", "qa", "risk_assessment"]
  }
};

const QUEUE_POLICY = {
  backend: "sqlite",
  dbPath: ".hermes/jobs.sqlite",
  workerConcurrency: 2,
  retryAttempts: 2,
  retryBackoffMs: 3000,
  persistedByDryRun: false
};

const LATENCY_CONTROL = {
  fastAck: true,
  ackTimeoutMs: 1200,
  streamProgress: true,
  progressIntervalMs: 6000,
  maxCommandChars: 2000,
  maxRouterTokens: 512,
  maxPlannerTokens: 2500,
  summarizeContextBeforePlanning: true,
  cacheProjectContext: true,
  debounceKanbanSyncMs: 2000,
  batchNodeUpdates: true
};

const SECRET_PATTERNS = [
  ["openrouter_key", /\bsk-or-v1[_-][A-Za-z0-9_-]{24,}\b/g],
  ["openai_key", /\bsk-(?:proj-)?[A-Za-z0-9_-]{24,}\b/g],
  ["telegram_bot_token", /\b\d{7,12}:[A-Za-z0-9_-]{25,}\b/g],
  ["bearer_token", /\bBearer\s+[A-Za-z0-9._-]{24,}\b/gi],
  ["jwt", /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g],
  ["named_secret", /\b(?:OPENROUTER_API_KEY|TELEGRAM_BOT_TOKEN|API_KEY|SECRET|TOKEN|PASSWORD)\s*=\s*["']?[^"'\s]{8,}/gi]
];

const DANGEROUS_PATTERNS = [
  ["agent_execution", /\b(?:execute|run\s+(?:codex|antigravity|agent)|dispatch|auto[- ]?start|start\s+agent)\b/i],
  ["mcp_start", /\b(?:start|run|reload)\s+(?:real\s+)?mcp\b|\bmcp\s+(?:start|run|reload)\b/i],
  ["package_install", /\b(?:install\s+package|package\s+install|npm\s+install|pnpm\s+add|pip\s+install|cargo\s+install|brew\s+install)\b/i],
  ["provider_call", /\b(?:call\s+(?:openrouter|provider)|provider\s+call|paid\s+api|spend\s+credits)\b/i],
  ["message_send", /\b(?:send\s+(?:telegram|line|email|sms|message)|dm\s+|notify\s+|reply\s+to)\b/i],
  ["deploy", /\bdeploy\b/i],
  ["push", /\b(?:git\s+push|push\s+to|push\b)\b/i],
  ["publish", /\bpublish\b/i],
  ["external_connector_activation", /\b(?:activate|enable|connect)\s+(?:external\s+)?(?:connector|plugin|saas)\b/i],
  ["secret_read_or_print", /\b(?:read|print|show|dump|expose)\s+(?:secret|token|api\s*key|credential|\.env)\b/i]
];

function safeNow(options = {}) {
  return new Date(options.now || Date.now()).toISOString();
}

function compactDate(iso) {
  return iso.slice(0, 10).replaceAll("-", "");
}

function requestSuffix(value) {
  const cleaned = String(value || "job")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 10);
  return cleaned || "JOB";
}

function makeJobId(requestId, iso) {
  return `HERMES-${compactDate(iso)}-${requestSuffix(requestId)}`;
}

function makeMissionId(requestId, iso) {
  return `MISSION-${compactDate(iso)}-${requestSuffix(requestId)}`;
}

function tokenizeCommand(command) {
  const tokens = [];
  const pattern = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|(\S+)/g;
  let match;
  while ((match = pattern.exec(command))) {
    tokens.push((match[1] ?? match[2] ?? match[3] ?? "").replace(/\\"/g, "\"").replace(/\\'/g, "'"));
  }
  return tokens;
}

function parseFlags(tokens, start = 0) {
  const flags = {};
  const positional = [];

  for (let index = start; index < tokens.length; index += 1) {
    const part = tokens[index];
    if (part.startsWith("--")) {
      const [rawKey, inlineValue] = part.slice(2).split("=", 2);
      const next = tokens[index + 1];
      if (inlineValue !== undefined) {
        flags[rawKey] = inlineValue;
      } else if (next && !next.startsWith("--")) {
        flags[rawKey] = next;
        index += 1;
      } else {
        flags[rawKey] = true;
      }
    } else {
      positional.push(part);
    }
  }

  return { flags, positional };
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeRoute(value = "") {
  return String(value)
    .split(">")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
}

function normalizeSyncTargets(value = "") {
  return String(value || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .map((item) => {
      if (item === "pc") return "pc_node";
      if (item === "mobile") return "mobile_node";
      return item.endsWith("_node") ? item : `${item}_node`;
    });
}

export function detectSecretLikeText(text = "") {
  const matches = [];
  const value = String(text || "");

  for (const [type, pattern] of SECRET_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(value)) {
      matches.push(type);
    }
  }

  return {
    secretDetected: matches.length > 0,
    matches: [...new Set(matches)]
  };
}

export function redactSecretLikeText(text = "") {
  let redacted = String(text || "");

  for (const [type, pattern] of SECRET_PATTERNS) {
    pattern.lastIndex = 0;
    redacted = redacted.replace(pattern, `<REDACTED:${type}>`);
  }

  return redacted;
}

function detectDangerousCommand(command = "") {
  const reasons = [];
  for (const [reason, pattern] of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) {
      reasons.push(reason);
    }
  }
  return [...new Set(reasons)];
}

export function parseAdaptiveCommand(command = "") {
  const rawCommand = String(command || "").trim();
  const tokens = tokenizeCommand(rawCommand);
  const head = tokens[0] || "";

  if (!rawCommand) {
    return {
      valid: false,
      error: "missing_command",
      rawCommand,
      tokens
    };
  }

  if (head === "/clear" || head === "/reset") {
    return {
      valid: true,
      kind: "reset",
      fastCommand: true,
      canonicalCommand: "/reset",
      rawCommand,
      tokens
    };
  }

  if (head === "/status") {
    return {
      valid: true,
      kind: "status",
      fastCommand: true,
      canonicalCommand: "/status",
      rawCommand,
      tokens
    };
  }

  if (head === "/jobs") {
    return {
      valid: true,
      kind: tokens[1] === "get" ? "jobs_get" : "jobs_list",
      fastCommand: true,
      canonicalCommand: tokens[1] === "get" ? "/jobs get <job_id>" : "/jobs",
      jobId: tokens[2] || "",
      rawCommand,
      tokens
    };
  }

  if (head === "/kanban") {
    if (tokens[1] === "boards" && tokens[2] === "list") {
      return {
        valid: true,
        kind: "kanban_boards_list",
        fastCommand: true,
        canonicalCommand: "/kanban boards list",
        rawCommand,
        tokens
      };
    }

    if (tokens[1] === "boards" && tokens[2] === "switch" && tokens[3]) {
      return {
        valid: true,
        kind: "kanban_board_switch",
        fastCommand: true,
        canonicalCommand: "/kanban boards switch <slug>",
        board: slugify(tokens[3]),
        rawCommand,
        tokens
      };
    }

    return {
      valid: false,
      error: "kanban_boards_switch_required",
      rawCommand,
      tokens
    };
  }

  if (head === "/mission") {
    if (tokens[1] === "create" && tokens[2]) {
      return {
        valid: true,
        kind: "mission_create",
        fastCommand: false,
        canonicalCommand: "/mission create \"<name>\"",
        name: tokens.slice(2).join(" ").trim(),
        rawCommand,
        tokens
      };
    }

    if (tokens[1] === "route" && tokens[2]) {
      const { flags } = parseFlags(tokens, 3);
      return {
        valid: true,
        kind: "mission_route",
        fastCommand: false,
        canonicalCommand: "/mission route \"<route>\" --provider <provider> --sync <targets> --mode <mode>",
        route: normalizeRoute(tokens[2]),
        provider: String(flags.provider || "openrouter"),
        syncTargets: normalizeSyncTargets(flags.sync || ""),
        mode: String(flags.mode || "adaptive"),
        rawCommand,
        tokens
      };
    }

    if (tokens[1] === "status") {
      return {
        valid: true,
        kind: "mission_status",
        fastCommand: true,
        canonicalCommand: "/mission status",
        rawCommand,
        tokens
      };
    }
  }

  if (head === "/hermes") {
    if (tokens[1] === "approve" && tokens[2]) {
      return {
        valid: true,
        kind: "approval_intent",
        fastCommand: true,
        canonicalCommand: "/hermes approve <job_id>",
        targetId: tokens[2],
        executionBlocked: true,
        rawCommand,
        tokens
      };
    }

    if (tokens[1] === "cancel" && tokens[2]) {
      return {
        valid: true,
        kind: "cancel_intent",
        fastCommand: true,
        canonicalCommand: "/hermes cancel <job_id>",
        targetId: tokens[2],
        executionBlocked: true,
        rawCommand,
        tokens
      };
    }

    if (tokens[1] === "sync" && tokens[2]) {
      return {
        valid: true,
        kind: "sync_status_request",
        fastCommand: true,
        canonicalCommand: `/hermes sync ${tokens[2]}`,
        syncTargets: normalizeSyncTargets(tokens[2]),
        executionBlocked: true,
        rawCommand,
        tokens
      };
    }

    if (tokens[1] === "mission" && tokens[2] === "create") {
      const { flags } = parseFlags(tokens, 3);
      return {
        valid: true,
        kind: "hermes_mission_create",
        fastCommand: false,
        canonicalCommand:
          "/hermes mission create --board <slug> --name \"<name>\" --route \"<route>\" --provider <provider> --sync <targets> --mode <mode>",
        board: slugify(flags.board || "fusion-team-ai"),
        name: String(flags.name || "Fusion Team AI"),
        route: normalizeRoute(flags.route || ""),
        provider: String(flags.provider || "openrouter"),
        syncTargets: normalizeSyncTargets(flags.sync || ""),
        mode: String(flags.mode || "adaptive"),
        rawCommand,
        tokens
      };
    }
  }

  return {
    valid: false,
    error: "unknown_command",
    rawCommand,
    tokens
  };
}

function baseSafety() {
  return {
    externalWrites: false,
    productionWrites: false,
    customerVisible: false,
    commandExecuted: false,
    providerCalled: false,
    secretsRead: false,
    messageSent: false,
    telegramMessageSent: false,
    canSendTelegram: false,
    canCallProvider: false,
    canExecuteAgents: false,
    canStartMcp: false,
    canInstallPackages: false,
    canDeploy: false,
    canPush: false,
    canPublish: false,
    shouldForwardToLlm: false,
    requiresHumanApproval: true
  };
}

function recommendedCommands() {
  return [
    "/kanban boards switch fusion-team-ai",
    "/mission create \"Fusion Team AI: Hermes Codex Antigravity Adaptive Sync\"",
    "/mission route \"HERMES>CODEX>ANTIGRAVITY\" --provider openrouter --sync pc,mobile --mode adaptive",
    "/mission status"
  ];
}

function buildMission(parsed, requestId, iso) {
  const route = parsed.route?.length ? parsed.route : ["HERMES", "CODEX", "ANTIGRAVITY"];
  const syncTargets = parsed.syncTargets?.length ? parsed.syncTargets : ["pc_node", "mobile_node"];
  const hasRoute = route.length > 0;
  const status = parsed.kind === "mission_create" && !hasRoute ? "DRAFT" : "WAITING_APPROVAL";

  return {
    missionId: makeMissionId(requestId, iso),
    board: parsed.board || "fusion-team-ai",
    name: parsed.name || "Fusion Team AI",
    route,
    provider: parsed.provider || "openrouter",
    modelPolicy: {
      router: MODEL_POLICY.router.model,
      planner: MODEL_POLICY.planner.model,
      reviewer: MODEL_POLICY.reviewer.model
    },
    syncTargets,
    mode: parsed.mode || "adaptive",
    status,
    approvalRequired: status !== "DRAFT",
    nextAction: status === "DRAFT" ? "Configure mission route." : "Approve mission execution."
  };
}

function buildProgressCallbacks(jobId) {
  return [
    { jobId, percent: 10, status: "QUEUED", text: "Parsed command and created queue job." },
    { jobId, percent: 25, status: "ROUTING", text: "Fast router selected mission lane." },
    { jobId, percent: 50, status: "PLANNING", text: "Deep Hermes planner is approval-gated." },
    { jobId, percent: 100, status: "WAITING_APPROVAL", text: "Ready for human approval; workers remain blocked." }
  ];
}

export function extractNightWatchFinalStatus(output = "") {
  const value = String(output || "");
  const direct = value.match(/Hermes night-watch status:\s*(OK|WARN|FAILED)\b/i);
  if (direct) return direct[1].toUpperCase();

  const inline = value.match(/Final Status\s*:?\s*(OK|WARN|FAILED)\b/i);
  if (inline) return inline[1].toUpperCase();

  const lines = value.split(/\r?\n/);
  const headingIndex = lines.findIndex((line) => /^#{1,6}\s*Final Status\s*$/i.test(line.trim()));
  if (headingIndex !== -1) {
    for (const line of lines.slice(headingIndex + 1)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const match = trimmed.match(/^(OK|WARN|FAILED)\b/i);
      if (match) return match[1].toUpperCase();
      break;
    }
  }

  return "UNKNOWN";
}

export function classifyNightWatchCallback(input = {}) {
  const exitCode = Number(input.exitCode ?? 1);
  const finalStatus = extractNightWatchFinalStatus(input.output || input.report || "");
  const logPath = String(input.logPath || ".hermes/logs/night-watch-latest.md");
  const failed = exitCode !== 0 || finalStatus === "FAILED";
  const status = failed
    ? "failed"
    : finalStatus === "WARN"
      ? "completed_with_warning"
      : finalStatus === "OK"
        ? "completed"
        : "completed_unknown";

  return {
    finalStatus,
    exitCode,
    status,
    failed,
    logPath,
    telegramLevel: failed ? "failure" : finalStatus === "WARN" ? "success_warning" : "success",
    shouldNotifyFailure: failed,
    shouldTreatAsCompleted: !failed,
    note: failed
      ? "Night Watch failed or exited non-zero; include log path and request human review."
      : finalStatus === "WARN"
        ? "Night Watch completed with warnings; optional/degraded services should not be reported as script failure."
        : "Night Watch completed."
  };
}

function ackFor(parsed, jobId, mission) {
  if (parsed.kind === "reset") {
    return "✅ Screen cleared and session reset.";
  }
  if (parsed.kind === "status") {
    return "✅ Status request received. Fast local status handler only; no deep model required.";
  }
  if (parsed.kind === "jobs_list") {
    return "✅ Jobs request received. Queue status can be listed locally.";
  }
  if (parsed.kind === "jobs_get") {
    return `✅ Job lookup request received for ${parsed.jobId || "missing job id"}.`;
  }
  if (parsed.kind === "kanban_boards_list") {
    return "✅ Kanban board list request received.";
  }
  if (parsed.kind === "kanban_board_switch") {
    return `✅ Active board switched to ${parsed.board}.`;
  }
  if (parsed.kind === "approval_intent") {
    return `✅ Approval intent captured for ${parsed.targetId}. Execution remains blocked until the worker gate is separately approved.`;
  }
  if (parsed.kind === "cancel_intent") {
    return `✅ Cancel intent captured for ${parsed.targetId}. No worker command executed.`;
  }
  if (parsed.kind === "sync_status_request") {
    return `✅ Sync status request received for ${(parsed.syncTargets || []).join(", ")}.`;
  }

  return [
    "✅ Command received.",
    `Job ID: ${jobId}`,
    `Board: ${mission.board}`,
    `Route: ${mission.route.join(" > ")}`,
    `Status: ${mission.status === "DRAFT" ? "draft" : "queued / waiting approval"}`
  ].join("\n");
}

export function createAdaptiveCommandDryRun(body = {}, options = {}) {
  const iso = safeNow(options);
  const requestId = String(body.requestId || "adaptive-command");
  const source = String(body.source || "telegram");
  const command = String(body.command || body.text || body.message?.text || "").trim();
  const sanitizedCommand = redactSecretLikeText(command);
  const detection = detectSecretLikeText(command);
  const base = {
    ...baseSafety(),
    title: "Hermes Adaptive Command Gateway",
    version: "0.2",
    source,
    requestId,
    createdAt: iso,
    stopPoint: STOP_POINT,
    rawCommandReceived: Boolean(command),
    sanitizedCommand,
    latencyControl: LATENCY_CONTROL
  };

  if (detection.secretDetected) {
    return {
      ...base,
      status: "blocked_secret_detected",
      secretDetected: true,
      secretMatches: detection.matches,
      blockedReasons: ["secret_like_content"],
      ack: {
        shouldRespondImmediately: true,
        timeoutMs: LATENCY_CONTROL.ackTimeoutMs,
        text: "⚠️ Secret-like text detected. I did not forward this command to the model. Rotate or revoke the token if it is real."
      },
      job: { required: false },
      nextActions: ["rotate_or_revoke_possible_token", "remove_secret_from_logs_if_persisted", "retry_with_redacted_command"]
    };
  }

  const dangerous = detectDangerousCommand(command);
  if (dangerous.length > 0) {
    return {
      ...base,
      status: "blocked_dangerous_command",
      secretDetected: false,
      blockedReasons: dangerous,
      ack: {
        shouldRespondImmediately: true,
        timeoutMs: LATENCY_CONTROL.ackTimeoutMs,
        text: "⛔ Command blocked. This gateway is dry-run only and cannot execute workers, send messages, call providers, install packages, start MCP, deploy, push, or publish."
      },
      job: { required: false },
      nextActions: ["rewrite_as_dry_run_plan", "request_specific_execution_approval_packet"]
    };
  }

  const parser = parseAdaptiveCommand(command);
  if (!parser.valid) {
    return {
      ...base,
      status: "invalid_command_syntax",
      secretDetected: false,
      parser,
      ack: {
        shouldRespondImmediately: true,
        timeoutMs: LATENCY_CONTROL.ackTimeoutMs,
        text: "⚠️ Command syntax needs structure. Split board, mission, route, and sync into separate fields."
      },
      job: { required: false },
      recommendedCommands: recommendedCommands()
    };
  }

  const jobRequired = !parser.fastCommand;
  const jobId = makeJobId(requestId, iso);
  const mission = jobRequired ? buildMission(parser, requestId, iso) : null;
  const ackText = ackFor(parser, jobId, mission);
  const status = jobRequired
    ? "long_job_queued_dry_run"
    : parser.kind === "approval_intent"
      ? "approval_intent_captured_dry_run"
      : "fast_ack_ready";

  return {
    ...base,
    status,
    secretDetected: false,
    parser,
    canonicalCommand: parser.canonicalCommand,
    ack: {
      shouldRespondImmediately: true,
      timeoutMs: LATENCY_CONTROL.ackTimeoutMs,
      text: ackText
    },
    job: jobRequired
      ? {
          required: true,
          id: jobId,
          status: "QUEUED",
          currentAgent: "HERMES",
          command: sanitizedCommand,
          commandExecuted: false,
          createdAt: iso,
          updatedAt: iso
        }
      : { required: false },
    queue: jobRequired ? QUEUE_POLICY : null,
    mission,
    progressCallbacks: jobRequired ? buildProgressCallbacks(jobId) : [],
    workerExecution: {
      hermesPlanner: false,
      codex: false,
      antigravity: false,
      pcNode: false,
      mobileNode: false
    },
    syncPolicy: {
      pcNode: "heavy execution after approval only",
      mobileNode: "status and approval only",
      telegram: "command, status, approval, report surface"
    },
    nextActions: jobRequired ? ["review_mission_packet", "wait_for_human_approval"] : ["return_fast_ack_only"]
  };
}

export function getAdaptiveCommandGatewayStatus(options = {}) {
  return {
    ...baseSafety(),
    title: "Hermes Adaptive Command Gateway",
    version: "0.2",
    status: "hermes-adaptive-command-gateway-ready-local-only",
    mode: "fast-ack-queue-dry-run",
    generatedAt: safeNow(options),
    aliases: {
      clear: "reset"
    },
    commandRegistry: COMMAND_REGISTRY,
    modelPolicy: MODEL_POLICY,
    queuePolicy: QUEUE_POLICY,
    latencyControl: LATENCY_CONTROL,
    nodePolicy: {
      pcNode: {
        role: "heavy_execution_after_approval",
        allowedBeforeApproval: ["status", "heartbeat"],
        blockedBeforeApproval: ["code_execution", "repo_mutation", "build", "test_worker_start"]
      },
      mobileNode: {
        role: "monitor_and_approve",
        allowedBeforeApproval: ["status", "approval_review"],
        blockedBeforeApproval: ["file_mutation", "provider_call", "agent_execution"]
      }
    },
    blockedActions: BLOCKED_ACTIONS,
    nightWatchCallbackPolicy: {
      ok: classifyNightWatchCallback({ exitCode: 0, output: "Hermes night-watch status: OK" }),
      warn: classifyNightWatchCallback({ exitCode: 0, output: "Hermes night-watch status: WARN" }),
      failed: classifyNightWatchCallback({ exitCode: 1, output: "Hermes night-watch status: FAILED" })
    },
    supportedJobStatuses: [
      "QUEUED",
      "ROUTING",
      "PLANNING",
      "RUNNING_CODEX",
      "RUNNING_ANTIGRAVITY",
      "SYNCING_PC_NODE",
      "SYNCING_MOBILE_NODE",
      "WAITING_APPROVAL",
      "DONE",
      "FAILED"
    ],
    recommendedFirstCommands: recommendedCommands(),
    stopPoint: STOP_POINT
  };
}
