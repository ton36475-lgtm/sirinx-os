import { describe, expect, it } from "vitest";
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  authorizeProviderCallExactGate,
  createProviderCallApprovalReceipt,
  digestProviderCallTarget,
  evaluateProviderCallExactGate
} from "./provider-call-exact-gate.mjs";

const fixedNow = () => new Date("2026-07-15T01:00:00.000Z");
const exactGate = "APPROVE_OPENROUTER_FABLE5_PROVIDER_CALL_A019E53EE";
const signingKey = "test-only-provider-approval-signing-key-2026";
const target = {
  requestId: "request-1",
  commandId: "openrouter_fable5_live_smoke",
  provider: "OpenRouter",
  model: "anthropic/claude-fable-5",
  maxTokens: 64
};

function receipt(overrides = {}) {
  return createProviderCallApprovalReceipt({
    receiptId: "provider-receipt-1",
    ...target,
    requestedBy: "codex_build_captain",
    approvedBy: "hermes_commander",
    exactGate,
    budgetConfirmed: true,
    issuedAt: "2026-07-15T00:55:00.000Z",
    expiresAt: "2026-07-15T01:05:00.000Z",
    ...overrides
  }, { signingKey });
}

describe("provider-call exact gate", () => {
  it("authorizes one target-bound, budget-confirmed receipt", async () => {
    const result = await evaluateProviderCallExactGate(target, {
      requiredExactGate: exactGate,
      exactGate,
      approvalReceipt: receipt(),
      allowProvidedReceiptObject: true,
      receiptSigningKey: signingKey,
      now: fixedNow
    });

    expect(result.authorized).toBe(true);
    expect(result.targetDigest).toBe(digestProviderCallTarget(target));
    expect(result.keyValuePrinted).toBe(false);
  });

  it("preserves canonical metadata when the target uses Pascal-case fields", async () => {
    const pascalTarget = {
      RequestId: "pascal-request-1",
      CommandId: "pascal_command",
      Provider: "Claude Code",
      Model: "opus",
      MaxTokens: 128
    };
    const signed = createProviderCallApprovalReceipt({
      receiptId: "provider-receipt-pascal",
      ...pascalTarget,
      requestedBy: "hermes_commander",
      approvedBy: "operator",
      exactGate,
      budgetConfirmed: true,
      issuedAt: "2026-07-15T00:55:00.000Z",
      expiresAt: "2026-07-15T01:05:00.000Z"
    }, { signingKey });
    const result = await evaluateProviderCallExactGate(pascalTarget, {
      requiredExactGate: exactGate,
      exactGate,
      approvalReceipt: signed,
      allowProvidedReceiptObject: true,
      receiptSigningKey: signingKey,
      now: fixedNow
    });

    expect(signed).toMatchObject({
      requestId: "pascal-request-1",
      commandId: "pascal_command"
    });
    expect(result.authorized).toBe(true);
    expect(result).toMatchObject({
      requestId: "pascal-request-1",
      commandId: "pascal_command",
      provider: "Claude Code",
      model: "opus",
      maxTokens: 128
    });
  });

  it("rejects target changes and self approval", async () => {
    const changedTarget = { ...target, maxTokens: 65 };
    const result = await evaluateProviderCallExactGate(changedTarget, {
      requiredExactGate: exactGate,
      exactGate,
      approvalReceipt: receipt({ approvedBy: "codex_build_captain" }),
      allowProvidedReceiptObject: true,
      receiptSigningKey: signingKey,
      now: fixedNow
    });

    expect(result.authorized).toBe(false);
    expect(result.issues).toContain("approval_receipt_target_mismatch");
    expect(result.issues).toContain("approval_receipt_self_approval_blocked");
  });

  it("rejects receipts without explicit budget confirmation", async () => {
    const result = await evaluateProviderCallExactGate(target, {
      requiredExactGate: exactGate,
      exactGate,
      approvalReceipt: receipt({ budgetConfirmed: false }),
      allowProvidedReceiptObject: true,
      receiptSigningKey: signingKey,
      now: fixedNow
    });

    expect(result.authorized).toBe(false);
    expect(result.issues).toContain("approval_receipt_budget_confirmation_required");
  });

  it("rejects an empty provider target even with a valid signed receipt", async () => {
    const emptyTarget = {
      requestId: "",
      commandId: "",
      provider: "",
      model: "",
      maxTokens: null
    };
    const result = await evaluateProviderCallExactGate(emptyTarget, {
      requiredExactGate: exactGate,
      exactGate,
      approvalReceipt: createProviderCallApprovalReceipt({
        receiptId: "provider-receipt-empty",
        ...emptyTarget,
        requestedBy: "codex_build_captain",
        approvedBy: "hermes_commander",
        exactGate,
        budgetConfirmed: true,
        issuedAt: "2026-07-15T00:55:00.000Z",
        expiresAt: "2026-07-15T01:05:00.000Z"
      }, { signingKey }),
      allowProvidedReceiptObject: true,
      receiptSigningKey: signingKey,
      now: fixedNow
    });

    expect(result.authorized).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      "provider_target_request_id_required",
      "provider_target_command_id_required",
      "provider_target_provider_required",
      "provider_target_model_required",
      "provider_target_max_tokens_invalid"
    ]));
  });

  it("binds extended provider scope and enforces approver and budget ceilings", async () => {
    const extendedTarget = {
      ...target,
      taskId: "task-architecture",
      requestDigestSha256: "a".repeat(64),
      promptDigestSha256: "b".repeat(64),
      outputPath: ".ghostclaw_runtime/a2a2a/provider-results/request-1.json",
      route: "claude-code/first-party",
      mode: "read_only_plan",
      allowedTools: ["Read", "Glob", "Grep"],
      maxTurns: 6,
      maxBudgetUsd: 2,
      callCountLimit: 1
    };
    const signed = createProviderCallApprovalReceipt({
      receiptId: "provider-receipt-extended",
      ...extendedTarget,
      requestedBy: "hermes_commander",
      approvedBy: "operator",
      exactGate,
      budgetConfirmed: true,
      issuedAt: "2026-07-15T00:55:00.000Z",
      expiresAt: "2026-07-15T01:05:00.000Z"
    }, { signingKey });
    const result = await evaluateProviderCallExactGate(extendedTarget, {
      requiredExactGate: exactGate,
      exactGate,
      approvalReceipt: signed,
      allowProvidedReceiptObject: true,
      receiptSigningKey: signingKey,
      allowedApprovers: ["operator"],
      allowedRequesters: ["hermes_commander"],
      maxTokensCeiling: 64,
      maxBudgetUsdCeiling: 1,
      requiredTargetFields: ["TaskId", "RequestDigestSha256", "AllowedTools", "CallCountLimit"],
      now: fixedNow
    });

    expect(result.authorized).toBe(false);
    expect(result.issues).toContain("provider_target_budget_exceeds_ceiling");
    expect(result.targetDigest).toBe(digestProviderCallTarget(extendedTarget));
  });

  it("rejects caller-provided receipt objects unless explicitly trusted", async () => {
    const result = await evaluateProviderCallExactGate(target, {
      requiredExactGate: exactGate,
      exactGate,
      approvalReceipt: receipt(),
      receiptSigningKey: signingKey,
      now: fixedNow
    });

    expect(result.authorized).toBe(false);
    expect(result.issues).toContain("provided_approval_receipt_not_trusted");
  });

  it("rejects a receipt after a signed field is changed", async () => {
    const tampered = receipt();
    tampered.maxTokens = 65;
    tampered.targetDigest = digestProviderCallTarget({ ...target, maxTokens: 65 });
    const result = await evaluateProviderCallExactGate(
      { ...target, maxTokens: 65 },
      {
        requiredExactGate: exactGate,
        exactGate,
        approvalReceipt: tampered,
        allowProvidedReceiptObject: true,
        receiptSigningKey: signingKey,
        now: fixedNow
      }
    );

    expect(result.authorized).toBe(false);
    expect(result.issues).toContain("approval_receipt_signature_mismatch");
  });

  it("consumes an authorized receipt exactly once", async () => {
    const consumed = new Set();
    const consumeReceipt = async ({ receiptId }) => {
      if (consumed.has(receiptId)) return false;
      consumed.add(receiptId);
      return true;
    };
    const options = {
      requiredExactGate: exactGate,
      exactGate,
      approvalReceipt: receipt(),
      allowProvidedReceiptObject: true,
      receiptSigningKey: signingKey,
      consumeReceipt,
      now: fixedNow
    };

    const first = await authorizeProviderCallExactGate(target, options);
    const replay = await authorizeProviderCallExactGate(target, options);

    expect(first.authorized).toBe(true);
    expect(first.receiptConsumed).toBe(true);
    expect(replay.authorized).toBe(false);
    expect(replay.reason).toBe("approval_receipt_already_consumed");
  });

  it("atomically claims a file receipt before validation and blocks replay", async () => {
    const root = await mkdtemp(join(tmpdir(), "provider-receipt-"));
    const pendingRoot = join(root, "pending");
    const consumedRoot = join(root, "consumed");
    const receiptPath = join(pendingRoot, "provider-receipt-1.json");
    await mkdir(pendingRoot, { recursive: true });
    await writeFile(receiptPath, `${JSON.stringify(receipt())}\n`, "utf8");
    const options = {
      requiredExactGate: exactGate,
      exactGate,
      approvalReceiptPath: receiptPath,
      approvalReceiptRoot: pendingRoot,
      consumedReceiptRoot: consumedRoot,
      expectedReceiptId: "provider-receipt-1",
      receiptSigningKey: signingKey,
      now: fixedNow
    };

    try {
      const first = await authorizeProviderCallExactGate(target, options);
      const replay = await authorizeProviderCallExactGate(target, options);
      const expectedConsumedPath = join(
        await realpath(consumedRoot),
        "provider-receipt-1.json"
      );

      expect(first.authorized).toBe(true);
      expect(first.receiptConsumed).toBe(true);
      expect(first.consumedPath).toBe(expectedConsumedPath);
      await expect(readFile(receiptPath, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
      expect(JSON.parse(await readFile(first.consumedPath, "utf8"))).toMatchObject({
        receiptId: "provider-receipt-1",
        requestId: target.requestId
      });
      expect(replay.authorized).toBe(false);
      expect(replay.reason).toBe("approval_receipt_already_consumed");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
