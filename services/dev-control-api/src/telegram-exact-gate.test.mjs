import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  authorizeTelegramExactGate,
  createTelegramApprovalReceipt,
  digestTelegramExactGate,
  digestTelegramRecipientTarget,
  evaluateTelegramExactGate
} from "./telegram-exact-gate.mjs";

const fixedNow = () => new Date("2026-07-15T00:10:00.000Z");
const liveSendGate = "APPROVE_TELEGRAM_GATEWAY_LIVE_SEND_A019E53EE";
const signingKey = "telegram-test-signing-key-at-least-32-bytes";

function receipt(overrides = {}) {
  return createTelegramApprovalReceipt({
    receiptId: "receipt-status-1",
    scope: "telegram_live_send",
    commandId: "runtime_status",
    requestedBy: "codex_build_captain",
    approvedBy: "hermes_commander",
    exactGate: liveSendGate,
    recipientTarget: "configured-chat",
    configuredChatMatched: true,
    tokenPresenceOnlyChecked: true,
    issuedAt: "2026-07-15T00:05:00.000Z",
    expiresAt: "2026-07-15T00:15:00.000Z",
    ...overrides
  }, { signingKey });
}

describe("Telegram exact gate", () => {
  it("validates a signed, target-bound, non-self-approved receipt", async () => {
    const result = await evaluateTelegramExactGate(
      { scope: "telegram_live_send", commandId: "runtime_status" },
      {
        repoRoot: process.cwd(),
        exactGate: liveSendGate,
        approvalReceipt: receipt(),
        allowProvidedReceiptObject: true,
        receiptSigningKey: signingKey,
        now: fixedNow
      }
    );

    expect(result.authorized).toBe(true);
    expect(result.gateDigest).toBe(digestTelegramExactGate(liveSendGate));
    expect(result.recipientTargetDigest).toBe(digestTelegramRecipientTarget("configured-chat"));
    expect(JSON.stringify(result)).not.toContain(liveSendGate);
    expect(result.keyValuePrinted).toBe(false);
  });

  it("blocks untrusted objects, self approval, expiration, raw gates, and signature tampering", async () => {
    const untrusted = await evaluateTelegramExactGate(
      { scope: "telegram_live_send", commandId: "runtime_status" },
      {
        repoRoot: process.cwd(),
        exactGate: liveSendGate,
        approvalReceipt: receipt(),
        receiptSigningKey: signingKey,
        now: fixedNow
      }
    );
    expect(untrusted.issues).toContain("provided_approval_receipt_not_trusted");

    const invalidReceipt = receipt({
      approvedBy: "codex_build_captain",
      expiresAt: "2026-07-15T00:09:00.000Z"
    });
    invalidReceipt.gate = liveSendGate;
    invalidReceipt.receiptSignature = "0".repeat(64);
    const invalid = await evaluateTelegramExactGate(
      { scope: "telegram_live_send", commandId: "runtime_status" },
      {
        repoRoot: process.cwd(),
        exactGate: liveSendGate,
        approvalReceipt: invalidReceipt,
        allowProvidedReceiptObject: true,
        receiptSigningKey: signingKey,
        now: fixedNow
      }
    );
    expect(invalid.authorized).toBe(false);
    expect(invalid.issues).toEqual(
      expect.arrayContaining([
        "approval_receipt_self_approval_blocked",
        "approval_receipt_expired",
        "approval_receipt_must_not_store_raw_gate",
        "approval_receipt_signature_mismatch"
      ])
    );
  });

  it("blocks a provider call without a request-bound exact gate receipt", async () => {
    const result = await evaluateTelegramExactGate(
      { scope: "provider_call", commandId: "model_smoke_preview", requestId: "REQ-42" },
      {
        repoRoot: process.cwd(),
        exactGate: "APPROVE_TELEGRAM_PROVIDER_CALL_REQ-41",
        approvalReceipt: createTelegramApprovalReceipt({
          receiptId: "receipt-provider-42",
          scope: "provider_call",
          commandId: "model_smoke_preview",
          requestId: "REQ-42",
          requestedBy: "codex_build_captain",
          approvedBy: "hermes_commander",
          exactGate: "APPROVE_TELEGRAM_PROVIDER_CALL_REQ-42",
          issuedAt: "2026-07-15T00:05:00.000Z",
          expiresAt: "2026-07-15T00:15:00.000Z"
        }, { signingKey }),
        allowProvidedReceiptObject: true,
        receiptSigningKey: signingKey,
        now: fixedNow
      }
    );

    expect(result.authorized).toBe(false);
    expect(result.issues).toContain("exact_gate_mismatch");
  });

  it("atomically claims a file receipt and blocks replay", async () => {
    const root = await mkdtemp(join(tmpdir(), "telegram-exact-gate-"));
    const pendingRoot = join(root, "pending");
    const consumedRoot = join(root, "consumed");
    const receiptId = "receipt-file-live-1";
    const receiptPath = join(pendingRoot, `${receiptId}.json`);
    await mkdir(pendingRoot, { recursive: true });
    await writeFile(receiptPath, `${JSON.stringify(receipt({ receiptId }), null, 2)}\n`, "utf8");

    const options = {
      repoRoot: process.cwd(),
      exactGate: liveSendGate,
      approvalReceiptPath: receiptPath,
      approvalReceiptRoot: pendingRoot,
      consumedReceiptRoot: consumedRoot,
      expectedReceiptId: receiptId,
      receiptSigningKey: signingKey,
      now: fixedNow
    };
    const first = await authorizeTelegramExactGate(
      { scope: "telegram_live_send", commandId: "runtime_status" },
      options
    );
    expect(first.authorized).toBe(true);
    expect(first.receiptConsumed).toBe(true);
    expect(JSON.parse(await readFile(join(consumedRoot, `${receiptId}.json`), "utf8")).receiptId).toBe(receiptId);

    const replay = await authorizeTelegramExactGate(
      { scope: "telegram_live_send", commandId: "runtime_status" },
      options
    );
    expect(replay.authorized).toBe(false);
    expect(replay.reason).toBe("approval_receipt_already_consumed");
  });
});
