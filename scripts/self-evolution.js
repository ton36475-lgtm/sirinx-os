#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const implementation = fileURLToPath(new URL('./self-evolution-core.py', import.meta.url));
const result = spawnSync('python3', [implementation, ...process.argv.slice(2)], {
  stdio: 'inherit',
});

if (result.error) {
  console.error(`[self-evolution] Failed to start Python: ${result.error.message}`);
  process.exit(1);
}

if (result.signal) {
  console.error(`[self-evolution] Python terminated by signal ${result.signal}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
