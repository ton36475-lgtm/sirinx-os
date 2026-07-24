#!/usr/bin/env node
// scripts/cron-daily-report.mjs
// Generate daily system report

import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const now = new Date().toISOString();
const report = {};

report.timestamp = now;
report.autoLoop = {};

function runCheck(command) {
  try {
    return { output: execSync(command, { encoding: 'utf8' }).trim() };
  } catch (error) {
    const output = `${error.stdout ?? ''}${error.stderr ?? ''}`.trim();
    return { output, error: error.message };
  }
}

const diskCheck = runCheck('df -h / | tail -1');
report.disk = diskCheck.error ? diskCheck.error : diskCheck.output;

const testCheck = runCheck('npx vitest run packages/types/src/ tests/p0*/ tests/loop-engineering/ 2>&1');
const testSummary = testCheck.output
  .split(/\r?\n/)
  .find((line) => /(?:\bTests?\b|\bpassed\b)/i.test(line));
report.tests = testSummary?.trim() || 'no test output';
if (testCheck.error) report.testsError = testCheck.error;

const rustCheck = runCheck('cargo check 2>&1');
const rustSummary = rustCheck.output
  .split(/\r?\n/)
  .find((line) => /\bFinished\b/i.test(line));
report.rust = rustCheck.error ? rustCheck.error : (rustSummary?.trim() || rustCheck.output || 'no cargo output');

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
const reportPath = `/Users/sirinx/sirinx-os/data/cron-reports/daily-${now.split('T')[0]}.json`;
writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log(`[Daily Report] ${now}`);
console.log(JSON.stringify(report, null, 2));
console.log(`\nReport saved: ${reportPath}`);
