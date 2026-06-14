import { getSocStatus } from "../services/dev-control-api/src/soc-status.mjs";

const status = await getSocStatus();
const findings = [];

if (status.externalWrites !== false) findings.push("external_writes_must_remain_false");
if (status.productionWrites !== false) findings.push("production_writes_must_remain_false");
if (status.customerVisible !== false) findings.push("customer_visible_must_remain_false");
if (status.telegram?.canSend !== false) findings.push("telegram_send_must_remain_blocked");
if (!["ready-local", "not-installed"].includes(status.status)) findings.push(`unexpected_status:${status.status}`);

const result = {
  ok: findings.length === 0,
  status: status.status,
  target: status.target,
  telegramStatus: status.telegram?.status,
  truthStates: status.truthStates,
  findings,
  guardrail: "read-only SOC check; no Telegram send, no external connector, no deploy, no push, no secret access"
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!result.ok) {
  process.exitCode = 1;
}
