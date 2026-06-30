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
    "GHOSTCLAW/workers/kimi/kimi-reference-vote.test.mjs",
    "skills/ghostclaw-agent-ghostclaws-thai-jarvis/SKILL.md",
    "docs/knowledge/GHOSTCLAWS_SUB_AGENT_TEAM.md",
    "docs/knowledge/MOA_GATED_BRAINSTORM.md",
    "GHOSTCLAW/protocols/moa-gated-brainstorm.test.mjs",
    "docs/knowledge/SIRINX_LATENTMAS_GHOSTCLAW_INTEGRATION.md",
    ".ghostclaw_runtime/latent",
    ".ghostclaw_runtime/latent/latent-manifest.json",
    ".ghostclaw_runtime/latent/control-plane-manifest.json",
    ".ghostclaw_runtime/latent/kv-compatibility-gate.json",
    "GHOSTCLAW/protocols/latentmas-dual-plane.test.mjs",
    "GHOSTCLAW/protocols/zero-prompting-skill-contract.test.mjs",
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

function validatePhase6ModelRouterArtifacts(errors) {
  const routerText = fs.readFileSync(path.resolve(repoRoot, "GHOSTCLAW/models/model-router.mjs"), "utf8");
  for (const marker of [
    "createEngine",
    "ProviderHealthCheck",
    "getPolicyDecision",
    "resolveProviderFallback",
    "policy_gate",
    "action_tier_cap is final authority"
  ]) {
    pushIfMissing(errors, routerText.includes(marker), `phase6 model router missing marker: ${marker}`);
  }

  const testText = fs.readFileSync(path.resolve(repoRoot, "GHOSTCLAW/models/model-router.test.mjs"), "utf8");
  for (const marker of [
    "routes code_patch to Kimi K2.7 Code",
    "blocks model_download (tier X)",
    "blocks gpu_inference (tier X)",
    "blocks D/X action class even when the task lane would otherwise route",
    "provider health fallback is metadata-only",
    "ModelSwapWorker — receipt contract"
  ]) {
    pushIfMissing(errors, testText.includes(marker), `phase6 model router test missing case marker: ${marker}`);
  }

  const workerText = fs.readFileSync(path.resolve(repoRoot, "GHOSTCLAW/workers/model-swap/model-swap-worker.mjs"), "utf8");
  for (const marker of [
    "ModelSwapWorker",
    "model-swap-policy.yaml",
    "action_tier_cap_version",
    "approved_by",
    "receipt_hash",
    "auto_block"
  ]) {
    pushIfMissing(errors, workerText.includes(marker), `phase6 model swap worker missing marker: ${marker}`);
  }

  const policyText = fs.readFileSync(path.resolve(repoRoot, "GHOSTCLAW/models/model-swap-policy.yaml"), "utf8");
  for (const marker of [
    "model_swap_never_overrides_policy_gate",
    "action_tier_cap_remains_final_authority",
    "no_live_provider_call",
    "no_api_key_read",
    "no_env_read",
    "no_model_download",
    "no_gpu_inference"
  ]) {
    pushIfMissing(errors, policyText.includes(marker), `phase6 model swap policy missing marker: ${marker}`);
  }

  const receiptTemplate = readJson(".ghostclaw_runtime/a2a2a/templates/model-swap-receipt.json");
  const templateFields = receiptTemplate.fields || {};
  for (const field of [
    "swap_id",
    "timestamp",
    "from_model",
    "to_model",
    "task_type",
    "triggered_by",
    "policy_version",
    "action_tier_cap_version",
    "approved_by",
    "receipt_hash",
    "blocked"
  ]) {
    pushIfMissing(errors, hasValue(templateFields[field]), `phase6 model-swap receipt template missing field: ${field}`);
  }

  return {
    router_marker_count: 6,
    test_case_marker_count: 6,
    worker_marker_count: 6,
    policy_marker_count: 7,
    receipt_template_field_count: 11
  };
}

function validatePhase7KimiArtifacts(errors) {
  const schema = readJson("GHOSTCLAW/workers/kimi/kimi-reference-vote.schema.json");
  const required = Array.isArray(schema.required) ? schema.required : [];
  for (const field of [
    "vote_id",
    "voter",
    "proposal_id",
    "decision_id",
    "requester_agent",
    "approver_agent",
    "receipt_required",
    "evidence_pack",
    "live_provider_call_performed",
    "model_download_performed",
    "gpu_inference_performed",
    "receipt_hash"
  ]) {
    pushIfMissing(errors, required.includes(field), `phase7 Kimi vote schema missing required field: ${field}`);
  }
  pushIfMissing(errors, schema.properties?.voter?.const === "kimi_coding_worker", "phase7 Kimi schema does not lock voter to kimi_coding_worker");
  pushIfMissing(errors, schema.properties?.receipt_required?.const === true, "phase7 Kimi schema does not require receipt_required=true");
  pushIfMissing(errors, schema.properties?.evidence_pack?.properties?.no_secrets?.const === true, "phase7 Kimi evidence pack does not require no_secrets=true");
  pushIfMissing(errors, schema.properties?.live_provider_call_performed?.const === false, "phase7 Kimi schema does not lock live provider call to false");
  pushIfMissing(errors, schema.properties?.model_download_performed?.const === false, "phase7 Kimi schema does not lock model download to false");
  pushIfMissing(errors, schema.properties?.gpu_inference_performed?.const === false, "phase7 Kimi schema does not lock GPU inference to false");

  const policyText = fs.readFileSync(path.resolve(repoRoot, "GHOSTCLAW/workers/kimi/kimi-worker.policy.yaml"), "utf8");
  for (const marker of [
    "coding_tool_use_reference",
    "coding_worker",
    "patch_planner",
    "test_planner",
    "moa_reference_vote_worker",
    "model_download",
    "gpu_live_inference",
    "gpu_inference",
    "secret_access",
    "deploy",
    "push",
    "production_action",
    "live_provider_call",
    "self_approval",
    "action_tier_cap remains final authority"
  ]) {
    pushIfMissing(errors, policyText.includes(marker), `phase7 Kimi policy missing marker: ${marker}`);
  }

  const registry = readJson("GHOSTCLAW/workers/registry/worker-registry.json");
  const kimi = Array.isArray(registry.workers)
    ? registry.workers.find((worker) => worker.id === "kimi_coding_worker")
    : null;
  pushIfMissing(errors, Boolean(kimi), "phase7 Kimi worker is missing from registry");
  if (kimi) {
    pushIfMissing(errors, kimi.model === "kimi_k2_7_code", "phase7 Kimi registry model is not kimi_k2_7_code");
    pushIfMissing(errors, kimi.role === "coding_tool_use_reference", "phase7 Kimi registry role is not coding_tool_use_reference");
    pushIfMissing(errors, kimi.receipt_required === true, "phase7 Kimi registry does not require receipts");
    pushIfMissing(errors, kimi.self_approval_allowed === false, "phase7 Kimi registry allows self approval");
    for (const role of ["coding_tool_use_reference", "coding_worker", "patch_planner", "test_planner", "moa_reference_vote_worker"]) {
      pushIfMissing(errors, kimi.allowed_roles?.includes(role), `phase7 Kimi registry missing role: ${role}`);
    }
    for (const action of ["model_download", "gpu_live_inference", "gpu_inference", "secret_access", "deploy", "push", "production_action", "live_provider_call", "self_approval"]) {
      pushIfMissing(errors, kimi.blocked_actions?.includes(action), `phase7 Kimi registry missing blocked action: ${action}`);
    }
  }

  const skillText = fs.readFileSync(path.resolve(repoRoot, "skills/ghostclaw-agent-ghostclaws-thai-jarvis/SKILL.md"), "utf8");
  for (const marker of [
    "Kimi Worker Lane (Phase 7)",
    "coding_tool_use_reference",
    "patch_planner",
    "test_planner",
    "MoA reference vote worker",
    "decision_id",
    "evidence_pack.no_secrets",
    "live_provider_call_performed"
  ]) {
    pushIfMissing(errors, skillText.includes(marker), `phase7 GhostClaw skill missing marker: ${marker}`);
  }

  const testText = fs.readFileSync(path.resolve(repoRoot, "GHOSTCLAW/workers/kimi/kimi-reference-vote.test.mjs"), "utf8");
  for (const marker of [
    "advisory artifacts with decision and evidence metadata",
    "secret-free and scoped",
    "hard-blocks provider, model, secret, deployment, shell, and self-approval actions",
    "registers kimi_coding_worker",
    "draft-only worker"
  ]) {
    pushIfMissing(errors, testText.includes(marker), `phase7 Kimi test missing case marker: ${marker}`);
  }

  return {
    schema_required_field_count: 12,
    policy_marker_count: 15,
    registry_role_count: 5,
    registry_blocked_action_count: 9,
    test_case_marker_count: 5
  };
}

function validatePhase8MoABrainstormArtifacts(errors) {
  const schema = readJson("GHOSTCLAW/protocols/a2a2a-message-schema.json");
  const moaSummary = schema.properties?.moa_summary?.properties || {};
  const gated = schema.properties?.moa_gated_brainstorm?.properties || {};
  const referenceVotes = moaSummary.reference_votes || {};
  const referenceRequired = Array.isArray(referenceVotes.required) ? referenceVotes.required : [];

  for (const field of ["ref_A_safety_risk", "ref_B_speed_cost", "ref_C_correctness_proof"]) {
    pushIfMissing(errors, referenceRequired.includes(field), `phase8 MoA reference_votes missing required lane: ${field}`);
    pushIfMissing(errors, hasValue(referenceVotes.properties?.[field]), `phase8 MoA reference_votes missing schema for: ${field}`);
  }

  pushIfMissing(errors, moaSummary.hermes_aggregator?.properties?.agent?.const === "hermes", "phase8 MoA schema does not lock Hermes as aggregator");
  pushIfMissing(errors, hasValue(moaSummary.hermes_aggregator?.properties?.consensus_threshold), "phase8 MoA schema missing consensus_threshold");
  pushIfMissing(errors, hasValue(moaSummary.hermes_aggregator?.properties?.aggregator_certainty), "phase8 MoA schema missing aggregator_certainty");
  pushIfMissing(errors, moaSummary.moa_score_is_confidence_signal_only?.const === true, "phase8 MoA score is not locked as confidence-only");
  pushIfMissing(errors, moaSummary.policy_gate_override_allowed?.const === false, "phase8 MoA schema allows policy override");
  pushIfMissing(errors, moaSummary.recursive_moa_launch_allowed?.const === false, "phase8 MoA schema allows recursive MoA launch");
  pushIfMissing(errors, gated.safety_disagreement_hard_veto?.const === true, "phase8 gated brainstorm does not require safety hard veto");
  pushIfMissing(errors, gated.policy_gate_final_authority?.const === true, "phase8 gated brainstorm does not lock policy gate final authority");
  pushIfMissing(errors, gated.moa_score_authorizes_action?.const === false, "phase8 gated brainstorm allows MoA score to authorize action");

  const policyText = fs.readFileSync(path.resolve(repoRoot, "GHOSTCLAW/protocols/brainstorm-terminology-policy.yaml"), "utf8");
  for (const marker of [
    "ref_A_safety_risk",
    "ref_B_speed_cost",
    "ref_C_correctness_proof",
    "aggregator: hermes",
    "consensus_threshold: 0.67",
    "moa_score_confidence_signal_only: true",
    "policy_gate_override_allowed: false",
    "recursive_moa_launch_allowed: false",
    "safety_disagreement_hard_veto: true",
    "action_tier_cap_final_authority: true"
  ]) {
    pushIfMissing(errors, policyText.includes(marker), `phase8 brainstorm policy missing marker: ${marker}`);
  }

  const protocolText = fs.readFileSync(path.resolve(repoRoot, "GHOSTCLAW/protocols/A2A2A_PROTOCOL.md"), "utf8");
  for (const marker of [
    "MoA-Gated Brainstorm Contract",
    "ref_A_safety_risk",
    "ref_B_speed_cost",
    "ref_C_correctness_proof",
    "Hermes is the aggregator",
    "hard veto",
    "moa_score_authorizes_action",
    "No recursive MoA launch is allowed"
  ]) {
    pushIfMissing(errors, protocolText.includes(marker), `phase8 A2A protocol missing marker: ${marker}`);
  }

  const docText = fs.readFileSync(path.resolve(repoRoot, "docs/knowledge/MOA_GATED_BRAINSTORM.md"), "utf8");
  for (const marker of [
    "confidence signal only",
    "never overrides the policy gate",
    "ref_A",
    "ref_B",
    "ref_C",
    "consensus_threshold",
    "safety_disagreement_hard_veto",
    "policy_gate_final_authority"
  ]) {
    pushIfMissing(errors, docText.includes(marker), `phase8 MoA doc missing marker: ${marker}`);
  }

  const teamText = fs.readFileSync(path.resolve(repoRoot, "docs/knowledge/GHOSTCLAWS_SUB_AGENT_TEAM.md"), "utf8");
  for (const marker of [
    "ref_A_safety_risk",
    "ref_B_speed_cost",
    "ref_C_correctness_proof",
    "Consensus threshold",
    "aggregator_certainty",
    "hard veto",
    "MoA cannot override"
  ]) {
    pushIfMissing(errors, teamText.includes(marker), `phase8 sub-agent team doc missing marker: ${marker}`);
  }

  const skillText = fs.readFileSync(path.resolve(repoRoot, "skills/ghostclaw-agent-ghostclaws-thai-jarvis/SKILL.md"), "utf8");
  pushIfMissing(errors, /phase_coverage:\s*"1-(8|9|10)"/.test(skillText), "phase8 GhostClaw skill missing phase coverage marker for phase 8+");
  for (const marker of [
    "ref_A_safety_risk",
    "ref_B_speed_cost",
    "ref_C_correctness_proof",
    "Hermes aggregates",
    "safety_disagreement_hard_veto",
    "moa_score_authorizes_action",
    "policy_gate_override_allowed",
    "recursive_moa_launch_allowed"
  ]) {
    pushIfMissing(errors, skillText.includes(marker), `phase8 GhostClaw skill missing marker: ${marker}`);
  }

  const testText = fs.readFileSync(path.resolve(repoRoot, "GHOSTCLAW/protocols/moa-gated-brainstorm.test.mjs"), "utf8");
  for (const marker of [
    "requires the three reference lanes",
    "locks MoA score to confidence-only",
    "documents hard veto and policy authority",
    "documents Phase 8 in the GhostClaw skill"
  ]) {
    pushIfMissing(errors, testText.includes(marker), `phase8 MoA test missing case marker: ${marker}`);
  }

  return {
    reference_lane_count: 3,
    schema_guard_count: 9,
    policy_marker_count: 10,
    test_case_marker_count: 4
  };
}

function validatePhase9LatentMASArtifacts(errors) {
  const latentManifest = readJson(".ghostclaw_runtime/latent/latent-manifest.json");
  const controlManifest = readJson(".ghostclaw_runtime/latent/control-plane-manifest.json");
  const kvGate = readJson(".ghostclaw_runtime/latent/kv-compatibility-gate.json");

  pushIfMissing(errors, latentManifest.json_control_plane_source_of_truth === true, "phase9 latent manifest does not mark JSON control plane as source of truth");
  pushIfMissing(errors, latentManifest.latent_plane_shadow_only === true, "phase9 latent manifest does not mark latent plane shadow-only");
  pushIfMissing(errors, latentManifest.safety_policy_plane_final_authority === true, "phase9 latent manifest does not mark safety policy final authority");
  pushIfMissing(errors, latentManifest.kv_only_protocol_allowed === false, "phase9 latent manifest allows KV-only protocol");
  pushIfMissing(errors, latentManifest.debug_probe_mode === "parallel_text_probe", "phase9 latent manifest debug probe is not parallel_text_probe");
  pushIfMissing(errors, latentManifest.decode_from_kv === false, "phase9 latent manifest allows decode_from_kv");
  pushIfMissing(errors, latentManifest.LATENTMAS_LIVE_ENABLED === false, "phase9 latent manifest has live enabled");
  pushIfMissing(errors, latentManifest.model_download_allowed === false, "phase9 latent manifest allows model download");
  pushIfMissing(errors, latentManifest.gpu_live_inference_allowed === false, "phase9 latent manifest allows GPU live inference");

  pushIfMissing(errors, controlManifest.json_control_plane_source_of_truth === true, "phase9 control manifest missing source-of-truth lock");
  pushIfMissing(errors, controlManifest.safety_policy_plane_final_authority === true, "phase9 control manifest missing safety final authority");
  pushIfMissing(errors, controlManifest.latent_plane_override_allowed === false, "phase9 control manifest allows latent override");
  pushIfMissing(errors, controlManifest.moa_or_latent_score_override_allowed === false, "phase9 control manifest allows score override");
  pushIfMissing(errors, controlManifest.kv_only_protocol_allowed === false, "phase9 control manifest allows KV-only protocol");
  pushIfMissing(errors, controlManifest.effective_score_cap === 100, "phase9 control manifest effective score cap is not 100");

  const requiredFields = Array.isArray(kvGate.required_fields) ? kvGate.required_fields : [];
  pushIfMissing(errors, kvGate.kv_required_field_count === 12, "phase9 KV gate required field count is not 12");
  pushIfMissing(errors, requiredFields.length === 12, "phase9 KV gate does not list 12 required fields");
  pushIfMissing(errors, kvGate.exact_kv_compatibility_gate === true, "phase9 KV gate is not exact");
  pushIfMissing(errors, kvGate.backend_requirement === "past_key_values", "phase9 KV gate backend requirement is not past_key_values");
  pushIfMissing(errors, kvGate.on_mismatch?.action === "fallback_to_json_text_brainstorm", "phase9 KV mismatch action is not JSON fallback");
  pushIfMissing(errors, kvGate.on_mismatch?.latent_bonus === 0, "phase9 KV mismatch latent bonus is not zero");
  pushIfMissing(errors, kvGate.kv_only_protocol_allowed === false, "phase9 KV gate allows KV-only protocol");
  pushIfMissing(errors, kvGate.decode_from_kv === false, "phase9 KV gate allows decode_from_kv");
  pushIfMissing(errors, kvGate.debug_probe_mode === "parallel_text_probe", "phase9 KV gate debug probe is not parallel_text_probe");
  pushIfMissing(errors, kvGate.model_download_allowed === false, "phase9 KV gate allows model download");
  pushIfMissing(errors, kvGate.gpu_live_inference_allowed === false, "phase9 KV gate allows GPU live inference");

  const docText = fs.readFileSync(path.resolve(repoRoot, "docs/knowledge/SIRINX_LATENTMAS_GHOSTCLAW_INTEGRATION.md"), "utf8");
  for (const marker of [
    "JSON receipt + policy gate > latent score",
    "json_control_plane_source_of_truth",
    "latent_plane_shadow_only",
    "safety_policy_plane_final_authority",
    "exact KV compatibility gate",
    "parallel_text_probe",
    "decode_from_kv",
    "4.3x",
    "83.7%",
    "+13.3%",
    "LATENTMAS_LIVE_ENABLED",
    "model_download_allowed",
    "gpu_live_inference_allowed"
  ]) {
    pushIfMissing(errors, docText.includes(marker), `phase9 LatentMAS doc missing marker: ${marker}`);
  }

  const skillText = fs.readFileSync(path.resolve(repoRoot, "skills/ghostclaw-agent-ghostclaws-thai-jarvis/SKILL.md"), "utf8");
  for (const marker of [
    'phase_coverage: "1-10"',
    "JSON control plane",
    "Latent plane",
    "Safety/policy plane",
    "json_control_plane_source_of_truth",
    "latent_plane_shadow_only",
    "safety_policy_plane_final_authority",
    "kv_only_protocol_allowed",
    "past_key_values",
    "parallel_text_probe",
    "decode_from_kv",
    "LATENTMAS_LIVE_ENABLED"
  ]) {
    pushIfMissing(errors, skillText.includes(marker), `phase9 GhostClaw skill missing marker: ${marker}`);
  }

  const testText = fs.readFileSync(path.resolve(repoRoot, "GHOSTCLAW/protocols/latentmas-dual-plane.test.mjs"), "utf8");
  for (const marker of [
    "locks JSON control plane as source of truth",
    "locks exact KV compatibility and JSON fallback",
    "locks debug probe and live execution blocks",
    "documents Phase 9 in docs and skill"
  ]) {
    pushIfMissing(errors, testText.includes(marker), `phase9 LatentMAS test missing case marker: ${marker}`);
  }

  return {
    manifest_guard_count: 9,
    control_guard_count: 5,
    kv_gate_field_count: requiredFields.length,
    kv_gate_guard_count: 11,
    test_case_marker_count: 4
  };
}

function validatePhase10SkillCreatorArtifacts(errors) {
  const skillText = fs.readFileSync(path.resolve(repoRoot, "skills/ghostclaw-agent-ghostclaws-thai-jarvis/SKILL.md"), "utf8");
  pushIfMissing(errors, /phase_coverage:\s*"1-10"/.test(skillText), "phase10 GhostClaw skill missing phase coverage marker");

  const requiredSkillMarkers = [
    "Skill Creator / Zero Prompting System (Phase 10)",
    "Zero Prompting workflow",
    "Mission Card",
    "Hermes/Codex mutual approval",
    "Worker Build Runtime",
    "Browser Use Worker",
    "Vibe Coding Agent",
    "A2A Sync Team",
    "MoA-gated Brainstorm",
    "LatentMAS dual-plane architecture",
    "Model Auto Swap Router",
    "Kimi Worker lane",
    "EdgeOne deployment readiness",
    "GitHub Toptrend public read-only research",
    "validation/receipt/archive",
    "no secret access",
    "no push/deploy",
    "no live provider/model call",
    "no GPU inference",
    "no model download"
  ];

  for (const marker of requiredSkillMarkers) {
    pushIfMissing(errors, skillText.includes(marker), `phase10 GhostClaw skill missing marker: ${marker}`);
  }

  const testText = fs.readFileSync(path.resolve(repoRoot, "GHOSTCLAW/protocols/zero-prompting-skill-contract.test.mjs"), "utf8");
  const requiredTestMarkers = [
    "marks Phase 10 coverage",
    "preserves the Zero Prompting Mission Card workflow",
    "documents all required worker lanes",
    "keeps Phase 10 hard stops explicit"
  ];

  for (const marker of requiredTestMarkers) {
    pushIfMissing(errors, testText.includes(marker), `phase10 skill contract test missing case marker: ${marker}`);
  }

  return {
    skill_marker_count: requiredSkillMarkers.length,
    test_case_marker_count: requiredTestMarkers.length
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
  const phase6ModelRouter = validatePhase6ModelRouterArtifacts(errors);
  const phase7Kimi = validatePhase7KimiArtifacts(errors);
  const phase8MoA = validatePhase8MoABrainstormArtifacts(errors);
  const phase9LatentMAS = validatePhase9LatentMASArtifacts(errors);
  const phase10SkillCreator = validatePhase10SkillCreatorArtifacts(errors);
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
      phase6_model_router_marker_count: phase6ModelRouter.router_marker_count,
      phase6_model_router_test_case_count: phase6ModelRouter.test_case_marker_count,
      phase6_model_swap_worker_marker_count: phase6ModelRouter.worker_marker_count,
      phase6_model_swap_policy_marker_count: phase6ModelRouter.policy_marker_count,
      phase6_model_swap_receipt_template_field_count: phase6ModelRouter.receipt_template_field_count,
      phase7_kimi_schema_required_field_count: phase7Kimi.schema_required_field_count,
      phase7_kimi_policy_marker_count: phase7Kimi.policy_marker_count,
      phase7_kimi_registry_role_count: phase7Kimi.registry_role_count,
      phase7_kimi_registry_blocked_action_count: phase7Kimi.registry_blocked_action_count,
      phase7_kimi_test_case_count: phase7Kimi.test_case_marker_count,
      phase8_moa_reference_lane_count: phase8MoA.reference_lane_count,
      phase8_moa_schema_guard_count: phase8MoA.schema_guard_count,
      phase8_moa_policy_marker_count: phase8MoA.policy_marker_count,
      phase8_moa_test_case_count: phase8MoA.test_case_marker_count,
      phase9_latentmas_manifest_guard_count: phase9LatentMAS.manifest_guard_count,
      phase9_latentmas_control_guard_count: phase9LatentMAS.control_guard_count,
      phase9_latentmas_kv_gate_field_count: phase9LatentMAS.kv_gate_field_count,
      phase9_latentmas_kv_gate_guard_count: phase9LatentMAS.kv_gate_guard_count,
      phase9_latentmas_test_case_count: phase9LatentMAS.test_case_marker_count,
      phase10_skill_creator_marker_count: phase10SkillCreator.skill_marker_count,
      phase10_skill_creator_test_case_count: phase10SkillCreator.test_case_marker_count,
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
