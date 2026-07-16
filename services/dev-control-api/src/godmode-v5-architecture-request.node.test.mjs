import assert from "node:assert/strict";
import test from "node:test";
import {
  getGodmodeV5ArchitectureRequestStatus,
  validateGodmodeV5ArchitectureRequest
} from "./godmode-v5-architecture-request.mjs";
import { normalizeGodmodeV5State } from "./godmode-v5-state-contract.mjs";

const skills = [
  "autonomous-task-planner",
  "codebase-cartographer",
  "system-design-architect",
  "coding-model-router",
  "senior-fullstack-builder",
  "mcp-integration-manager",
  "codex-workflow-synthesizer",
  "safety-gate-enforcer",
  "evidence-verifier"
];

const sections = [
  "Goal", "Current State", "Proposed Architecture", "Interface Contracts",
  "Data Model Changes", "Lane Assignments", "Risk Assessment", "Dependencies",
  "Rollback Plan", "Verification"
];

function fixture() {
  const state = normalizeGodmodeV5State({
    Schema: "ghostclaw.godmode.v5.state.v1",
    Version: "5.0.0",
    TaskId: "task-1",
    CorrelationId: "task-1",
    Phase: "Architecture",
    Status: "InProgress",
    AbortWindow: 900,
    MaxRetries: 3,
    Attempt: 0,
    Owner: "ClaudeArchitect",
    ExitCriteria: {},
    Evidence: [],
    StartedAt: "2026-07-15T00:00:00.000Z",
    UpdatedAt: "2026-07-15T00:00:00.000Z"
  });
  const coordination = {
    $schema: "ghostclaw.agent_coordination.v1",
    execution: {
      singleWriterRole: "codex_build_captain",
      gitOwnerRole: "codex_build_captain",
      maxConcurrentRepoWriters: 1,
      requiredTaskFields: ["task_id", "lane_id", "owner", "allowed_paths", "lease_id", "base_sha", "expected_outputs"],
      directWorkerCommit: false,
      directWorkerPush: false,
      directWorkerDeploy: false
    },
    roles: [
      { id: "hermes_commander", repoAccess: "read_only", gitAccess: "none", mayExecuteTasks: false },
      { id: "claude_architect", repoAccess: "read_only", gitAccess: "none", mayExecuteTasks: false },
      { id: "codex_build_captain", repoAccess: "write_with_lease", gitAccess: "scoped_owner", mayExecuteTasks: true },
      { id: "opencode_glm52_reviewer", repoAccess: "read_only", gitAccess: "none", mayExecuteTasks: false },
      { id: "kob_validator", repoAccess: "read_only", gitAccess: "none", mayExecuteTasks: false },
      { id: "policy_guardian", repoAccess: "read_only", gitAccess: "none", mayExecuteTasks: false },
      { id: "telegram_controller", repoAccess: "none", gitAccess: "none", mayExecuteTasks: false },
      { id: "mcp_connector", repoAccess: "read_only", gitAccess: "none", mayExecuteTasks: false },
      { id: "obsidian_brain", repoAccess: "none", gitAccess: "none", mayExecuteTasks: false },
      { id: "mission_control", repoAccess: "none", gitAccess: "none", mayExecuteTasks: false }
    ],
    pipeline: [{ stage: "architecture", owner: "claude_architect" }]
  };
  const request = {
    $schema: "ghostclaw.godmode-v5.architecture-request.v1",
    RequestId: "request-1",
    TaskId: "task-1",
    CorrelationId: "task-1",
    Phase: "Architecture",
    StateReceiptDigest: state.ReceiptDigest,
    RequestedBy: "hermes_commander",
    AssignedTo: "claude_architect",
    SkillBundle: {
      Name: "unknowcoding-coding-team",
      InstalledSkillPath: "/skills/unknowcoding/SKILL.md",
      CanonicalSourceRoot: "packages/skills-kit/skills",
      RequiredSkills: skills
    },
    RequiredSections: sections,
    Ownership: { SingleRepoWriter: "codex_build_captain", ArchitectureOwner: "claude_architect" },
    DependencyGraph: [
      { Id: "baseline", DependsOn: [] },
      { Id: "architecture", DependsOn: ["baseline"] }
    ],
    RollbackRequirements: ["one", "two", "three", "four", "five"],
    Output: {
      ArchitecturePacketPath: "docs/architecture.md",
      HermesDecisionPath: ".runtime/decision.json"
    },
    ProviderDispatch: {
      Requested: false,
      Authorized: false,
      Executed: false,
      RequiredExactGate: "APPROVE_EXACT"
    },
    ExternalActions: { ProviderCall: false, TelegramLiveSend: false, Deploy: false }
  };
  return { state, coordination, request };
}

test("validates a closed architecture request with ordered dependencies", () => {
  const { request, state, coordination } = fixture();
  const result = validateGodmodeV5ArchitectureRequest(request, state, coordination);
  assert.equal(result.Passed, true);
  assert.deepEqual(result.Issues, []);
});

test("rejects provider dispatch before an exact gate", () => {
  const { request, state, coordination } = fixture();
  request.ProviderDispatch.Requested = true;
  request.ExternalActions.ProviderCall = true;
  const result = validateGodmodeV5ArchitectureRequest(request, state, coordination);
  assert.equal(result.Passed, false);
  assert.ok(result.Issues.includes("ProviderDispatchMustStartClosed"));
  assert.ok(result.Issues.includes("ExternalActionsMustBeClosed"));
});

test("reports an installed local skill bundle while keeping provider and phase gates closed", async () => {
  const { request, state, coordination } = fixture();
  const result = await getGodmodeV5ArchitectureRequestStatus({
    request,
    state,
    coordination,
    pathExists: async (path) => path.includes("SKILL.md")
  });
  assert.equal(result.Status, "ArchitectureRequestReadyProviderGateClosed");
  assert.equal(result.HermesSkillInstalled, true);
  assert.equal(result.SourceSkillsReady, true);
  assert.equal(result.ProviderCall.Authorized, false);
  assert.equal(result.CanAdvance, false);
});

test("fails closed when one canonical skill source is absent", async () => {
  const { request, state, coordination } = fixture();
  const result = await getGodmodeV5ArchitectureRequestStatus({
    request,
    state,
    coordination,
    pathExists: async (path) => path.includes("InstalledSkillPath") || !path.includes("evidence-verifier")
  });
  assert.equal(result.SourceSkillsReady, false);
  assert.equal(result.CanAdvance, false);
});
