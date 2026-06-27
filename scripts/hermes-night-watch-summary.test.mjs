import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const repoRoot = new URL("..", import.meta.url).pathname;
const scriptPath = join(repoRoot, "scripts", "hermes-night-watch-summary.sh");

function makeTempCase(name) {
  const root = mkdtempSync(join(tmpdir(), `sirinx-night-watch-${name}-`));
  const target = join(root, "sirinx-os");
  const bin = join(root, "bin");
  mkdirSync(target, { recursive: true });
  mkdirSync(bin, { recursive: true });
  execFileSync("git", ["init"], { cwd: target, stdio: "ignore" });
  return { root, target, bin };
}

function writeFakePnpm(bin, body) {
  const pnpmPath = join(bin, "pnpm");
  writeFileSync(pnpmPath, `#!/usr/bin/env bash\n${body}\n`);
  chmodSync(pnpmPath, 0o755);
}

function writeReport(path, body) {
  mkdirSync(join(path, ".hermes", "logs"), { recursive: true });
  const reportPath = join(path, ".hermes", "logs", "night-watch-latest.md");
  writeFileSync(reportPath, body);
  return reportPath;
}

function runSummary(testCase, extraEnv = {}) {
  return spawnSync("bash", [scriptPath], {
    cwd: repoRoot,
    env: {
      ...process.env,
      PATH: `${testCase.bin}:${process.env.PATH}`,
      SIRINX_NIGHT_WATCH_TARGET_DIR: testCase.target,
      TERM: "dumb",
      ...extraEnv,
    },
    encoding: "utf8",
  });
}

{
  const testCase = makeTempCase("blocked");
  writeFakePnpm(
    testCase.bin,
    `echo "Scope: all 11 workspace projects"
echo "[ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY] Aborted removal of modules directory due to no TTY" >&2
exit 1`,
  );
  writeReport(
    testCase.target,
    `## 2026-06-27 03:48:53 +07

### Final Status

WARN

### Status Notes

- Hermes status has degraded or unavailable probes; see Hermes section.

### Local Stack

\`\`\`text
dev-control-api: online http://127.0.0.1:8711/health
\`\`\`

### Hermes

\`\`\`text
Hermes Desktop: online http://127.0.0.1:9119
Gateway service is loaded
"LastExitStatus" = 15;
  blocked   2
\`\`\`

### Public Website

- \`https://www.sirinx.co/\`: HTTP 200
- \`https://www.sirinx.co/assessment\`: HTTP 200
- Sitemap URL count: 94
- Province route count in sitemap: 78
`,
  );
  writeFileSync(join(testCase.target, "dirty.txt"), "untracked\n");

  const result = runSummary(testCase);

  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /Local Stack: Healthy/);
  assert.match(result.stdout, /Hermes Desktop: Healthy/);
  assert.match(result.stdout, /Hermes Gateway: Failed \/ Unhealthy/);
  assert.match(result.stdout, /Public Website: Healthy/);
  assert.match(result.stdout, /Sitemap: Healthy/);
  assert.match(result.stdout, /Province Route Count: Healthy/);
  assert.match(result.stdout, /Git Dirty States: Failed \/ Unhealthy/);
  assert.match(result.stdout, /Diagnosis Required/);
  assert.match(result.stdout, /ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY/);
}

{
  const testCase = makeTempCase("healthy");
  writeFakePnpm(testCase.bin, `echo "Hermes night-watch status: OK"\nexit 0`);
  const reportPath = join(testCase.root, "night-watch-latest.md");
  writeFileSync(
    reportPath,
    `## 2026-06-27 17:30:00 +07

### Final Status

OK

### Status Notes

- No blocking issues observed by the shell snapshot.

### Local Stack

\`\`\`text
dev-control-api: online http://127.0.0.1:8711/health
\`\`\`

### Hermes

\`\`\`text
Hermes Desktop: online http://127.0.0.1:9119
Gateway service is loaded
  blocked   0
\`\`\`

### Public Website

- \`https://www.sirinx.co/\`: HTTP 200
- \`https://www.sirinx.co/assessment\`: HTTP 200
- Sitemap URL count: 94
- Province route count in sitemap: 78

### Git

\`\`\`text
sirinx-os: branch=main commit=abc healthy dirty_files=0
\`\`\`
`,
  );

  const result = runSummary(testCase, {
    SIRINX_NIGHT_WATCH_LATEST_REPORT: reportPath,
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Local Stack: Healthy/);
  assert.match(result.stdout, /Hermes Desktop: Healthy/);
  assert.match(result.stdout, /Hermes Gateway: Healthy/);
  assert.match(result.stdout, /Git Dirty States: Healthy/);
  assert.match(result.stdout, /ทุกระบบทำงานปกติเสร็จสมบูรณ์/);
}

console.log("hermes-night-watch-summary tests passed");
