#!/usr/bin/env node

import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { createCloudflareR4PrerequisitesPacket } from "../services/dev-control-api/src/cloudflare-deployment-readiness.mjs";

const DEFAULT_OUTPUT =
  ".ghostclaw_runtime/a2a2a/templates/cloudflare-r4-prerequisites-packet.json";

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

async function writeJsonAtomic(filePath, value) {
  const absolutePath = path.resolve(filePath);
  const temporaryPath = `${absolutePath}.${process.pid}.tmp`;
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await rename(temporaryPath, absolutePath);
  return absolutePath;
}

const packet = await createCloudflareR4PrerequisitesPacket({
  repoRoot: process.cwd(),
  targetId: option("--target", undefined),
  taskId: option("--task-id", "CF-R4-PREREQUISITES-DRAFT"),
  correlationId: option("--correlation-id", "CF-R4-PREREQUISITES-DRAFT")
});
const outputPath = await writeJsonAtomic(option("--output", DEFAULT_OUTPUT), packet);

process.stdout.write(`${JSON.stringify({
  status: packet.status,
  taskId: packet.taskId,
  targetId: packet.targetId,
  stepCount: packet.steps.length,
  blockerCount: packet.blockers.length,
  execute: packet.execute,
  deploy: packet.deploy,
  outputPath: path.relative(process.cwd(), outputPath)
}, null, 2)}\n`);
