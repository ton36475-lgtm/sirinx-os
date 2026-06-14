import { existsSync, readFileSync } from "node:fs";

export const hermesSpecFirstApprovalPhrase = "APPROVE_IMPLEMENTATION";
export const hermesSpecFirstStopPoint =
  "HERMES SPEC-FIRST SWARM READY - LIVE LOCAL STATE - WAITING FOR APPROVE_IMPLEMENTATION";

export const hermesSpecFirstStateFiles = [
  ".hermes/context.md",
  ".hermes/state.json",
  ".hermes/agent-roles.md",
  ".hermes/approval-log.md",
  ".hermes/decision-log.md",
  ".hermes/risk-register.md"
];

export const hermesSpecFirstWorkflowDocs = [
  "docs/00-project-brief.md",
  "docs/01-requirements.md",
  "docs/02-design-direction.md",
  "docs/03-technical-spec.md",
  "docs/04-implementation-plan.md",
  "docs/05-qa-checklist.md",
  "docs/06-release-report.md"
];

export const hermesSpecFirstBlockedActions = [
  "write_code_before_approval",
  "modify_source_without_approval",
  "install_packages",
  "deploy",
  "push",
  "publish",
  "real_mcp_execution",
  "external_connector_activation",
  "paid_api_call",
  "secret_read_or_print",
  "message_send",
  "agent_auto_start"
];

export const hermesSpecFirstPhases = [
  "INIT",
  "GRILLING",
  "CONTEXT_UPDATE",
  "PROTOTYPE",
  "VISUAL_REVIEW",
  "SPEC_WRITING",
  "SELF_REVIEW",
  "SPEC_FIX",
  "ENV_SCAN",
  "SPEC_SYNC",
  "APPROVAL_GATE",
  "IMPLEMENTATION",
  "SMOKE_TEST",
  "DEBUG_LOOP",
  "FINAL_QA",
  "REPORT"
];

export const hermesSpecFirstAgentRoles = [
  {
    id: "hermes-orchestrator",
    title: "Hermes Orchestrator",
    owns: "Workflow routing, state, approval gate, and final stop point.",
    blocked: ["write_code_without_spec", "skip_approval_gate"]
  },
  {
    id: "context-manager",
    title: "Context Manager",
    owns: "Maintain context.md, state.json, decision log, and risk register.",
    blocked: ["drop_confirmed_requirement", "leave_state_unrecorded"]
  },
  {
    id: "grill-agent",
    title: "Grill Agent",
    owns: "Ask structured requirement questions and narrow scope.",
    blocked: ["start_implementation", "ask_unbounded_questions_only"]
  },
  {
    id: "spec-writer",
    title: "Spec Writer",
    owns: "Convert confirmed requirements into precise docs and implementation rules.",
    blocked: ["use_vague_design_terms_without_rules", "write_unapproved_scope"]
  },
  {
    id: "environment-scanner",
    title: "Environment Scanner",
    owns: "Detect the real repo stack before implementation.",
    blocked: ["assume_framework", "ignore_existing_conventions"]
  },
  {
    id: "coder-agent",
    title: "Coder Agent",
    owns: "Implement only from the approved specification.",
    blocked: ["add_unapproved_features", "rewrite_unrelated_files", "modify_source_before_approval"]
  },
  {
    id: "qa-guardrail-agent",
    title: "QA / Guardrail Agent",
    owns: "Validate responsive UX, accessibility, build, lint, smoke, and render checks.",
    blocked: ["approve_without_test", "claim_completion_without_evidence"]
  },
  {
    id: "reporter-agent",
    title: "Reporter Agent",
    owns: "Summarize changes, tests, known issues, and next action.",
    blocked: ["claim_unrun_tests", "hide_known_issue"]
  }
];

const dangerousGoalRules = [
  ["write_code_before_approval", /\b(write code|code now|implement|modify source|edit source|patch|create component)\b/i],
  ["modify_source_without_approval", /\b(modify|rewrite|delete file|save file|apply patch)\b/i],
  ["install_packages", /\b(install|npm i|pnpm add|pnpm install|pip install|cargo install|brew install)\b/i],
  ["deploy", /\b(deploy|wrangler deploy|vercel deploy|cloudflare pages deploy)\b/i],
  ["push", /\b(push|git push)\b/i],
  ["publish", /\b(publish|release|submit|upload)\b/i],
  ["real_mcp_execution", /\b(mcp|model context protocol|start server|start-server)\b/i],
  ["external_connector_activation", /\b(activate connector|connect live|oauth|external connector)\b/i],
  ["paid_api_call", /\b(call provider|paid api|openrouter call|run qwen|invoke qwen|provider call)\b/i],
  ["secret_read_or_print", /\b(secret|token|api key|apikey|password|credential|\.env)\b/i],
  ["message_send", /\b(send|dm|telegram|line|email|sms|notify|reply)\b/i],
  ["agent_auto_start", /\b(auto[- ]?start|launch agent|start agent|ollama launch|hermes --tui)\b/i]
];

const phaseAllowedActions = {
  INIT: ["CAPTURE_GOAL", "ASSIGN_ROLES", "INITIALIZE_CONTEXT"],
  GRILLING: ["ASK_STRUCTURED_QUESTIONS", "UPDATE_CONTEXT", "WRITE_SPEC_DOCS"],
  CONTEXT_UPDATE: ["UPDATE_CONTEXT", "UPDATE_STATE", "RECORD_DECISION"],
  PROTOTYPE: ["CREATE_LOW_FIDELITY_MOCKUP_PLAN", "COLLECT_VISUAL_FEEDBACK"],
  VISUAL_REVIEW: ["SUMMARIZE_FEEDBACK", "UPDATE_DESIGN_DIRECTION"],
  SPEC_WRITING: ["WRITE_REQUIREMENTS", "WRITE_TECHNICAL_SPEC", "WRITE_QA_CHECKLIST"],
  SELF_REVIEW: ["CHECK_TBD", "CHECK_CONFLICTS", "CHECK_MISSING_REQUIREMENTS"],
  SPEC_FIX: ["RESOLVE_TBD", "SYNC_SPEC"],
  ENV_SCAN: ["READ_PACKAGE_JSON", "READ_FILE_TREE", "RECORD_STACK"],
  SPEC_SYNC: ["ALIGN_SPEC_WITH_STACK", "UPDATE_IMPLEMENTATION_PLAN"],
  APPROVAL_GATE: ["WAIT_FOR_APPROVE_IMPLEMENTATION", "SHOW_STOP_POINT"],
  IMPLEMENTATION: ["BLOCKED_UNTIL_APPROVE_IMPLEMENTATION"],
  SMOKE_TEST: ["BLOCKED_UNTIL_IMPLEMENTATION"],
  DEBUG_LOOP: ["BLOCKED_UNTIL_SMOKE_FAILURE"],
  FINAL_QA: ["BLOCKED_UNTIL_SMOKE_PASS"],
  REPORT: ["BLOCKED_UNTIL_QA_PASS"]
};

function nowIso(options) {
  const now = options.now || (() => new Date());
  return now().toISOString();
}

function capabilityLock() {
  return {
    externalWrites: false,
    productionWrites: false,
    customerVisible: false,
    commandExecuted: false,
    canExecuteExternally: false,
    canModifySource: false,
    canInstallPackages: false,
    canStartMcp: false,
    canRunMcp: false,
    canCallProvider: false,
    canReadSecrets: false,
    canSendMessages: false,
    canDeploy: false,
    canPush: false,
    canPublish: false,
    canAutoStartAgents: false,
    requiresHumanApproval: true
  };
}

function readStateFile() {
  try {
    return JSON.parse(readFileSync(".hermes/state.json", "utf8"));
  } catch {
    return {};
  }
}

function fileStatus(path) {
  return {
    path,
    exists: existsSync(path)
  };
}

function classifyGoal(goal) {
  return dangerousGoalRules.filter(([, pattern]) => pattern.test(goal)).map(([reason]) => reason);
}

function normalizePhase(phase, fallback = "APPROVAL_GATE") {
  const candidate = String(phase || fallback).trim().toUpperCase();
  return hermesSpecFirstPhases.includes(candidate) ? candidate : fallback;
}

export function getHermesSpecFirstSwarmStatus(options = {}) {
  const state = readStateFile();
  const requiredFiles = [...hermesSpecFirstStateFiles, ...hermesSpecFirstWorkflowDocs].map(fileStatus);
  const currentPhase = normalizePhase(state.current_phase, "APPROVAL_GATE");

  return {
    title: "Hermes Spec-First Swarm",
    status: "hermes-spec-first-swarm-ready-live-local-state",
    mode: "live-local-project-state-standard",
    ...capabilityLock(),
    projectName: state.project_name || "SIRINXDev Unified Agent-Native Monorepo",
    currentPhase,
    approvalStatus: state.approval_status || "NOT_APPROVED",
    approvalPhrase: hermesSpecFirstApprovalPhrase,
    requirementsComplete: Boolean(state.requirements_complete),
    specComplete: Boolean(state.spec_complete),
    environmentScanned: state.environment_scanned !== false,
    implementationStarted: Boolean(state.implementation_started),
    smokeTestPassed: Boolean(state.smoke_test_passed),
    qaPassed: Boolean(state.qa_passed),
    nextRequiredAction: state.next_required_action || "Wait for APPROVE_IMPLEMENTATION before modifying source code.",
    sourceOfTruth: [
      ".hermes/context.md",
      ".hermes/state.json",
      "docs/03-technical-spec.md",
      "docs/05-qa-checklist.md"
    ],
    requiredFiles,
    missingFiles: requiredFiles.filter((file) => !file.exists).map((file) => file.path),
    agentRoles: hermesSpecFirstAgentRoles,
    phaseMachine: hermesSpecFirstPhases,
    phaseAllowedActions,
    workflow: ["Prompt", "Requirement", "Context Memory", "Spec", "Approval", "Code", "Test", "Report"],
    notWorkflow: ["Prompt", "Code immediately"],
    blockedActions: hermesSpecFirstBlockedActions,
    stopPoint: hermesSpecFirstStopPoint,
    updatedAt: nowIso(options)
  };
}

export function createHermesSpecFirstSwarmDryRun(body = {}, options = {}) {
  const requestId = String(body.requestId || "hermes-spec-first-swarm-dry-run");
  const goal = String(body.goal || "spec-first local planning").trim();
  const selectedPhase = normalizePhase(body.phase, "APPROVAL_GATE");
  const blockedReasons = classifyGoal(goal);

  if (blockedReasons.length > 0) {
    return {
      title: "Hermes Spec-First Swarm Dry-Run",
      status: "blocked-hermes-spec-first-swarm-dry-run",
      mode: "local-only-dry-run",
      requestId,
      selectedPhase,
      goal,
      classification: "blocked",
      blockedReasons,
      nextAllowedActions: ["RETURN_TO_REQUIREMENTS", "UPDATE_CONTEXT", "WAIT_FOR_APPROVE_IMPLEMENTATION"],
      ...capabilityLock(),
      evidencePacket: {
        path: "docs/knowledge/SIRINX_HERMES_SPEC_FIRST_SWARM_V1.md",
        didWriteFromApi: false,
        commandExecuted: false,
        updatedAt: nowIso(options)
      },
      stopPoint: hermesSpecFirstStopPoint,
      updatedAt: nowIso(options)
    };
  }

  return {
    title: "Hermes Spec-First Swarm Dry-Run",
    status: "dry-run-hermes-spec-first-swarm-ready",
    mode: "local-only-dry-run",
    requestId,
    selectedPhase,
    goal,
    classification: "phase_safe_plan",
    nextAllowedActions: phaseAllowedActions[selectedPhase] || phaseAllowedActions.APPROVAL_GATE,
    selectedAgentRoles: ["hermes-orchestrator", "context-manager", "spec-writer", "qa-guardrail-agent"],
    approvalPhrase: hermesSpecFirstApprovalPhrase,
    ...capabilityLock(),
    evidencePacket: {
      path: "docs/knowledge/SIRINX_HERMES_SPEC_FIRST_SWARM_V1.md",
      didWriteFromApi: false,
      commandExecuted: false,
      phase: selectedPhase,
      updatedAt: nowIso(options)
    },
    stopPoint: hermesSpecFirstStopPoint,
    updatedAt: nowIso(options)
  };
}
