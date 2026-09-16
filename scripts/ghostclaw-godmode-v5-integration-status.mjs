#!/usr/bin/env node

import {
  getGodmodeV5IntegrationStatus,
  writeGodmodeV5IntegrationStatusReceipt
} from "../services/dev-control-api/src/godmode-v5-integration-status.mjs";

const flags = new Set(process.argv.slice(2));
const requests = {
  TelegramLiveSend: flags.has("--request-telegram-live-send"),
  ProviderCall: flags.has("--request-provider-call"),
  CloudflareWrite: flags.has("--request-cloudflare-write"),
  CloudflareDeploy: flags.has("--request-cloudflare-deploy"),
  GitPush: flags.has("--request-git-push"),
  Install: flags.has("--request-install")
};

const status = await getGodmodeV5IntegrationStatus({
  repoRoot: process.cwd(),
  Requests: requests
});
const output = flags.has("--store")
  ? await writeGodmodeV5IntegrationStatusReceipt({ repoRoot: process.cwd(), status })
  : status;

console.log(JSON.stringify(output, null, 2));
