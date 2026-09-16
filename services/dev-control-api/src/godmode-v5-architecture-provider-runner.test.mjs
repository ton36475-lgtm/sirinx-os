import { describe, expect, it, vi } from "vitest";

import { createProviderCallApprovalReceipt } from "./provider-call-exact-gate.mjs";
import {
  buildGodmodeV5ArchitectureProviderPlan,
  GODMODE_V5_ARCHITECTURE_PROVIDER_OUTPUT_CHARACTER_CAP,
  GODMODE_V5_ARCHITECTURE_REQUIRED_EXACT_GATE,
  runGodmodeV5ArchitectureProvider,
  validateGodmodeV5ArchitectureMarkdown
} from "./godmode-v5-architecture-provider-runner.mjs";

const signingKey = "test-only-architecture-provider-signing-key-2026";
const exactGate = "APPROVE_CLAUDE_CODE_PROVIDER_CALL_GODMODE_V5_ARCH_20260715_001";
const now = () => new Date("2026-07-15T01:00:00.000Z");

function fixture() {
  const request = {
    RequestId: "GODMODE-V5-ARCH-TEST-001",
    TaskId: "GODMODE-V5-LOCAL-CONTROL-PLANE",
    CorrelationId: "GODMODE-V5-LOCAL-CONTROL-PLANE",
    StateReceiptDigest: "a".repeat(64),
    Inputs: ["configs/godmode_v5_runtime.config.json"],
    SkillBundle: {
      CanonicalSourceRoot: "packages/skills-kit/skills",
      RequiredSkills: ["system-design-architect"]
    },
    RequiredSections: ["Goal", "Verification"],
    ProviderDispatch: {
      Route: "claude-code/first-party",
      Mode: "read_only_plan",
      RequiredExactGate: exactGate,
      AllowedTools: ["Read", "Glob", "Grep"]
    }
  };
  const status = {
    Status: "ArchitectureRequestReadyProviderGateClosed",
    RequestDigestSha256: "b".repeat(64)
  };
  return { request, status };
}

async function planFixture() {
  const { request, status } = fixture();
  return buildGodmodeV5ArchitectureProviderPlan({
    request,
    status,
    repoRoot: process.cwd(),
    claudeExecutable: process.execPath
  });
}

function receipt(plan, overrides = {}) {
  return createProviderCallApprovalReceipt({
    receiptId: "architecture-provider-receipt-1",
    ...plan.target,
    requestedBy: "hermes_commander",
    approvedBy: "operator",
    exactGate,
    budgetConfirmed: true,
    issuedAt: "2026-07-15T00:55:00.000Z",
    expiresAt: "2026-07-15T01:05:00.000Z",
    ...overrides
  }, { signingKey });
}

describe("GODMODE V5 architecture provider runner", () => {
  it("builds a read-only, target-bound Claude plan", async () => {
    const plan = await planFixture();

    expect(plan.target).toMatchObject({
      RequestId: "GODMODE-V5-ARCH-TEST-001",
      Provider: "Claude Code",
      Model: "opus",
      AllowedTools: ["Glob", "Grep", "Read"],
      MaxBudgetUsd: 2,
      InvocationCountLimit: 1,
      ProviderCallAccounting: "one_cli_session_up_to_six_model_turns_api_calls_unobserved",
      TokenLimitEnforcement: "post_call_character_cap_only_not_provider_cli",
      OutputCharacterCap: GODMODE_V5_ARCHITECTURE_PROVIDER_OUTPUT_CHARACTER_CAP
    });
    expect(plan.requiredExactGate).toBe(GODMODE_V5_ARCHITECTURE_REQUIRED_EXACT_GATE);
    expect(plan.args).toEqual(expect.arrayContaining([
      "--safe-mode", "--permission-mode", "plan", "--strict-mcp-config",
      "--no-session-persistence", "--max-budget-usd", "2.00"
    ]));
    expect(plan.providerCalled).toBe(false);
    expect(plan.secretRead).toBe(false);
    expect(plan.repoMutation).toBe(false);
  });

  it("rejects missing architecture sections", () => {
    const result = validateGodmodeV5ArchitectureMarkdown("## Goal\nA plan", [
      "Goal", "Verification"
    ]);
    expect(result.passed).toBe(false);
    expect(result.issues).toContain("architecture_provider_section_count:Verification:0");
  });

  it("rejects request ids that could escape the runtime result root", async () => {
    const { request, status } = fixture();
    request.RequestId = "../../../../docs/escape";

    await expect(buildGodmodeV5ArchitectureProviderPlan({
      request,
      status,
      repoRoot: process.cwd(),
      claudeExecutable: process.execPath
    })).rejects.toThrow("architecture_provider_request_id_invalid");
  });

  it("rejects a request-controlled exact gate value", async () => {
    const { request, status } = fixture();
    request.ProviderDispatch.RequiredExactGate = "APPROVE_DIFFERENT_GATE";

    await expect(buildGodmodeV5ArchitectureProviderPlan({
      request,
      status,
      repoRoot: process.cwd(),
      claudeExecutable: process.execPath
    })).rejects.toThrow("architecture_provider_required_exact_gate_mismatch");
  });

  it("blocks before provider execution when no receipt exists", async () => {
    const plan = await planFixture();
    const runClaude = vi.fn();
    const result = await runGodmodeV5ArchitectureProvider({
      plan,
      execute: true,
      runClaude,
      receiptSigningKey: signingKey,
      runtimeEvidenceMutation: true,
      now
    });

    expect(result.status).toBe("blocked-exact-provider-gate");
    expect(result.providerAttemptCount).toBe(0);
    expect(result.approvalSigningKeyBindingUsed).toBe(true);
    expect(result.secretRead).toBe(true);
    expect(result.secretValuePrinted).toBe(false);
    expect(result.runtimeEvidenceMutation).toBe(true);
    expect(result.sourceMutation).toBe(false);
    expect(runClaude).not.toHaveBeenCalled();
  });

  it("consumes one receipt and invokes Claude exactly once", async () => {
    const plan = await planFixture();
    const runClaude = vi.fn().mockResolvedValue({
      exitCode: 0,
      stdout: JSON.stringify({ result: "## Goal\nPlan safely.\n\n## Verification\nReview only." }),
      stderr: "",
      spawnErrorCode: null,
      processStarted: true
    });
    const result = await runGodmodeV5ArchitectureProvider({
      plan,
      execute: true,
      runClaude,
      approvalReceipt: receipt(plan),
      allowProvidedReceiptObject: true,
      consumeReceipt: async () => true,
      receiptSigningKey: signingKey,
      now
    });

    expect(result.status).toBe("provider-result-ready-for-review");
    expect(result.providerAttemptCount).toBe(null);
    expect(result.providerCalled).toBe(null);
    expect(result.providerCliInvocationAttempted).toBe(true);
    expect(result.providerCliProcessStarted).toBe(true);
    expect(result.providerCliSessionCount).toBe(1);
    expect(result.providerApiCallCountObserved).toBe(null);
    expect(result.approvalReceiptConsumed).toBe(true);
    expect(result.executionReceiptSignature).toMatch(/^[0-9a-f]{64}$/);
    expect(result.approvalSigningKeyBindingUsed).toBe(true);
    expect(result.secretRead).toBe(true);
    expect(result.secretValuePrinted).toBe(false);
    expect(result.runtimeEvidenceMutation).toBe(true);
    expect(result.sourceMutation).toBe(false);
    expect(result.repoMutation).toBe(false);
    expect(runClaude).toHaveBeenCalledTimes(1);
  });

  it("rejects a result with duplicate required sections without retry", async () => {
    const plan = await planFixture();
    const runClaude = vi.fn().mockResolvedValue({
      exitCode: 0,
      stdout: JSON.stringify({
        result: "## Goal\nOne.\n## Goal\nTwo.\n## Verification\nReview."
      }),
      stderr: "provider detail not persisted",
      spawnErrorCode: null,
      processStarted: true
    });
    const result = await runGodmodeV5ArchitectureProvider({
      plan,
      execute: true,
      runClaude,
      approvalReceipt: receipt(plan),
      allowProvidedReceiptObject: true,
      consumeReceipt: async () => true,
      receiptSigningKey: signingKey,
      now
    });

    expect(result.status).toBe("provider-result-rejected");
    expect(result.architectureMarkdown).toBe(null);
    expect(result.retryAttempted).toBe(false);
    expect(result.providerAttemptCount).toBe(null);
    expect(runClaude).toHaveBeenCalledTimes(1);
  });

  it("does not claim a provider session when the CLI process fails to start", async () => {
    const plan = await planFixture();
    const runClaude = vi.fn().mockResolvedValue({
      exitCode: 1,
      stdout: "",
      stderr: "",
      spawnErrorCode: "ENOENT",
      processStarted: false
    });
    const result = await runGodmodeV5ArchitectureProvider({
      plan,
      execute: true,
      runClaude,
      approvalReceipt: receipt(plan),
      allowProvidedReceiptObject: true,
      consumeReceipt: async () => true,
      receiptSigningKey: signingKey,
      now
    });

    expect(result.status).toBe("provider-result-rejected");
    expect(result.providerCliInvocationAttempted).toBe(true);
    expect(result.providerCliProcessStarted).toBe(false);
    expect(result.providerCliSessionCount).toBe(0);
    expect(result.providerCalled).toBe(false);
    expect(result.providerAttemptCount).toBe(0);
    expect(result.spawnErrorCode).toBe("ENOENT");
    expect(runClaude).toHaveBeenCalledTimes(1);
  });
});
