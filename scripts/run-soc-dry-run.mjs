import { writeSocDryRun } from "../services/dev-control-api/src/soc-status.mjs";

const result = await writeSocDryRun();

process.stdout.write(
  `${JSON.stringify(
    {
      ok: result.ok,
      latestPath: result.latestPath,
      queuePath: result.queuePath,
      status: result.status.status,
      telegramStatus: result.status.telegram.status,
      externalWrites: false,
      guardrail: "local JSON/A2A artifact write only; no Telegram send, no deploy, no push, no external connector"
    },
    null,
    2
  )}\n`
);
