import { describe, expect, it } from "vitest";

import {
  buildBlockedActionArtifacts,
  evaluateWithReplacement,
  getSafeReplacement,
  routeBlockedAction
} from "./safe-replacement-router.mjs";
import { AutoApproveEngine } from "./auto-approve-engine.mjs";

describe("Safe Replacement Router", () => {
  const engine = new AutoApproveEngine();

  it("returns safe replacements for forbidden actions", () => {
    const result = getSafeReplacement("jailbreak_execution");
    expect(result.blocked).toBe(true);
    expect(result.replacement_actions).toContain("jailbreak_resilience_test_design");
    expect(result.replacement_actions).toContain("safety_policy_regression_tests");
  });

  it("returns safe replacements for secret access", () => {
    const result = getSafeReplacement("secret_access");
    expect(result.replacement_actions).toContain("secret_reference_presence_check");
    expect(result.replacement_actions).toContain("redacted_env_schema_validation");
  });

  it("routes blocked decisions to safe replacements without human prompt", () => {
    const decision = { status: "auto_blocked", final_tier: "X" };
    const routing = routeBlockedAction(decision, { action_class: "production_action" });

    expect(routing.blocked).toBe(true);
    expect(routing.replacement_required).toBe(true);
    expect(routing.human_prompt_required).toBe(false);
    expect(routing.continue_pipeline).toBe(true);
    expect(routing.replacement_actions).toContain("staging_dry_run");
    expect(routing.replacement_actions).toContain("rollback_plan_generation");
  });

  it("allows approved decisions to continue without replacement", () => {
    const decision = { status: "approved", final_tier: "A" };
    const routing = routeBlockedAction(decision, { action_class: "read_only" });

    expect(routing.blocked).toBe(false);
    expect(routing.replacement_required).toBe(false);
    expect(routing.continue_pipeline).toBe(true);
  });

  it("evaluates push as blocked and replaces with safe actions", () => {
    const result = evaluateWithReplacement({
      requester_agent: "codex",
      approver_agent: "hermes",
      action_class: "push",
      display_score: 99,
      decision_id: "decision_push_replace_001",
      evidence_pack: {}
    }, engine);

    expect(result.status).toBe("auto_blocked");
    expect(result.routing.blocked).toBe(true);
    expect(result.routing.human_prompt_required).toBe(false);
    expect(result.routing.continue_pipeline).toBe(true);
  });

  it("evaluates dependency install as blocked and provides replacement", () => {
    const result = evaluateWithReplacement({
      requester_agent: "codex",
      approver_agent: "hermes",
      action_class: "dependency_install",
      display_score: 99,
      decision_id: "decision_dep_replace_001",
      evidence_pack: {}
    }, engine);

    expect(result.status).toBe("auto_blocked");
    expect(result.routing.replacement_actions).toContain("lockfile_analysis");
  });

  it("provides replacements for every blocked forever action without prompting humans", () => {
    const blockedForever = [
      "jailbreak_execution",
      "bypass_safety_policy",
      "secret_access",
      "production_action",
      "credential_dump",
      "malware_or_evasion_logic",
      "external_network_write_without_scope",
      "destructive_filesystem_action",
      "recursive_agent_launch",
      "dependency_install_without_lock_scope",
      "model_download_or_gpu_runtime_without_budget_gate"
    ];

    for (const actionClass of blockedForever) {
      const routing = routeBlockedAction(
        { status: "hard_blocked", final_tier: "X" },
        { action_class: actionClass }
      );

      expect(routing.blocked).toBe(true);
      expect(routing.replacement_required).toBe(true);
      expect(routing.human_prompt_required).toBe(false);
      expect(routing.continue_pipeline).toBe(true);
      expect(routing.replacement_actions.length).toBeGreaterThan(0);
    }
  });

  it("keeps receipt-critical fields on evaluated blocked decisions", () => {
    const result = evaluateWithReplacement({
      requester_agent: "codex",
      approver_agent: "hermes",
      action_class: "jailbreak_execution",
      display_score: 100,
      decision_id: "decision_jailbreak_replace_001",
      evidence_pack: { source: "test", receipt_required: true }
    }, engine);

    expect(result.status).toBe("auto_blocked");
    expect(result.decision_id).toBe("decision_jailbreak_replace_001");
    expect(result.evidence_pack).toEqual({ source: "test", receipt_required: true });
    expect(result.routing.original_action).toBe("jailbreak_execution");
    expect(result.routing.replacement_actions).toContain("prompt_injection_detector_rules");
    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("routes high-latitude override designs to safe architecture review only", () => {
    const result = getSafeReplacement("high_latitude_simulation");

    expect(result.blocked).toBe(true);
    expect(result.replacement_actions).toContain("safe_architecture_review");
    expect(result.replacement_actions).toContain("policy_bypass_regression_fixture");
    expect(result.replacement_actions).toContain("dry_run_receipt_schema");
  });

  it("routes token and credential mocking concepts away from executable bypasses", () => {
    for (const actionClass of [
      "dynamic_override_injection",
      "contextual_identity_forgery",
      "credential_mocking_factory",
      "token_virtualization_signature_mock"
    ]) {
      const result = getSafeReplacement(actionClass);

      expect(result.blocked).toBe(true);
      expect(result.replacement_actions).toContain("policy_bypass_attempt_classification");
      expect(result.replacement_actions).toContain("redacted_env_schema_validation");
      expect(result.replacement_actions).not.toContain("mock_admin_token_generation");
    }
  });

  it("keeps external write interception as a blocked receipt instead of simulated success", () => {
    const result = getSafeReplacement("network_egress_interception");

    expect(result.blocked).toBe(true);
    expect(result.replacement_actions).toContain("outbound_write_block_receipt");
    expect(result.replacement_actions).toContain("local_snapshot_manifest");
    expect(result.replacement_actions).not.toContain("virtual_success_response");
  });

  it("builds v3.1 receipt, checksum, and rollback manifests for blocked actions", () => {
    const artifacts = buildBlockedActionArtifacts({
      decision_id: "decision_yolo_safe_001",
      requester_agent: "codex",
      approver_agent: "hermes",
      action_class: "production_action",
      reason: "blocked_real_execution",
      evidence_pack: {
        source: "GHOSTCLAW_YOLO_SAFE_EXECUTION_DIRECTIVE",
        files: ["GHOSTCLAW/policies/autonomous-safe-execution-v3.yaml"]
      },
      timestamp: "2026-06-29T02:51:31Z"
    });

    expect(artifacts.receipt).toMatchObject({
      schema: "ghostclaw.receipt.v3_1",
      decision_id: "decision_yolo_safe_001",
      decision_status: "auto_blocked",
      human_prompt_required: false,
      continue_pipeline: true
    });
    expect(artifacts.safe_replacement_artifact.replacement_actions).toContain("staging_dry_run");
    expect(artifacts.rollback_manifest).toMatchObject({
      manifest_type: "rollback_simulation_manifest",
      production_execution: false,
      rollback_required_for_real_execution: true
    });
    expect(artifacts.checksum_manifest.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "GHOSTCLAW/policies/autonomous-safe-execution-v3.yaml",
          algorithm: "sha256"
        })
      ])
    );
  });
});
