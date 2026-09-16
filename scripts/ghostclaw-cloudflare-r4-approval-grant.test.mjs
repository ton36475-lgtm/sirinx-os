import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  symlink,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = "scripts/ghostclaw-cloudflare-r4-approval-grant.mjs";
const SAFE_STORE_HELPER = path.join(
  REPO_ROOT,
  "scripts/ghostclaw-cloudflare-r4-safe-store.py"
);
const TEST_ROOT = `.ghostclaw_runtime/tests/cloudflare-r4-grant-${process.pid}`;
const PACKET_PATH = `${TEST_ROOT}/packet.json`;
const TASK_ID = `CF-R4-GRANT-CLI-${process.pid}`;
const GATE = `APPROVE_CLOUDFLARE_R4_OAUTH_LOGIN_PACKET_${TASK_ID}`;

function packet() {
  const definitions = [
    ["oauth_login", "OAUTH_LOGIN"],
    ["resource_discovery", "RESOURCE_DISCOVERY"],
    ["resource_creation", "RESOURCE_CREATE"],
    ["secret_provision", "SECRET_PROVISION"]
  ];
  return {
    $schema: "ghostclaw.cloudflare.r4_prerequisites_packet.v1",
    taskId: TASK_ID,
    targetId: "hermes_orchestrator_preview",
    configPath: "services/orchestrator/wrangler.preview.jsonc",
    steps: definitions.map(([id, gate]) => ({
      id,
      status: "exact-gate-required",
      requiredGatePattern: `APPROVE_CLOUDFLARE_R4_${gate}_PACKET_<packet_id>`,
      expectedGateId: `APPROVE_CLOUDFLARE_R4_${gate}_PACKET_${TASK_ID}`,
      exactGateId: null,
      execute: false
    })),
    execute: false,
    deploy: false
  };
}

function run(args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: { PATH: process.env.PATH || "" }
  });
}

function runSafeStoreHelper(repoRoot, relativeRoot, filename, contents, extraEnv = {}) {
  return spawnSync(
    "/usr/bin/python3",
    [
      SAFE_STORE_HELPER,
      "--repo-root",
      repoRoot,
      "--relative-root",
      relativeRoot,
      "--filename",
      filename
    ],
    {
      encoding: "utf8",
      env: { PATH: "/usr/bin:/bin", ...extraEnv },
      input: contents
    }
  );
}

async function waitForPath(filePath, child, timeoutMs = 3_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await access(filePath);
      return;
    } catch {
      if (child.exitCode !== null) {
        throw new Error(`safe-store helper exited before ready: ${child.exitCode}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
  throw new Error("safe-store helper did not reach the race checkpoint");
}

test("approval-grant CLI defaults to dry-run and stores only with an exact gate", async () => {
  const grantId = `grant-cli-${process.pid}`;
  const grantPath = `.ghostclaw_runtime/a2a2a/approvals/cloudflare-r4-prerequisites/pending/${grantId}.json`;
  try {
    await mkdir(path.join(REPO_ROOT, TEST_ROOT), { recursive: true });
    await writeFile(path.join(REPO_ROOT, PACKET_PATH), `${JSON.stringify(packet(), null, 2)}\n`);
    await rm(path.join(REPO_ROOT, grantPath), { force: true });

    const dryRun = run([
      "--packet", PACKET_PATH,
      "--step", "oauth_login",
      "--exact-gate", GATE,
      "--grant-id", grantId
    ]);
    assert.equal(dryRun.status, 0, dryRun.stderr);
    assert.deepEqual(JSON.parse(dryRun.stdout), {
      status: "dry-run-valid",
      taskId: TASK_ID,
      stepId: "oauth_login",
      grantId,
      grantDigestSha256: JSON.parse(dryRun.stdout).grantDigestSha256,
      expiresAt: JSON.parse(dryRun.stdout).expiresAt,
      stored: false,
      grantPath: null,
      execute: false,
      deploy: false
    });

    const stored = run([
      "--packet", PACKET_PATH,
      "--step", "oauth_login",
      "--exact-gate", GATE,
      "--grant-id", grantId,
      "--store"
    ]);
    assert.equal(stored.status, 0, stored.stderr);
    const storedSummary = JSON.parse(stored.stdout);
    assert.equal(storedSummary.status, "stored-local-approval-grant");
    assert.equal(storedSummary.stored, true);
    assert.equal(storedSummary.grantPath, grantPath);
    const grant = JSON.parse(await readFile(path.join(REPO_ROOT, grantPath), "utf8"));
    assert.equal(grant.exactGateId, GATE);
    assert.equal(grant.stepId, "oauth_login");
    assert.equal(grant.singleUse, true);
    assert.equal(grant.consumed, false);

    const replay = run([
      "--packet", PACKET_PATH,
      "--step", "oauth_login",
      "--exact-gate", GATE,
      "--grant-id", grantId,
      "--store"
    ]);
    assert.notEqual(replay.status, 0);
    assert.match(replay.stderr, /already exists/i);
  } finally {
    await rm(path.join(REPO_ROOT, TEST_ROOT), { recursive: true, force: true });
    await rm(path.join(REPO_ROOT, `.ghostclaw_runtime/a2a2a/approvals/cloudflare-r4-prerequisites/pending/grant-cli-${process.pid}.json`), { force: true });
  }
});

test("approval-grant CLI rejects a gate that does not match the packet step", async () => {
  try {
    await mkdir(path.join(REPO_ROOT, TEST_ROOT), { recursive: true });
    await writeFile(path.join(REPO_ROOT, PACKET_PATH), `${JSON.stringify(packet(), null, 2)}\n`);
    const result = run([
      "--packet", PACKET_PATH,
      "--step", "oauth_login",
      "--exact-gate", "APPROVE_ALL",
      "--grant-id", `grant-cli-invalid-${process.pid}`,
      "--store"
    ]);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /exact gate mismatch/i);
  } finally {
    await rm(path.join(REPO_ROOT, TEST_ROOT), { recursive: true, force: true });
  }
});

test("approval-grant CLI never echoes malformed packet contents", async () => {
  const malformedPath = `${TEST_ROOT}/malformed.json`;
  const syntheticSecret = "SYNTHETIC_SECRET_MUST_NOT_LEAK_47721";
  try {
    await mkdir(path.join(REPO_ROOT, TEST_ROOT), { recursive: true });
    await writeFile(
      path.join(REPO_ROOT, malformedPath),
      `{\"token\":\"${syntheticSecret}\",`
    );
    const result = run([
      "--packet", malformedPath,
      "--step", "oauth_login",
      "--exact-gate", GATE,
      "--grant-id", `grant-cli-malformed-${process.pid}`
    ]);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /approval packet is invalid json/i);
    assert.doesNotMatch(result.stderr, new RegExp(syntheticSecret));
    assert.doesNotMatch(result.stderr, /\"token\"/i);
  } finally {
    await rm(path.join(REPO_ROOT, TEST_ROOT), { recursive: true, force: true });
  }
});

test("grant-root validation rejects a symlinked storage component", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "ghostclaw-grant-repo-"));
  const outsideRoot = await mkdtemp(path.join(tmpdir(), "ghostclaw-grant-outside-"));
  try {
    await symlink(outsideRoot, path.join(repoRoot, "runtime"), "dir");
    const result = runSafeStoreHelper(
      repoRoot,
      "runtime/pending",
      "grant-symlink.json",
      '{"grant":"blocked"}\n'
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /SAFE_STORE_FAILED/);
    await assert.rejects(
      readFile(path.join(outsideRoot, "pending", "grant-symlink.json"), "utf8"),
      /ENOENT/
    );
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
    await rm(outsideRoot, { recursive: true, force: true });
  }
});

test("safe store removes the final file after an injected post-create failure", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "ghostclaw-grant-fault-repo-"));
  const filename = "grant-fault.json";
  try {
    const result = runSafeStoreHelper(
      repoRoot,
      "runtime/pending",
      filename,
      '{"grant":"fault"}\n',
      {
        GHOSTCLAW_SAFE_STORE_TEST_MODE: "1",
        GHOSTCLAW_SAFE_STORE_TEST_FAIL_AT: "after_create"
      }
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /SAFE_STORE_FAILED/);
    await assert.rejects(
      readFile(path.join(repoRoot, "runtime", "pending", filename), "utf8"),
      /ENOENT/
    );
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("safe grant storage pins checked parent directories across a symlink race", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "ghostclaw-grant-race-repo-"));
  const outsideRoot = await mkdtemp(path.join(tmpdir(), "ghostclaw-grant-race-outside-"));
  const readyPath = path.join(repoRoot, "safe-store-ready");
  const continuePath = path.join(repoRoot, "safe-store-continue");
  const grantContents = '{"grant":"race-safe"}\n';
  let child;
  try {
    await mkdir(path.join(repoRoot, "runtime", "pending"), { recursive: true });
    child = spawn(
      "/usr/bin/python3",
      [
        SAFE_STORE_HELPER,
        "--repo-root",
        repoRoot,
        "--relative-root",
        "runtime/pending",
        "--filename",
        "grant-race.json"
      ],
      {
        env: {
          PATH: "/usr/bin:/bin",
          GHOSTCLAW_SAFE_STORE_TEST_MODE: "1",
          GHOSTCLAW_SAFE_STORE_TEST_PAUSE_AFTER_COMPONENT: "runtime",
          GHOSTCLAW_SAFE_STORE_TEST_READY_PATH: readyPath,
          GHOSTCLAW_SAFE_STORE_TEST_CONTINUE_PATH: continuePath
        },
        stdio: ["pipe", "pipe", "pipe"]
      }
    );
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.stdin.end(grantContents);

    await waitForPath(readyPath, child);
    await rename(path.join(repoRoot, "runtime"), path.join(repoRoot, "runtime-pinned"));
    await symlink(outsideRoot, path.join(repoRoot, "runtime"), "dir");
    await writeFile(continuePath, "continue\n");

    const [exitCode] = await once(child, "exit");
    assert.equal(exitCode, 0, stderr);
    assert.equal(
      await readFile(path.join(repoRoot, "runtime-pinned", "pending", "grant-race.json"), "utf8"),
      grantContents
    );
    await assert.rejects(
      readFile(path.join(outsideRoot, "pending", "grant-race.json"), "utf8"),
      /ENOENT/
    );
  } finally {
    child?.kill();
    await rm(repoRoot, { recursive: true, force: true });
    await rm(outsideRoot, { recursive: true, force: true });
  }
});
