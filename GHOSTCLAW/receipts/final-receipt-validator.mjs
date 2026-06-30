#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const defaultReceiptPath = ".ghostclaw_runtime/a2a2a/receipt/telegram_hermes_agent_ghostclaws_full_build_final.json";
const receiptPath = process.argv[2] || defaultReceiptPath;

function readJson(relativePath) {
  const absolutePath = path.resolve(repoRoot, relativePath);
  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
}

function hasValue(value) {
  return value !== undefined && value !== null && value !== "";
}

function pushIfMissing(errors, condition, message) {
  if (!condition) errors.push(message);
}

function validationMap(receipt) {
  const entries = Array.isArray(receipt.validations_run_current_turn)
    ? receipt.validations_run_current_turn
    : [];
  return Object.fromEntries(entries.map((entry) => [entry.name, entry.result]));
}

function validateSmokeReceipt(receipt, errors) {
  const smoke = receipt.validations_run_current_turn?.find((entry) => entry.name === "browser_use_smoke");
  pushIfMissing(errors, smoke?.receipt, "browser_use_smoke receipt path is missing");
  if (!smoke?.receipt) return;

  const smokeReceipt = readJson(smoke.receipt);
  const steps = Array.isArray(smokeReceipt.steps) ? smokeReceipt.steps : [];
  const stepByName = Object.fromEntries(steps.map((step) => [step.step, step]));

  pushIfMissing(errors, smokeReceipt.overall === "pass", "browser smoke overall is not pass");
  pushIfMissing(errors, stepByName.open_url?.http_status === 200, "browser smoke did not prove HTTP 200");
  pushIfMissing(errors, stepByName.r0_tab_click?.status === "pass", "browser smoke did not prove R0 tab click");
  pushIfMissing(errors, stepByName.active_goal_panel_found?.status === "pass", "browser smoke did not prove Active Goal panel");
  pushIfMissing(errors, stepByName.packet_013_found?.status === "pass", "browser smoke did not prove packet_013");
  pushIfMissing(errors, stepByName.blocker_found?.status === "pass", "browser smoke did not prove blocker text");
  pushIfMissing(errors, (smokeReceipt.console_errors || []).length === 0, "browser smoke console errors are not zero");
  pushIfMissing(errors, (smokeReceipt.page_errors || []).length === 0, "browser smoke page errors are not zero");
}

function validateRequiredArtifacts(errors) {
  const requiredArtifacts = [
    "GHOSTCLAW/workers/registry/worker-registry.json",
    "GHOSTCLAW/workers/registry/worker-capabilities.schema.json",
    "GHOSTCLAW/workers/core/worker-message-schema.json",
    "GHOSTCLAW/workers/core/worker-runtime.mjs",
    "GHOSTCLAW/workers/core/worker-router.mjs",
    "GHOSTCLAW/workers/core/worker-heartbeat.mjs",
    "GHOSTCLAW/workers/core/worker-receipt.mjs",
    "GHOSTCLAW/agents/auto-approve-engine.mjs",
    "GHOSTCLAW/agents/auto-approve-engine.test.mjs",
    "GHOSTCLAW/policies/action-tier-cap.yaml",
    "GHOSTCLAW/policies/approval-matrix.yaml",
    "GHOSTCLAW/protocols/a2a2a-message-schema.json",
    "GHOSTCLAW/protocols/A2A2A_PROTOCOL.md",
    "GHOSTCLAW/protocols/brainstorm-terminology-policy.yaml",
    ".ghostclaw_runtime/a2a2a/templates/worker-message.json",
    ".ghostclaw_runtime/a2a2a/templates/worker-receipt.json",
    ".ghostclaw_runtime/a2a2a/templates/worker-heartbeat.json",
    ".ghostclaw_runtime/a2a2a/templates/evidence-pack.json",
    ".ghostclaw_runtime/a2a2a/templates/decision-artifact.json",
    "GHOSTCLAW/workers/browser-use/browser-use-worker.mjs",
    "GHOSTCLAW/workers/browser-use/browser-use.policy.yaml",
    "GHOSTCLAW/workers/browser-use/browser-use-smoke.mjs",
    "docs/knowledge/BROWSER_USE_GHOSTCLAWS_WORKER.md",
    "GHOSTCLAW/vibe/vibe-task-parser.mjs",
    "GHOSTCLAW/vibe/vibe-agent-router.mjs",
    "GHOSTCLAW/vibe/vibe-agent-router.test.mjs",
    "GHOSTCLAW/vibe/vibe-task-graph.schema.json",
    "GHOSTCLAW/vibe/vibe-execution-plan.template.json",
    "docs/knowledge/GHOSTCLAWS_VIBE_CODING_AGENT.md",
    "GHOSTCLAW/models/model-registry.yaml",
    "GHOSTCLAW/models/model-swap-policy.yaml",
    "GHOSTCLAW/models/model-router.mjs",
    "GHOSTCLAW/models/model-router.test.mjs",
    "GHOSTCLAW/models/provider-health.mjs",
    "GHOSTCLAW/workers/model-swap/model-swap-worker.mjs",
    "GHOSTCLAW/workers/model-swap/model-swap.policy.yaml",
    ".ghostclaw_runtime/a2a2a/templates/model-swap-receipt.json",
    "docs/knowledge/GHOSTCLAWS_AUTO_MODEL_SWAP.md",
    "docs/knowledge/KIMI_K2_7_CODE_GHOSTCLAW_WORKER.md",
    "GHOSTCLAW/workers/kimi/kimi-worker.policy.yaml",
    "GHOSTCLAW/workers/kimi/kimi-reference-vote.schema.json",
    "skills/ghostclaw-agent-ghostclaws-thai-jarvis/SKILL.md",
    "docs/knowledge/GHOSTCLAWS_SUB_AGENT_TEAM.md",
    "docs/knowledge/SIRINX_LATENTMAS_GHOSTCLAW_INTEGRATION.md",
    ".ghostclaw_runtime/latent",
    "GHOSTCLAW/research/github-toptrend-worker.mjs",
    "GHOSTCLAW/research/github-toptrend-map.yaml",
    "docs/knowledge/GITHUB_TOPTREND_AGENT_RESEARCH_WORKFLOW.md",
    "docs/knowledge/EDGEONE_MAKERS_DEPLOYMENT_STRATEGY.md",
    "docs/knowledge/EDGEONE_AGENT_RUNTIME_CHECKLIST.md",
    ".ghostclaw_runtime/a2a2a/templates/edgeone-deploy-packet.json",
    ".ghostclaw_runtime/a2a2a/templates/edgeone-smoke-test-receipt.json",
    "GHOSTCLAW/workers/edgeone/edgeone-readiness-worker.mjs"
  ];

  for (const artifact of requiredArtifacts) {
    pushIfMissing(errors, fs.existsSync(path.resolve(repoRoot, artifact)), `missing required artifact: ${artifact}`);
  }

  return requiredArtifacts.length;
}

function validatePhase1WorkerRuntimeArtifacts(errors) {
  const registry = readJson("GHOSTCLAW/workers/registry/worker-registry.json");
  const workers = Array.isArray(registry.workers) ? registry.workers : [];
  pushIfMissing(errors, workers.length > 0, "phase1 worker registry has no workers");

  const requiredWorkerFields = [
    "id",
    "role",
    "model_lane",
    "capabilities",
    "allowed_actions",
    "blocked_actions",
    "input_schema",
    "output_schema",
    "heartbeat_required",
    "receipt_required",
    "self_approval_allowed"
  ];

  const seenIds = new Set();
  for (const worker of workers) {
    for (const field of requiredWorkerFields) {
      pushIfMissing(errors, hasValue(worker[field]), `phase1 worker ${worker.name || worker.id || "unknown"} missing field: ${field}`);
    }
    pushIfMissing(errors, !seenIds.has(worker.id), `phase1 duplicate worker id: ${worker.id}`);
    seenIds.add(worker.id);
    pushIfMissing(errors, Array.isArray(worker.capabilities) && worker.capabilities.length > 0, `phase1 worker ${worker.id} missing capabilities`);
    pushIfMissing(errors, Array.isArray(worker.allowed_actions) && worker.allowed_actions.length > 0, `phase1 worker ${worker.id} missing allowed_actions`);
    pushIfMissing(errors, Array.isArray(worker.blocked_actions), `phase1 worker ${worker.id} missing blocked_actions array`);
    pushIfMissing(errors, worker.blocked_actions?.includes("self_approval"), `phase1 worker ${worker.id} does not block self_approval`);
    pushIfMissing(errors, worker.self_approval_allowed === false, `phase1 worker ${worker.id} allows self approval`);
    pushIfMissing(errors, worker.heartbeat_required === true, `phase1 worker ${worker.id} does not require heartbeat`);
    pushIfMissing(errors, worker.receipt_required === true, `phase1 worker ${worker.id} does not require receipt`);
  }

  const messageSchema = readJson("GHOSTCLAW/workers/core/worker-message-schema.json");
  const messageProperties = messageSchema.properties || {};
  for (const field of ["decision_id", "evidence_pack", "requester_agent", "approver_agent", "receipt_required"]) {
    pushIfMissing(errors, hasValue(messageProperties[field]), `phase1 worker message schema missing field: ${field}`);
  }

  const runtimeText = fs.readFileSync(path.resolve(repoRoot, "GHOSTCLAW/workers/core/worker-runtime.mjs"), "utf8");
  for (const marker of [
    "validateDispatchContract",
    "missing_decision_id",
    "missing_evidence_pack",
    "receipt_required_must_be_true",
    "missing_requester_or_approver_agent"
  ]) {
    pushIfMissing(errors, runtimeText.includes(marker), `phase1 worker runtime missing guard marker: ${marker}`);
  }

  const receiptText = fs.readFileSync(path.resolve(repoRoot, "GHOSTCLAW/workers/core/worker-receipt.mjs"), "utf8");
  for (const marker of [
    "decisionId",
    "Receipt requires evidencePack",
    "Worker action receipts require receiptRequired=true",
    "Self-approval detected in receipt write"
  ]) {
    pushIfMissing(errors, receiptText.includes(marker), `phase1 worker receipt missing guard marker: ${marker}`);
  }

  return {
    worker_count: workers.length,
    required_worker_field_count: requiredWorkerFields.length
  };
}

function validatePhase3ProtocolArtifacts(errors) {
  const schema = readJson("GHOSTCLAW/protocols/a2a2a-message-schema.json");
  const schemaProperties = schema.properties || {};
  const requiredSchemaFields = [
    "task_id",
    "correlation_id",
    "decision_id",
    "brainstorm_id",
    "phase",
    "from_agent",
    "to_agent",
    "worker_id",
    "action_class",
    "evidence_pack",
    "autonomous_approval",
    "requester_agent",
    "approver_agent",
    "human_approval_required",
    "receipt_required",
    "latent_plane",
    "control_plane_required",
    "moa_summary",
    "moa_gated_brainstorm",
    "browser_use",
    "edgeone"
  ];

  for (const field of requiredSchemaFields) {
    pushIfMissing(errors, hasValue(schemaProperties[field]), `phase3 schema missing optional compatibility field: ${field}`);
  }

  pushIfMissing(
    errors,
    schemaProperties.terminology_policy?.properties?.canonical?.const === "brainstorm",
    "phase3 schema does not lock brainstorm as canonical terminology"
  );
  pushIfMissing(
    errors,
    schemaProperties.terminology_policy?.properties?.deprecated_aliases?.items?.enum?.includes("beststorm"),
    "phase3 schema does not document beststorm as a deprecated alias"
  );
  pushIfMissing(
    errors,
    schemaProperties.terminology_policy?.properties?.invalid_typos?.items?.enum?.includes("beststrom"),
    "phase3 schema does not document beststrom as an invalid typo"
  );

  const templatePaths = [
    ".ghostclaw_runtime/a2a2a/templates/worker-message.json",
    ".ghostclaw_runtime/a2a2a/templates/worker-receipt.json",
    ".ghostclaw_runtime/a2a2a/templates/worker-heartbeat.json",
    ".ghostclaw_runtime/a2a2a/templates/evidence-pack.json",
    ".ghostclaw_runtime/a2a2a/templates/decision-artifact.json"
  ];
  const requiredTemplateFields = [
    "task_id",
    "correlation_id",
    "brainstorm_id",
    "phase",
    "from_agent",
    "to_agent",
    "worker_id",
    "human_approval_required",
    "receipt_required",
    "latent_plane",
    "control_plane_required",
    "moa_summary",
    "moa_gated_brainstorm",
    "browser_use",
    "edgeone"
  ];

  for (const templatePath of templatePaths) {
    const template = readJson(templatePath);
    const properties = template.properties || {};
    for (const field of requiredTemplateFields) {
      pushIfMissing(errors, hasValue(properties[field]), `phase3 template ${templatePath} missing field: ${field}`);
    }
  }

  const policyText = fs.readFileSync(path.resolve(repoRoot, "GHOSTCLAW/protocols/brainstorm-terminology-policy.yaml"), "utf8");
  pushIfMissing(errors, /canonical_term:\s*brainstorm/.test(policyText), "brainstorm terminology policy missing canonical_term: brainstorm");
  pushIfMissing(errors, /beststorm/.test(policyText), "brainstorm terminology policy missing beststorm legacy alias");
  pushIfMissing(errors, /beststrom/.test(policyText), "brainstorm terminology policy missing beststrom invalid typo");
  pushIfMissing(errors, /json_control_plane_authority:\s*true/.test(policyText), "brainstorm terminology policy does not make JSON control plane authoritative");
  pushIfMissing(errors, /latent_plane_authority:\s*false/.test(policyText), "brainstorm terminology policy does not mark latent plane non-authoritative");

  const protocolText = fs.readFileSync(path.resolve(repoRoot, "GHOSTCLAW/protocols/A2A2A_PROTOCOL.md"), "utf8");
  pushIfMissing(errors, /JSON control plane is the source of truth/.test(protocolText), "A2A2A protocol does not state JSON control plane source of truth");
  pushIfMissing(errors, /forbids KV-only execution/.test(protocolText), "A2A2A protocol does not forbid KV-only execution");

  return {
    schema_field_count: requiredSchemaFields.length,
    template_count: templatePaths.length
  };
}

function validatePhase5VibeArtifacts(errors) {
  const parserText = fs.readFileSync(path.resolve(repoRoot, "GHOSTCLAW/vibe/vibe-task-parser.mjs"), "utf8");
  for (const marker of [
    "parseMultiStepCommand",
    "normalizeTerminology",
    "checkBlocked",
    "brainstorm",
    "beststorm",
    "beststrom"
  ]) {
    pushIfMissing(errors, parserText.includes(marker), `phase5 vibe parser missing marker: ${marker}`);
  }

  const routerText = fs.readFileSync(path.resolve(repoRoot, "GHOSTCLAW/vibe/vibe-agent-router.mjs"), "utf8");
  for (const marker of [
    "createApprovalDecision",
    "validateExecutablePlan",
    "approval_status !== 'approved'",
    "decision_id",
    "receipt_required",
    "evidence_pack",
    "archive_path"
  ]) {
    pushIfMissing(errors, routerText.includes(marker), `phase5 vibe router missing marker: ${marker}`);
  }

  const template = readJson("GHOSTCLAW/vibe/vibe-execution-plan.template.json");
  const templateProperties = template.properties || {};
  for (const field of ["decision_id", "human_approval_required", "receipt_required", "mutual_approval", "evidence_pack"]) {
    pushIfMissing(errors, hasValue(templateProperties[field]), `phase5 vibe execution template missing field: ${field}`);
  }

  const evidenceProperties = templateProperties.evidence_pack?.properties || {};
  for (const field of ["id", "receipt_required", "requester_agent", "approver_agent", "decision_id", "artifacts"]) {
    pushIfMissing(errors, hasValue(evidenceProperties[field]), `phase5 vibe evidence pack missing field: ${field}`);
  }

  const testText = fs.readFileSync(path.resolve(repoRoot, "GHOSTCLAW/vibe/vibe-agent-router.test.mjs"), "utf8");
  for (const marker of [
    "parses natural language",
    "mutual approval decision",
    "rejects self-approval",
    "archives blocked commands",
    "dry-run pipeline"
  ]) {
    pushIfMissing(errors, testText.includes(marker), `phase5 vibe test missing case marker: ${marker}`);
  }

  return {
    required_router_marker_count: 7,
    required_template_field_count: 5,
    required_test_case_count: 5
  };
}

function validateCommitHash(receipt, errors) {
  if (!String(receipt.commit_status || "").includes("committed")) return;

  const commitHash = String(receipt.commit_hash || "");
  pushIfMissing(errors, /^[0-9a-f]{7,40}$/.test(commitHash), "commit_status is committed but commit_hash is missing or invalid");
  if (!/^[0-9a-f]{7,40}$/.test(commitHash)) return;

  const result = spawnSync("git", ["cat-file", "-e", `${commitHash}^{commit}`], {
    cwd: repoRoot,
    stdio: "ignore"
  });
  pushIfMissing(errors, result.status === 0, `commit_hash does not resolve to a local commit: ${commitHash}`);
}

export function validateFinalReceipt(receipt) {
  const errors = [];
  const requiredArtifactCount = validateRequiredArtifacts(errors);
  const phase1WorkerRuntime = validatePhase1WorkerRuntimeArtifacts(errors);
  const phase3Protocol = validatePhase3ProtocolArtifacts(errors);
  const phase5Vibe = validatePhase5VibeArtifacts(errors);
  const requiredTopLevel = [
    "task_id",
    "correlation_id",
    "approval_mode",
    "requester_agent",
    "approver_agent",
    "phases",
    "current_turn_files_created",
    "current_turn_files_modified",
    "files_changed",
    "files_created",
    "files_modified",
    "workers_created_or_present",
    "workers_created",
    "status_summary",
    "browser_use_status",
    "vibe_agent_status",
    "a2a_sync_status",
    "model_swap_status",
    "kimi_worker_status",
    "skill_created",
    "edgeone_readiness_status",
    "validations_run_current_turn",
    "validations_run",
    "validation_results",
    "blocked_actions",
    "skipped_actions",
    "observed_out_of_scope_or_parallel_files",
    "safety_flags",
    "commit_status"
  ];

  for (const key of requiredTopLevel) {
    pushIfMissing(errors, hasValue(receipt[key]), `missing required receipt field: ${key}`);
  }

  const status = receipt.status_summary || {};
  const requiredStatuses = [
    "worker_runtime_status",
    "browser_use_status",
    "vibe_agent_status",
    "a2a_sync_status",
    "model_swap_status",
    "kimi_worker_status",
    "moa_brainstorm_status",
    "skill_creator_status",
    "github_toptrend_worker_status",
    "edgeone_readiness_status"
  ];

  for (const key of requiredStatuses) {
    pushIfMissing(errors, hasValue(status[key]), `missing status_summary field: ${key}`);
  }

  const validations = validationMap(receipt);
  const requiredValidationNames = [
    "a2a2a_schema_json",
    "a2a2a_template_json",
    "auto_approve_engine",
    "local_commit_allowed_scope_decision",
    "model_router",
    "latentmas_cargo_offline",
    "latentmas_python_compile",
    "latentmas_gateway_direct_test",
    "browser_use_smoke",
    "diff_check"
  ];

  for (const name of requiredValidationNames) {
    pushIfMissing(errors, hasValue(validations[name]), `missing validation result: ${name}`);
  }

  const safety = receipt.safety_flags || {};
  for (const key of [
    "no_push",
    "no_deploy",
    "no_secret_access",
    "no_model_download",
    "no_gpu_live_inference",
    "no_telegram_live_send",
    "no_customer_send"
  ]) {
    pushIfMissing(errors, safety[key] === true, `safety flag is not true: ${key}`);
  }

  validateCommitHash(receipt, errors);

  validateSmokeReceipt(receipt, errors);

  return {
    ok: errors.length === 0,
    errors,
    checked: {
      receipt_path: receiptPath,
      validation_count: Object.keys(validations).length,
      required_artifact_count: requiredArtifactCount,
      phase1_worker_count: phase1WorkerRuntime.worker_count,
      phase1_required_worker_field_count: phase1WorkerRuntime.required_worker_field_count,
      phase3_schema_field_count: phase3Protocol.schema_field_count,
      phase3_template_count: phase3Protocol.template_count,
      phase5_vibe_router_marker_count: phase5Vibe.required_router_marker_count,
      phase5_vibe_template_field_count: phase5Vibe.required_template_field_count,
      phase5_vibe_test_case_count: phase5Vibe.required_test_case_count,
      created_file_count: receipt.current_turn_files_created?.length || 0,
      modified_file_count: receipt.current_turn_files_modified?.length || 0,
      blocked_action_count: receipt.blocked_actions?.length || 0,
      observed_out_of_scope_count: receipt.observed_out_of_scope_or_parallel_files?.length || 0
    }
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const receipt = readJson(receiptPath);
  const result = validateFinalReceipt(receipt);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}
