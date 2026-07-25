#!/usr/bin/env node

import {
  advanceGodmodeV5Baseline,
  buildGodmodeV5BaselineEvidence,
  writeGodmodeV5BaselineEvidence
} from "../services/dev-control-api/src/godmode-v5-baseline-evidence.mjs";

const flags = new Set(process.argv.slice(2));
const repoRoot = process.cwd();

if (flags.has("--advance")) {
  const result = await advanceGodmodeV5Baseline({ repoRoot });
  console.log(JSON.stringify(result, null, 2));
} else {
  const packet = await buildGodmodeV5BaselineEvidence({ repoRoot });
  const output = flags.has("--store")
    ? { ...packet, Receipt: await writeGodmodeV5BaselineEvidence(packet, { repoRoot }) }
    : packet;
  console.log(JSON.stringify(output, null, 2));
  if (!packet.OverallPassed) process.exitCode = 2;
}
