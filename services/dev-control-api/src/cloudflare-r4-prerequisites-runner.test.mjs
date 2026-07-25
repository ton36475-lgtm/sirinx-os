import { describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";

import {
  buildCloudflareR4PrerequisitePlan,
  createCloudflareR4ApprovalGrant,
  executeCloudflareR4PrerequisiteStep,
  verifyCloudflareR4ApprovalGrant,
  verifyCloudflareR4StepReceipt
} from "./cloudflare-r4-prerequisites-runner.mjs";

const TASK_ID = "CF-R4-PREREQUISITES-TEST";
const fixedNow = () => new Date("2026-07-15T15:00:00.000Z");
let grantSequence = 0;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function packet() {
  const definitions = [
    ["oauth_login", "OAUTH_LOGIN"],
    ["resource_discovery", "RESOURCE_DISCOVERY"],
    ["resource_creation", "RESOURCE_CREATE"],
    ["secret_provision", "SECRET_PROVISION"]
  ];
  return {
    $schema: "ghostclaw.cloudflare.r4_prerequisites_packet.v1",
    taskId: TASK_ID,
    targetId: "hermes_orchestrator_preview",
    configPath: "services/orchestrator/wrangler.preview.jsonc",
    steps: definitions.map(([id, gate]) => ({
      id,
      status: "exact-gate-required",
      requiredGatePattern: `APPROVE_CLOUDFLARE_R4_${gate}_PACKET_<packet_id>`,
      expectedGateId: `APPROVE_CLOUDFLARE_R4_${gate}_PACKET_${TASK_ID}`,
      exactGateId: null,
      execute: false,
      commandPreview: "untrusted packet text must not execute"
    })),
    execute: false,
    deploy: false
  };
}

function approvalGrant(stepId, overrides = {}, sourcePacket = packet()) {
  const step = sourcePacket.steps.find((candidate) => candidate.id === stepId);
  const grant = {
    $schema: "ghostclaw.cloudflare.r4_prerequisite_approval_grant.v1",
    grantId: `grant-${stepId}-test-${++grantSequence}`,
    taskId: sourcePacket.taskId,
    targetId: sourcePacket.targetId,
    stepId,
    packetDigestSha256: sha256(JSON.stringify(sourcePacket)),
    exactGateId: step.expectedGateId,
    approvedBy: "human_operator",
    issuedAt: "2026-07-15T14:59:00.000Z",
    expiresAt: "2026-07-15T15:05:00.000Z",
    singleUse: true,
    consumed: false,
    trustBoundary: "local-human-operator-record-not-cryptographic-identity",
    ...overrides
  };
  grant.grantDigestSha256 = sha256(JSON.stringify(grant));
  return grant;
}

function approvalGrantClaim() {
  return async ({ grantDigestSha256 }) => ({
    claimed: true,
    claimDigestSha256: sha256(`claim:${grantDigestSha256}`)
  });
}

async function completeStep(stepId, priorReceipts = []) {
  return executeCloudflareR4PrerequisiteStep({
    packet: packet(),
    stepId,
    execute: true,
    approvalGrant: approvalGrant(stepId),
    claimApprovalGrant: approvalGrantClaim(),
    priorReceipts,
    now: fixedNow,
    runCommand: async () => ({
      exitCode: 0,
      stdout: "sensitive-looking command output must not be retained",
      stderr: "",
      executableDigestSha256: "a".repeat(64),
      wranglerEntrypointDigestSha256: "b".repeat(64)
    })
  });
}

describe("Cloudflare R4 prerequisite runner", () => {
  it("builds a non-executing plan from a fixed argv allowlist", async () => {
    const runCommand = vi.fn();
    const result = await executeCloudflareR4PrerequisiteStep({
      packet: packet(),
      stepId: "oauth_login",
      execute: false,
      runCommand,
      now: fixedNow
    });

    expect(result.status).toBe("dry-run-exact-gate-required");
    expect(result.execute).toBe(false);
    expect(result.expectedGateId).toBe(
      `APPROVE_CLOUDFLARE_R4_OAUTH_LOGIN_PACKET_${TASK_ID}`
    );
    expect(result.commands).toEqual([
      {
        command: "node-runtime",
        args: [
          "node_modules/wrangler/bin/wrangler.js",
          "login",
          "--config",
          "wrangler.preview.jsonc"
        ],
        cwd: "services/orchestrator",
        interactive: true
      }
    ]);
    expect(JSON.stringify(result)).not.toContain("untrusted packet text");
    expect(runCommand).not.toHaveBeenCalled();
  });

  it("rejects unknown or compound step identifiers", () => {
    expect(() =>
      buildCloudflareR4PrerequisitePlan({ packet: packet(), stepId: "deploy" })
    ).toThrow(/Unknown Cloudflare R4 prerequisite step/);
    expect(() =>
      buildCloudflareR4PrerequisitePlan({
        packet: packet(),
        stepId: "oauth_login,resource_discovery"
      })
    ).toThrow(/Unknown Cloudflare R4 prerequisite step/);
  });

  it("rejects a caller-supplied gate string without a bound approval grant", async () => {
    await expect(
      executeCloudflareR4PrerequisiteStep({
        packet: packet(),
        stepId: "oauth_login",
        execute: true,
        approvalGateId: "APPROVE_ALL",
        runCommand: vi.fn(),
        now: fixedNow
      })
    ).rejects.toThrow(/Approval grant is required/);
  });

  it("rejects an expired or packet-mismatched approval grant", async () => {
    await expect(
      executeCloudflareR4PrerequisiteStep({
        packet: packet(),
        stepId: "oauth_login",
        execute: true,
        approvalGrant: approvalGrant("oauth_login", {
          expiresAt: "2026-07-15T14:59:59.000Z"
        }),
        runCommand: vi.fn(),
        now: fixedNow
      })
    ).rejects.toThrow(/Approval grant expired/);
  });

  it("creates a short-lived packet-bound approval grant for one exact step gate", () => {
    const sourcePacket = packet();
    const grant = createCloudflareR4ApprovalGrant({
      packet: sourcePacket,
      stepId: "oauth_login",
      exactGateId: `APPROVE_CLOUDFLARE_R4_OAUTH_LOGIN_PACKET_${TASK_ID}`,
      grantId: "grant-oauth-login-created-test",
      ttlSeconds: 300,
      now: fixedNow
    });

    expect(grant).toMatchObject({
      $schema: "ghostclaw.cloudflare.r4_prerequisite_approval_grant.v1",
      grantId: "grant-oauth-login-created-test",
      taskId: TASK_ID,
      targetId: "hermes_orchestrator_preview",
      stepId: "oauth_login",
      approvedBy: "human_operator",
      singleUse: true,
      consumed: false,
      issuedAt: "2026-07-15T15:00:00.000Z",
      expiresAt: "2026-07-15T15:05:00.000Z"
    });
    expect(grant.packetDigestSha256).toBe(sha256(JSON.stringify(sourcePacket)));
    expect(grant.grantDigestSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(
      verifyCloudflareR4ApprovalGrant({
        packet: sourcePacket,
        stepId: "oauth_login",
        approvalGrant: grant,
        now: fixedNow
      })
    ).toEqual({ ok: true, blockers: [] });
  });

  it("refuses to issue a grant for a mismatched gate or excessive lifetime", () => {
    expect(() =>
      createCloudflareR4ApprovalGrant({
        packet: packet(),
        stepId: "oauth_login",
        exactGateId: "APPROVE_ALL",
        grantId: "grant-invalid-gate-test",
        ttlSeconds: 300,
        now: fixedNow
      })
    ).toThrow(/exact gate mismatch/i);

    expect(() =>
      createCloudflareR4ApprovalGrant({
        packet: packet(),
        stepId: "oauth_login",
        exactGateId: `APPROVE_CLOUDFLARE_R4_OAUTH_LOGIN_PACKET_${TASK_ID}`,
        grantId: "grant-invalid-lifetime-test",
        ttlSeconds: 901,
        now: fixedNow
      })
    ).toThrow(/lifetime/i);
  });

  it("enforces dependency order before invoking a command", async () => {
    const runCommand = vi.fn();
    await expect(
      executeCloudflareR4PrerequisiteStep({
        packet: packet(),
        stepId: "resource_discovery",
        execute: true,
        approvalGrant: approvalGrant("resource_discovery"),
        priorReceipts: [],
        runCommand,
        now: fixedNow
      })
    ).rejects.toThrow(/Missing successful prerequisite receipt: oauth_login/);
    expect(runCommand).not.toHaveBeenCalled();
  });

  it("rejects same-length dependency substitution before claiming or invoking a command", async () => {
    const oauth = await completeStep("oauth_login");
    const unexpectedReceipt = {
      ...oauth,
      stepId: "unexpected_prerequisite"
    };
    const claimApprovalGrant = vi.fn(approvalGrantClaim());
    const runCommand = vi.fn();

    await expect(
      executeCloudflareR4PrerequisiteStep({
        packet: packet(),
        stepId: "resource_creation",
        execute: true,
        approvalGrant: approvalGrant("resource_creation"),
        claimApprovalGrant,
        priorReceipts: [oauth, unexpectedReceipt],
        runCommand,
        now: fixedNow
      })
    ).rejects.toThrow(/Missing successful prerequisite receipt: resource_discovery/);

    expect(claimApprovalGrant).not.toHaveBeenCalled();
    expect(runCommand).not.toHaveBeenCalled();
  });

  it("creates a verifiable receipt without retaining raw command output", async () => {
    const receipt = await completeStep("oauth_login");

    expect(receipt.status).toBe("succeeded");
    expect(receipt.execute).toBe(true);
    expect(receipt.results).toHaveLength(1);
    expect(receipt.results[0].exitCode).toBe(0);
    expect(receipt.results[0].outputDigestSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(receipt.results[0]).not.toHaveProperty("stdout");
    expect(receipt.results[0]).not.toHaveProperty("stderr");
    expect(JSON.stringify(receipt)).not.toContain("sensitive-looking");
    expect(receipt.secretValueCapturedByWrapper).toBe(false);
    expect(receipt.secretValuePrintedByWrapper).toBe(false);
    expect(receipt.childOutputRedactionGuaranteed).toBe(false);
    expect(verifyCloudflareR4StepReceipt(receipt, packet(), [])).toEqual({
      ok: true,
      blockers: []
    });
  });

  it("does not accept packet status as dependency proof", async () => {
    const sourcePacket = packet();
    sourcePacket.steps[0].status = "verified";
    await expect(
      executeCloudflareR4PrerequisiteStep({
        packet: sourcePacket,
        stepId: "resource_discovery",
        execute: true,
        approvalGrant: approvalGrant("resource_discovery", {}, sourcePacket),
        priorReceipts: [],
        runCommand: vi.fn(),
        now: fixedNow
      })
    ).rejects.toThrow(/Missing successful prerequisite receipt: oauth_login/);
  });

  it("rejects a receipt whose recorded argv differs from the allowlist", async () => {
    const receipt = await completeStep("oauth_login");
    receipt.results[0].args = ["malicious-command"];
    const digestInput = { ...receipt };
    delete digestInput.receiptDigestSha256;
    receipt.receiptDigestSha256 = sha256(JSON.stringify(digestInput));

    expect(verifyCloudflareR4StepReceipt(receipt, packet(), [])).toEqual({
      ok: false,
      blockers: ["Receipt command result does not match the fixed argv allowlist: 0"]
    });
  });

  it("advances exactly one step when prior receipts form a valid chain", async () => {
    const oauth = await completeStep("oauth_login");
    const discovery = await completeStep("resource_discovery", [oauth]);
    const creation = await completeStep("resource_creation", [oauth, discovery]);
    const secretRunner = vi.fn(async () => ({
      exitCode: 0,
      stdout: "never store this secret-provider output",
      stderr: "",
      executableDigestSha256: "a".repeat(64),
      wranglerEntrypointDigestSha256: "b".repeat(64)
    }));

    const secret = await executeCloudflareR4PrerequisiteStep({
      packet: packet(),
      stepId: "secret_provision",
      execute: true,
      approvalGrant: approvalGrant("secret_provision"),
      claimApprovalGrant: approvalGrantClaim(),
      priorReceipts: [oauth, discovery, creation],
      now: fixedNow,
      runCommand: secretRunner
    });

    expect(secret.status).toBe("succeeded");
    expect(secret.stepId).toBe("secret_provision");
    expect(secret.results).toHaveLength(1);
    expect(secretRunner).toHaveBeenCalledTimes(1);
    const command = secretRunner.mock.calls[0][0];
    expect(command.command).toBe("node-runtime");
    expect(command.args).toEqual([
      "node_modules/wrangler/bin/wrangler.js",
      "secret",
      "put",
      "HERMES_API_TOKEN",
      "--config",
      "wrangler.preview.jsonc"
    ]);
    expect(command.args.join(" ")).not.toMatch(/glm-share|sk-/i);
    expect(command.interactive).toBe(true);
    expect(JSON.stringify(secret)).not.toContain("never store this");
    expect(verifyCloudflareR4StepReceipt(secret, packet(), [oauth, discovery, creation])).toEqual({
      ok: true,
      blockers: []
    });
  });

  it("binds the dependency digest to the normalized chain order", async () => {
    const oauth = await completeStep("oauth_login");
    const discovery = await completeStep("resource_discovery", [oauth]);
    const creation = await completeStep("resource_creation", [oauth, discovery]);

    const secret = await executeCloudflareR4PrerequisiteStep({
      packet: packet(),
      stepId: "secret_provision",
      execute: true,
      approvalGrant: approvalGrant("secret_provision"),
      claimApprovalGrant: approvalGrantClaim(),
      priorReceipts: [creation, oauth, discovery],
      now: fixedNow,
      runCommand: async () => ({
        exitCode: 0,
        stdout: "",
        stderr: "",
        executableDigestSha256: "a".repeat(64),
        wranglerEntrypointDigestSha256: "b".repeat(64)
      })
    });

    expect(secret.dependencyReceiptDigestSha256).toBe(creation.receiptDigestSha256);
    expect(
      verifyCloudflareR4StepReceipt(secret, packet(), [creation, oauth, discovery])
    ).toEqual({ ok: true, blockers: [] });
  });

  it("claims one grant at most once across concurrent core executions", async () => {
    const sourcePacket = packet();
    const grant = approvalGrant("oauth_login", {}, sourcePacket);
    const claimApprovalGrant = vi.fn(approvalGrantClaim());
    let releaseCommand;
    const commandBarrier = new Promise((resolve) => {
      releaseCommand = resolve;
    });
    const runCommand = vi.fn(async () => {
      await commandBarrier;
      return {
        exitCode: 0,
        stdout: "",
        stderr: "",
        executableDigestSha256: "a".repeat(64),
        wranglerEntrypointDigestSha256: "b".repeat(64)
      };
    });
    const options = {
      packet: sourcePacket,
      stepId: "oauth_login",
      execute: true,
      approvalGrant: grant,
      claimApprovalGrant,
      priorReceipts: [],
      now: fixedNow,
      runCommand
    };

    const first = executeCloudflareR4PrerequisiteStep(options);
    const second = executeCloudflareR4PrerequisiteStep(options);
    await Promise.resolve();
    releaseCommand();
    const outcomes = await Promise.allSettled([first, second]);

    expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(1);
    expect(outcomes.filter((outcome) => outcome.status === "rejected")).toHaveLength(1);
    expect(outcomes.find((outcome) => outcome.status === "rejected")?.reason.message)
      .toMatch(/already claimed or consumed/);
    expect(claimApprovalGrant).toHaveBeenCalledTimes(1);
    expect(runCommand).toHaveBeenCalledTimes(1);
  });
});
