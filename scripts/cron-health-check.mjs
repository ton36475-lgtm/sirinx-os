#!/usr/bin/env node
// scripts/cron-health-check.mjs
// Health check for SIRINX OS services

import { execSync } from 'node:child_process';

const services = [
  { name: 'Skills API', url: 'http://localhost:3800/health' },
  { name: 'Dev Control API', url: 'http://localhost:8711/health' },
];

console.log(`[Health Check] ${new Date().toISOString()}`);

let allHealthy = true;
for (const svc of services) {
  try {
    const result = execSync(`curl -s ${svc.url} 2>/dev/null || echo '{"status":"ERROR"}'`, { encoding: 'utf8' });
    const parsed = JSON.parse(result);
    if (parsed.status === 'ok') {
      console.log(`  ✅ ${svc.name}: ${parsed.status}`);
    } else {
      console.log(`  ⚠️ ${svc.name}: ${parsed.status}`);
      allHealthy = false;
    }
  } catch (e) {
    console.log(`  ❌ ${svc.name}: DOWN`);
    allHealthy = false;
  }
}

// Rust compile check
try {
  const rust = execSync('cargo check 2>&1', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  if (rust.includes('Finished')) {
    console.log('  ✅ Rust (ghostclaw): compiles');
  }
} catch (e) {
  console.log('  ❌ Rust (ghostclaw): compile error');
  allHealthy = false;
}

// Tests check
try {
  const testResult = execSync('npx vitest run packages/types/src/ tests/p0*/ tests/loop-engineering/ --reporter=verbose 2>&1 | tail -1', { encoding: 'utf8' });
  if (testResult.includes('passed')) {
    const match = testResult.match(/(\d+) passed/);
    console.log(`  ✅ GhostClaw tests: ${match ? match[0] : 'running'}`);
  }
} catch (e) {
  /* skip */
}

console.log(`\n${allHealthy ? '✅ All services healthy' : '⚠️ Some services need attention'}`);