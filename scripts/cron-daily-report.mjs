#!/usr/bin/env node
// scripts/cron-daily-report.mjs
// Generate daily system report

import { execSync } from 'node:child_process';

const now = new Date().toISOString();
const report = {};

report.timestamp = now;
report.disk = execSync('df -h / | tail -1').toString().trim();
report.tests = execSync('npx vitest run packages/types/src/ tests/p0*/ tests/loop-engineering/ 2>&1 | grep Tests').toString().trim();
report.rust = execSync('cargo check 2>&1 | grep Finished || echo "error"').toString().trim();
report.autoLoop = {};

// Get auto-loop stats
try {
  const loop = execSync('node /Users/sirinx/sirinx-os/scripts/auto-loop-engineering.mjs 2>&1', { encoding: 'utf8' });
  const match = loop.match(/"executed": (\d+)/);
  report.autoLoop.executed = match ? match[1] : '0';
  const chain = loop.match(/"chainValid": (\w+)/);
  report.autoLoop.chainValid = chain ? chain[1] : 'false';
} catch (e) {
  report.autoLoop.error = e.message;
}

// Write report
import { writeFileSync } from 'node:fs';
const reportPath = `/Users/sirinx/sirinx-os/data/cron-reports/daily-${now.split('T')[0]}.json`;
writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log(`[Daily Report] ${now}`);
console.log(JSON.stringify(report, null, 2));
console.log(`\nReport saved: ${reportPath}`);