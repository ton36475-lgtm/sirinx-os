#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTelegramApprovalReceipt } from "../services/dev-control-api/src/telegram-exact-gate.mjs";
import { pollTelegramCommandsOnce } from "../services/dev-control-api/src/telegram-command-gateway.mjs";

const fixedNow = () => new Date("2026-07-15T04:30:00.000Z");
const exactGate = "APPROVE_TELEGRAM_GATEWAY_LIVE_SEND_A019E53EE";
const signingKey = "offline-e2e-telegram-signing-key-32-bytes-minimum";
const receiptId = "offline-e2e-team_status";
const root = await mkdtemp(join(tmpdir(), "ghostclaw-telegram-trust-e2e-"));

try {
  const pendingRoot = join(root, "approvals", "pending");
  const consumedRoot = join(root, "approvals", "consumed");
  const approvalReceiptPath = join(pendingRoot, `${receiptId}.json`);
  const offsetPath = join(root, "offset.json");
  const pollReceiptPath = join(root, "poll-receipt.json");
  await mkdir(pendingRoot, { recursive: true });
  const approvalReceipt = createTelegramApprovalReceipt({
    receiptId,
    scope: "telegram_live_send",
    commandId: "team_status",
    requestedBy: "codex_build_captain",
    approvedBy: "hermes_commander",
    exactGate,
    recipientTarget: "200",
    configuredChatMatched: true,
    tokenPresenceOnlyChecked: true,
    issuedAt: "2026-07-15T04:25:00.000Z",
    expiresAt: "2026-07-15T04:35:00.000Z"
  }, { signingKey });
  await writeFile(approvalReceiptPath, `${JSON.stringify(approvalReceipt, null, 2)}\n`, "utf8");

  let updateCall = 0;
  const fetchImpl = async (url) => {
    if (url.endsWith("/getUpdates")) {
      updateCall += 1;
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          ok: true,
          result: [{
            update_id: 42 + updateCall,
            callback_query: {
              id: `callback-${updateCall}`,
              data: "cmd:team-status",
              from: { id: 100 },
              message: { chat: { id: 200 } }
            }
          }]
        })
      };
    }
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true, result: { message_id: 1, chat: { id: 200 } } })
    };
  };

  const options = {
    token: "offline-test-token",
    chatId: "200",
    fetchImpl,
    offsetPath,
    receiptPath: pollReceiptPath,
    repoRoot: process.cwd(),
    root: process.cwd(),
    liveSendResponses: true,
    approvalReceiptId: receiptId,
    liveSendApprovalReceiptPath: approvalReceiptPath,
    liveSendApprovalReceiptRoot: pendingRoot,
    liveSendConsumedReceiptRoot: consumedRoot,
    telegramApprovalSigningKey: signingKey,
    storeOffset: true,
    storeReceipt: true,
    now: fixedNow
  };

  const first = await pollTelegramCommandsOnce(options);
  assert.equal(first.status, "completed-telegram-command-poll");
  assert.equal(first.commandResults[0].telegramSent, true);
  assert.equal(first.commandResults[0].callbackAcknowledged, true);
  assert.equal(first.commandResults[0].liveResponseAuthorized, true);
  assert.equal(first.providerCalled, false);
  assert.equal(
    JSON.parse(await readFile(join(consumedRoot, `${receiptId}.json`), "utf8")).receiptId,
    receiptId
  );

  const replay = await pollTelegramCommandsOnce(options);
  assert.equal(replay.status, "completed-telegram-command-poll");
  assert.equal(replay.commandResults[0].telegramSent, false);
  assert.equal(replay.commandResults[0].callbackAcknowledged, false);
  assert.equal(replay.commandResults[0].liveResponseAuthorized, false);
  assert.equal(replay.externalWrites, false);

  process.stdout.write(`${JSON.stringify({
    status: "passed",
    mode: "offline_injected_fetch",
    firstSendAuthorized: true,
    receiptConsumedBeforeSend: true,
    replayBlockedBeforeSend: true,
    providerCalled: false,
    externalNetworkUsed: false
  })}\n`);
} finally {
  await rm(root, { recursive: true, force: true });
}
