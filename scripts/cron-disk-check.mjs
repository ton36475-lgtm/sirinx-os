#!/usr/bin/env node
// scripts/cron-disk-check.mjs
// Disk space monitor + auto cleanup when usage > 85%

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

function getDiskUsage() {
  const output = execSync('df -h /').toString();
  const lines = output.trim().split('\n');
  const parts = lines[1].split(/\s+/);
  // df -h columns: Filesystem, Size, Used, Avail, Capacity, iused, ifree, %iused, Mounted on
  return {
    total: parts[1],
    used: parts[2],
    available: parts[3],
    capacity: parseInt(parts[4]),
  };
}

function cleanup() {
  let freedKB = 0;
  const targets = [
    { path: '/Users/sirinx/.npm/_npx', label: 'npm npx cache' },
    { path: '/Users/sirinx/.npm/_cacache', label: 'npm cache' },
  ];
  
  for (const t of targets) {
    try {
      const before = execSync(`du -sk ${t.path} 2>/dev/null || echo 0`).toString().trim().split(/\s+/)[0];
      execSync(`rm -rf ${t.path}/* 2>/dev/null || true`);
      freedKB += parseInt(before) || 0;
    } catch (e) { /* skip */ }
  }

  // Go build cache
  try {
    execSync('go clean -cache 2>/dev/null || true');
  } catch (e) { /* skip */ }

  // Brew cleanup
  try {
    execSync('brew cleanup --prune=0 2>/dev/null || true');
  } catch (e) { /* skip */ }

  // Temp files older than 24h
  try {
    execSync('find /tmp -maxdepth 1 -name "flashpay-*" -mtime +0 -delete 2>/dev/null || true');
  } catch (e) { /* skip */ }

  return { freedMB: Math.round(freedKB / 1024) };
}

const disk = getDiskUsage();

console.log(`[Disk Check] ${new Date().toISOString()}`);
console.log(`  Total: ${disk.total} | Used: ${disk.used} (${disk.capacity}%) | Avail: ${disk.available}`);

if (disk.capacity > 85) {
  console.log(`  ⚠️ Disk usage ${disk.capacity}% > 85% — running cleanup...`);
  const result = cleanup();
  const after = getDiskUsage();
  console.log(`  ✅ Cleanup freed ~${result.freedMB}MB`);
  console.log(`  After: ${after.used} (${after.capacity}%) | Avail: ${after.available}`);
  
  if (after.capacity > 90) {
    console.log(`  🚨 CRITICAL: Disk still at ${after.capacity}% after cleanup!`);
  }
} else {
  console.log(`  ✅ Disk usage normal (${disk.capacity}%)`);
}
