#!/usr/bin/env node

import {
  getGodmodeV5ArchitectureRequestStatus,
  storeGodmodeV5ArchitectureWaitingPacket
} from "../services/dev-control-api/src/godmode-v5-architecture-request.mjs";

const store = process.argv.includes("--store");
const result = store
  ? await storeGodmodeV5ArchitectureWaitingPacket()
  : await getGodmodeV5ArchitectureRequestStatus();

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
