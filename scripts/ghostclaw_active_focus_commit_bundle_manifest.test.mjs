import { execFile as execFileCallback } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { createCommitBundleManifest } from "./ghostclaw_active_focus_commit_bundle_manifest.mjs";

const execFile = promisify(execFileCallback);
const tempRoots = [];

const guardrails = {
  live_send: false,
  provider_call: false,
  external_message_send: false,
  payload_executed: false,
  commit: false,
  push: false,
  deploy: false,
  cloudflare_r2_mutation: false,
  secret_read: false,
  install: false
};

async function writeJson(root, relativePath, payload) {
  const path = join(root, relativePath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function createGitFixture({ p075Status = "PASS_FINAL_LOCAL_REVIEW_READY", candidatePathspecs } = {}) {
  const root = await mkdtemp(join(tmpdir(), "active-focus-commit-bundle-"));
  tempRoots.push(root);
  await execFile("git", ["init"], { cwd: root });
  await mkdir(join(root, "scripts"), { recursive: true });
  await mkdir(join(root, "reports/mission"), { recursive: true });
  await writeFile(join(root, "scripts/tracked.mjs"), "initial\n", "utf8");
  await execFile("git", ["add", "--", "scripts/tracked.mjs"], { cwd: root });
  await writeFile(join(root, "scripts/tracked.mjs"), "changed\n", "utf8");
  await writeFile(join(root, "scripts/untracked.test.mjs"), "new\n", "utf8");
  await writeFile(join(root, "reports/mission/A2A2A_ACTIVE_FOCUS_COMMIT_BUNDLE_MANIFEST_20260703.md"), "# report\n", "utf8");

  const pathspecs =
    candidatePathspecs || [
      "scripts/tracked.mjs",
      "scripts/untracked.test.mjs",
      "scripts/ghostclaw_active_focus_commit_bundle_manifest.mjs",
      "scripts/ghostclaw_active_focus_commit_bundle_manifest.test.mjs"
    ];
  await writeJson(root, "reports/mission/A2A2A_LOCAL_COMMIT_GATE_20260703.json", {
    candidate_pathspecs: pathspecs,
    required_evidence: [
      ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P076-ACTIVE-FOCUS-COMMIT-BUNDLE-MANIFEST-20260703.json",
      ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P076-ACTIVE-FOCUS-COMMIT-BUNDLE-MANIFEST-20260703.json"
    ]
  });
  await writeJson(root, ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P075-ACTIVE-FOCUS-FINAL-LOCAL-REVIEW-20260703.json", {
    status: p075Status,
    checks: [{ name: "fixture", passed: true }],
    guardrails
  });
  return root;
}

afterEach(async () => {
  while (tempRoots.length > 0) {
    await rm(tempRoots.pop(), { recursive: true, force: true });
  }
});

describe("Active focus commit bundle manifest", () => {
  it("creates a path, byte, and hash inventory without staging or committing", async () => {
    const root = await createGitFixture();
    const packet = await createCommitBundleManifest({
      root,
      skipGitMeta: true,
      createdAt: "2026-07-03T02:00:00.000Z"
    });

    expect(packet.status).toBe("PASS_COMMIT_BUNDLE_MANIFEST_READY");
    expect(packet.final_status).toBe("P076A_COMMIT_BUNDLE_MANIFEST_READY_FOR_OPENCODE_REVIEW");
    expect(packet.guardrails.stage).toBe(false);
    expect(packet.guardrails.commit).toBe(false);
    expect(packet.changed_file_count).toBe(2);
    expect(packet.candidate_files.map((record) => record.path)).toEqual([
      "scripts/tracked.mjs",
      "scripts/untracked.test.mjs"
    ]);
    expect(packet.candidate_files.every((record) => record.deleted || /^[a-f0-9]{64}$/.test(record.sha256))).toBe(true);
    expect(packet.candidate_files.every((record) => record.review_required === true)).toBe(true);
    expect(packet.local_commit_gate.commit_allowed).toBe(false);

    const { stdout } = await execFile("git", ["status", "--short"], { cwd: root });
    expect(stdout).not.toContain("A  scripts/untracked.test.mjs");
  });

  it("fails closed when P075 is not ready", async () => {
    const root = await createGitFixture({ p075Status: "FAIL_FINAL_LOCAL_REVIEW_NOT_READY" });
    const packet = await createCommitBundleManifest({ root, skipGitMeta: true });

    expect(packet.status).toBe("FAIL_COMMIT_BUNDLE_MANIFEST_NOT_READY");
    expect(packet.failures).toContain("p075_not_pass_final_local_review_ready");
  });

  it("fails closed for forbidden candidate pathspecs", async () => {
    const root = await createGitFixture({
      candidatePathspecs: [
        ".env",
        "scripts/ghostclaw_active_focus_commit_bundle_manifest.mjs",
        "scripts/ghostclaw_active_focus_commit_bundle_manifest.test.mjs"
      ]
    });
    const packet = await createCommitBundleManifest({ root, changedFiles: ["scripts/tracked.mjs"], skipGitMeta: true });

    expect(packet.status).toBe("FAIL_COMMIT_BUNDLE_MANIFEST_NOT_READY");
    expect(packet.failures).toContain("forbidden_pathspec_.env");
  });

  it("fails closed if git discovers a forbidden changed file", async () => {
    const root = await createGitFixture();
    const packet = await createCommitBundleManifest({
      root,
      changedFiles: [".env.local"],
      skipGitMeta: true
    });

    expect(packet.status).toBe("FAIL_COMMIT_BUNDLE_MANIFEST_NOT_READY");
    expect(packet.failures).toContain("forbidden_changed_file_.env.local");
  });
});
