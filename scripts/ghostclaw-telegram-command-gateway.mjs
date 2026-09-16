#!/usr/bin/env node

import { getTelegramCommandGatewayStatus, pollTelegramCommandsOnce } from "../services/dev-control-api/src/telegram-command-gateway.mjs";

function readArgument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? String(process.argv[index + 1] || "").trim() : "";
}

const liveOnce = process.argv.includes("--live-once");
const pollOnce = process.argv.includes("--poll-once");
const approvalReceiptId =
  readArgument("--approval-receipt-id") ||
  String(process.env.TelegramLiveApprovalReceiptId || process.env.TELEGRAM_LIVE_APPROVAL_RECEIPT_ID || "").trim();
const result = liveOnce
  ? await pollTelegramCommandsOnce({
      liveSendResponses: true,
      approvalReceiptId,
      storeOffset: true,
      storeReceipt: true
    })
  : pollOnce
    ? await pollTelegramCommandsOnce({ liveSendResponses: false, storeOffset: true, storeReceipt: true })
    : await getTelegramCommandGatewayStatus();

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (String(result.status).includes("blocked") || String(result.status).includes("failed")) process.exitCode = 1;
