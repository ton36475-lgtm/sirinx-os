import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  createCloudflarePreviewPacket,
  createCloudflareR4PrerequisitesPacket,
  getCloudflareDeploymentReadiness,
  inspectArtifactEvidence,
  inspectPreviewConfiguration,
  inspectR3ReadinessReceipt,
  inspectRemoteReadinessEvidence,
  readCloudflareDeploymentTargets,
  R3_REQUIRED_OFFLINE_CHECK_IDS,
  R3_REQUIRED_SOURCE_HASH_PATHS,
  validateCloudflareDeploymentTargets
} from "./cloudflare-deployment-readiness.mjs";

const fixedNow = () => new Date("2026-07-14T15:00:00.000Z");
const EXTRA_R3_PROVENANCE_PATHS = [
  "services/dev-control-api/src/cloudflare-deployment-readiness.test.mjs",
  "services/dev-control-api/src/cloudflare-r4-prerequisites-runner.mjs",
  "services/dev-control-api/src/cloudflare-r4-prerequisites-runner.test.mjs",
  "scripts/ghostclaw-cloudflare-r4-prerequisites-runner.mjs"
];
const EXPECTED_R3_SOURCE_PATHS = [
  ...new Set([...R3_REQUIRED_SOURCE_HASH_PATHS, ...EXTRA_R3_PROVENANCE_PATHS])
];
const EXPECTED_R3_CHECK_COMMANDS = {
  deploy_contract_tests: {
    executable: "node-runtime",
    command: `${process.execPath} --test tests/deploy-contract.test.mjs`,
    args: ["--test", "tests/deploy-contract.test.mjs"]
  },
  cargo_fmt: {
    executable: "cargo",
    command: "cargo fmt --all -- --check",
    args: ["fmt", "--all", "--", "--check"]
  },
  cargo_check_native: {
    executable: "cargo",
    command: "cargo check --workspace --all-targets --offline",
    args: ["check", "--workspace", "--all-targets", "--offline"]
  },
  cargo_test_native: {
    executable: "cargo",
    command: "cargo test --workspace --all-targets --offline",
    args: ["test", "--workspace", "--all-targets", "--offline"]
  },
  cargo_clippy_native: {
    executable: "cargo",
    command: "cargo clippy --workspace --all-targets --offline -- -D warnings",
    args: ["clippy", "--workspace", "--all-targets", "--offline", "--", "-D", "warnings"]
  },
  cargo_check_wasm: {
    executable: "cargo",
    command: "cargo check --workspace --target wasm32-unknown-unknown --offline",
    args: ["check", "--workspace", "--target", "wasm32-unknown-unknown", "--offline"]
  }
};

describe("Cloudflare deployment readiness", () => {
  it("inventories all targets without network or deployment", async () => {
    const result = await getCloudflareDeploymentReadiness({ repoRoot: process.cwd(), now: fixedNow });

    expect(result.status).toBe("cloudflare-r3-inventory-ready");
    expect(result.validation).toMatchObject({ ok: true, targetCount: 5 });
    expect(result.externalRequests).toBe(false);
    expect(result.deploy).toBe(false);
    expect(result.targets.map((target) => target.id)).toContain("sirinx_pages_frontend");
    expect(result.targets.map((target) => target.id)).toContain("cloudflare_agent_control_plane");
  });

  it("keeps the recommended preview packet blocked while placeholders remain", async () => {
    const packet = await createCloudflarePreviewPacket({ repoRoot: process.cwd(), now: fixedNow });

    expect(packet.status).toBe("blocked-preview-packet");
    expect(packet.targetId).toBe("hermes_orchestrator_preview");
    expect(packet.fromAgent).toBe("hermes_commander");
    expect(packet.toAgent).toBe("codex_build_captain");
    expect(packet.approvalGateId).toBeNull();
    expect(packet.blockers.length).toBeGreaterThan(0);
    expect(packet.environmentManifest.secretsRequiredNamesOnly).toContain("CLOUDFLARE_API_TOKEN");
    expect(packet.environmentManifest.secretsRequiredNamesOnly).toContain("HERMES_API_TOKEN");
    expect(packet.readinessReceipt.ok).toBe(true);
    expect(packet.readinessReceipt.receiptDigestSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(packet.remoteReadinessEvidence.ok).toBe(false);
    expect(packet.blockers).toContain("Cloudflare CLI authentication is not verified");
    expect(packet.execute).toBe(false);
    expect(packet.deploy).toBe(false);
  });

  it("creates a non-executing prerequisite packet with separate exact gates", async () => {
    const packet = await createCloudflareR4PrerequisitesPacket({
      repoRoot: process.cwd(),
      now: fixedNow,
      taskId: "CF-R4-PREREQUISITES-TEST"
    });

    expect(packet.status).toBe("blocked-prerequisites-packet");
    expect(packet.steps.map((step) => step.id)).toEqual([
      "oauth_login",
      "resource_discovery",
      "resource_creation",
      "secret_provision"
    ]);
    expect(packet.steps.every((step) => step.execute === false)).toBe(true);
    expect(packet.steps[0].requiredGatePattern).toContain("OAUTH_LOGIN_PACKET");
    expect(packet.steps[1].requiredGatePattern).toContain("RESOURCE_DISCOVERY_PACKET");
    expect(packet.steps[2].requiredGatePattern).toContain("RESOURCE_CREATE_PACKET");
    expect(packet.steps[3].requiredGatePattern).toContain("SECRET_PROVISION_PACKET");
    expect(packet.steps.map((step) => step.expectedGateId)).toEqual([
      "APPROVE_CLOUDFLARE_R4_OAUTH_LOGIN_PACKET_CF-R4-PREREQUISITES-TEST",
      "APPROVE_CLOUDFLARE_R4_RESOURCE_DISCOVERY_PACKET_CF-R4-PREREQUISITES-TEST",
      "APPROVE_CLOUDFLARE_R4_RESOURCE_CREATE_PACKET_CF-R4-PREREQUISITES-TEST",
      "APPROVE_CLOUDFLARE_R4_SECRET_PROVISION_PACKET_CF-R4-PREREQUISITES-TEST"
    ]);
    expect(packet.steps.every((step) => step.exactGateId === null)).toBe(true);
    expect(packet.steps.every((step) => step.approvalGrantRequired === true)).toBe(true);
    expect(packet.runnerScript).toBe(
      "scripts/ghostclaw-cloudflare-r4-prerequisites-runner.mjs"
    );
    expect(packet.steps[0].commandPreview).toContain(
      "node_modules/wrangler/bin/wrangler.js"
    );
    expect(packet.steps[1].commandPreview).toHaveLength(2);
    expect(packet.steps[2].commandPreview).toEqual([
      "node node_modules/wrangler/bin/wrangler.js kv namespace create hermes-v5-preview-ledger --preview --binding HERMES_LEDGER --update-config=false --config wrangler.preview.jsonc",
      "node node_modules/wrangler/bin/wrangler.js kv namespace create hermes-v5-preview-idempotency --preview --binding IDEMPOTENCY_CACHE --update-config=false --config wrangler.preview.jsonc"
    ]);
    expect(packet.approvalGrant).toMatchObject({
      required: true,
      singleUse: true,
      maximumLifetimeSeconds: 900,
      packetDigestBound: true,
      issuerScript: "scripts/ghostclaw-cloudflare-r4-approval-grant.mjs",
      pendingRoot:
        ".ghostclaw_runtime/a2a2a/approvals/cloudflare-r4-prerequisites/pending"
    });
    expect(packet.steps[3].commandPreview).toContain("HERMES_API_TOKEN");
    expect(packet.steps[3].secretValueInCommand).toBe(false);
    expect(packet.deploy).toBe(false);
    expect(packet.externalRequests).toBe(false);
    expect(packet.keyValuePrinted).toBe(false);
  });

  it("accepts artifact evidence only while manifest hashes match the files", async () => {
    const repoRoot = await mkdtemp(path.join(tmpdir(), "ghostclaw-artifact-"));
    const buildRoot = path.join(repoRoot, "services/orchestrator/build");
    const files = new Map([
      ["index.js", "export default { fetch() {} };\n"],
      ["index_bg.wasm", Buffer.from([0x00, 0x61, 0x73, 0x6d, 1, 0, 0, 0, 1])],
      ["worker/shim.mjs", 'export { default } from "../index.js";\n']
    ]);

    try {
      for (const [relativePath, contents] of files) {
        const filePath = path.join(buildRoot, relativePath);
        await mkdir(path.dirname(filePath), { recursive: true });
        await writeFile(filePath, contents);
      }
      const manifest = {
        schema: "sirinx.hermes-worker-artifact.v1",
        generated_at: "2026-07-15T12:00:00.000Z",
        files: [...files].map(([relativePath, contents]) => ({
          path: relativePath,
          bytes: Buffer.byteLength(contents),
          sha256: createHash("sha256").update(contents).digest("hex")
        }))
      };
      await writeFile(
        path.join(buildRoot, "artifact-manifest.json"),
        `${JSON.stringify(manifest)}\n`
      );

      const target = {
        id: "hermes_orchestrator_preview",
        artifactEvidence: {
          manifestPath: "services/orchestrator/build/artifact-manifest.json",
          schema: "sirinx.hermes-worker-artifact.v1",
          requiredFiles: [...files.keys()]
        }
      };
      const valid = await inspectArtifactEvidence(repoRoot, target);
      expect(valid).toMatchObject({ required: true, ok: true, blockers: [] });
      expect(valid.manifestDigestSha256).toMatch(/^[0-9a-f]{64}$/);

      await writeFile(path.join(buildRoot, "index.js"), "tampered\n");
      const invalid = await inspectArtifactEvidence(repoRoot, target);
      expect(invalid.ok).toBe(false);
      expect(invalid.blockers).toContain("Artifact checksum mismatch: index.js");
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it("reports preview resource placeholders without exposing their values", async () => {
    const repoRoot = await mkdtemp(path.join(tmpdir(), "ghostclaw-preview-config-"));
    const configPath = path.join(repoRoot, "services/orchestrator/wrangler.preview.jsonc");
    const coordinationPath = path.join(repoRoot, "configs/ghostclaw_agent_coordination.config.json");
    const target = {
      id: "hermes_orchestrator_preview",
      configPath: "services/orchestrator/wrangler.preview.jsonc",
      previewConfigurationEvidence: {
        ownerAllowlistVar: "HERMES_OWNER_ALLOWLIST",
        ownerPrincipalRegistry: {
          path: "configs/ghostclaw_agent_coordination.config.json",
          schema: "ghostclaw.agent_coordination.v1",
          allowedRoleIds: ["hermes_commander"]
        },
        kvBindings: ["HERMES_LEDGER", "IDEMPOTENCY_CACHE"]
      }
    };

    try {
      await mkdir(path.dirname(configPath), { recursive: true });
      await mkdir(path.dirname(coordinationPath), { recursive: true });
      await writeFile(coordinationPath, JSON.stringify({
        $schema: "ghostclaw.agent_coordination.v1",
        roles: [{ id: "hermes_commander" }, { id: "codex_build_captain" }]
      }));
      await writeFile(configPath, JSON.stringify({
        vars: { HERMES_OWNER_ALLOWLIST: "REPLACE_WITH_OWNER" },
        kv_namespaces: [
          { binding: "HERMES_LEDGER", id: "REPLACE_WITH_LEDGER" },
          { binding: "IDEMPOTENCY_CACHE", id: "REPLACE_WITH_CACHE" }
        ]
      }));

      const blocked = await inspectPreviewConfiguration(repoRoot, target);
      expect(blocked.ok).toBe(false);
      expect(blocked.blockers).toEqual([
        "HERMES_OWNER_ALLOWLIST requires exact preview owner principals",
        "HERMES_LEDGER requires an exact preview namespace id",
        "IDEMPOTENCY_CACHE requires an exact preview namespace id"
      ]);
      expect(JSON.stringify(blocked)).not.toContain("REPLACE_WITH_OWNER");

      await writeFile(configPath, JSON.stringify({
        vars: { HERMES_OWNER_ALLOWLIST: "hermes_commander" },
        kv_namespaces: [
          { binding: "HERMES_LEDGER", id: "0123456789abcdef0123456789abcdef" },
          { binding: "IDEMPOTENCY_CACHE", id: "fedcba9876543210fedcba9876543210" }
        ]
      }));
      const ready = await inspectPreviewConfiguration(repoRoot, target);
      expect(ready).toMatchObject({ required: true, ok: true, blockers: [] });

      await writeFile(configPath, JSON.stringify({
        vars: { HERMES_OWNER_ALLOWLIST: "unregistered_owner" },
        kv_namespaces: [
          { binding: "HERMES_LEDGER", id: "0123456789abcdef0123456789abcdef" },
          { binding: "IDEMPOTENCY_CACHE", id: "fedcba9876543210fedcba9876543210" }
        ]
      }));
      const unknownOwner = await inspectPreviewConfiguration(repoRoot, target);
      expect(unknownOwner.blockers).toContain(
        "HERMES_OWNER_ALLOWLIST contains a principal outside the approved role registry"
      );
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it("keeps remote Cloudflare readiness names-only and fail-closed", async () => {
    const repoRoot = await mkdtemp(path.join(tmpdir(), "ghostclaw-remote-readiness-"));
    const evidencePath = path.join(
      repoRoot,
      ".ghostclaw_runtime/a2a2a/evidence/cloudflare-r4-remote-readiness.json"
    );
    const target = {
      id: "hermes_orchestrator_preview",
      remoteReadinessEvidence: {
        path: ".ghostclaw_runtime/a2a2a/evidence/cloudflare-r4-remote-readiness.json",
        schema: "ghostclaw.cloudflare.remote_readiness_evidence.v1",
        requiredKvBindings: ["HERMES_LEDGER", "IDEMPOTENCY_CACHE"],
        requiredSecretBindings: ["HERMES_API_TOKEN"]
      }
    };

    try {
      await mkdir(path.dirname(evidencePath), { recursive: true });
      await writeFile(evidencePath, JSON.stringify({
        $schema: "ghostclaw.cloudflare.remote_readiness_evidence.v1",
        targetId: "hermes_orchestrator_preview",
        observedAt: "2026-07-15T12:00:00.000Z",
        authenticationVerified: false,
        accountIdMatched: false,
        verifiedKvBindings: [],
        verifiedSecretBindings: [],
        credentialValueRead: false,
        externalMutation: false,
        outputDigestSha256: "a".repeat(64)
      }));

      const blocked = await inspectRemoteReadinessEvidence(repoRoot, target);
      expect(blocked.ok).toBe(false);
      expect(blocked.blockers).toEqual([
        "Cloudflare CLI authentication is not verified",
        "Cloudflare account id match is not verified",
        "Remote KV namespace binding is not verified: HERMES_LEDGER",
        "Remote KV namespace binding is not verified: IDEMPOTENCY_CACHE",
        "Remote secret binding is not verified: HERMES_API_TOKEN"
      ]);
      expect(blocked.checkedSecretBindings).toEqual(["HERMES_API_TOKEN"]);
      expect(blocked.evidenceDigestSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(JSON.stringify(blocked)).not.toContain("outputDigestSha256");

      await writeFile(evidencePath, JSON.stringify({
        $schema: "ghostclaw.cloudflare.remote_readiness_evidence.v1",
        targetId: "hermes_orchestrator_preview",
        observedAt: "2026-07-15T12:00:00.000Z",
        authenticationVerified: true,
        accountIdMatched: true,
        verifiedKvBindings: ["HERMES_LEDGER", "IDEMPOTENCY_CACHE"],
        verifiedSecretBindings: ["HERMES_API_TOKEN"],
        credentialValueRead: false,
        externalMutation: false,
        outputDigestSha256: "b".repeat(64)
      }));

      const ready = await inspectRemoteReadinessEvidence(repoRoot, target);
      expect(ready).toMatchObject({ required: true, ok: true, status: "verified", blockers: [] });
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it("rejects stale source hashes and forged check results in an R3 readiness receipt", async () => {
    const repoRoot = await mkdtemp(path.join(tmpdir(), "ghostclaw-r3-receipt-"));
    const receiptPath = path.join(repoRoot, ".ghostclaw_runtime/a2a2a/evidence/r3.json");
    const config = {
      gates: {
        R4: {
          readinessReceiptPath: ".ghostclaw_runtime/a2a2a/evidence/r3.json"
        }
      }
    };
    const sourceHashes = [];
    expect(EXPECTED_R3_SOURCE_PATHS).toHaveLength(22);
    for (const sourcePath of EXPECTED_R3_SOURCE_PATHS) {
      const sourceContents = `source:${sourcePath}\n`;
      await mkdir(path.dirname(path.join(repoRoot, sourcePath)), { recursive: true });
      await writeFile(path.join(repoRoot, sourcePath), sourceContents);
      sourceHashes.push({
        path: sourcePath,
        sha256: createHash("sha256").update(sourceContents).digest("hex")
      });
    }

    const receipt = {
      schema: "ghostclaw.cloudflare.r3_readiness_receipt.v1",
      receiptId: "cloudflare-r3-test",
      generatedAt: "2026-07-15T12:00:00.000Z",
      targetId: "hermes_orchestrator_preview",
      status: "R3_VERIFIED_R4_BLOCKED",
      r3Verified: true,
      r4PreviewReady: false,
      inventory: { inventoryValidation: { ok: true } },
      offlineChecks: R3_REQUIRED_OFFLINE_CHECK_IDS.map((id) => ({
        id,
        ...EXPECTED_R3_CHECK_COMMANDS[id],
        cwd: "services/orchestrator",
        exitCode: 0,
        passed: true,
        outputDigestSha256: "a".repeat(64),
        spawnError: null
      })),
      sourceHashes,
      networkIsolationEnforced: false,
      evidenceScope: "Selected local commands ran with offline flags; no OS-level network sandbox was enforced.",
      externalActions: {
        network: false,
        cloudflareApiCalled: false,
        wranglerInvoked: false,
        credentialRead: false,
        install: false,
        deploy: false,
        push: false
      },
      noExternalSideEffects: true
    };
    const updateReceiptDigest = () => {
      delete receipt.receiptDigestSha256;
      receipt.receiptDigestSha256 = createHash("sha256")
        .update(JSON.stringify(receipt))
        .digest("hex");
    };
    updateReceiptDigest();

    try {
      await mkdir(path.dirname(receiptPath), { recursive: true });
      await writeFile(receiptPath, `${JSON.stringify(receipt)}\n`);
      const valid = await inspectR3ReadinessReceipt(
        repoRoot,
        config,
        "hermes_orchestrator_preview"
      );
      expect(valid).toMatchObject({ required: true, ok: true, blockers: [] });

      const changedSourcePath = R3_REQUIRED_SOURCE_HASH_PATHS[0];
      await writeFile(path.join(repoRoot, changedSourcePath), "changed-after-receipt\n");
      await writeFile(receiptPath, `${JSON.stringify(receipt)}\n`);
      const staleSource = await inspectR3ReadinessReceipt(
        repoRoot,
        config,
        "hermes_orchestrator_preview"
      );
      expect(staleSource.ok).toBe(false);
      expect(staleSource.blockers).toContain(
        `R3 readiness source hash does not match current file: ${changedSourcePath}`
      );

      await writeFile(path.join(repoRoot, changedSourcePath), `source:${changedSourcePath}\n`);
      receipt.offlineChecks[0].passed = false;
      updateReceiptDigest();
      await writeFile(receiptPath, `${JSON.stringify(receipt)}\n`);
      const forgedCheck = await inspectR3ReadinessReceipt(
        repoRoot,
        config,
        "hermes_orchestrator_preview"
      );
      expect(forgedCheck.ok).toBe(false);
      expect(forgedCheck.blockers).toContain(
        `R3 readiness offline check did not pass cleanly: ${R3_REQUIRED_OFFLINE_CHECK_IDS[0]}`
      );

      receipt.offlineChecks[0].passed = true;
      receipt.offlineChecks[0].command = "echo forged-success";
      updateReceiptDigest();
      await writeFile(receiptPath, `${JSON.stringify(receipt)}\n`);
      const substitutedCommand = await inspectR3ReadinessReceipt(
        repoRoot,
        config,
        "hermes_orchestrator_preview"
      );
      expect(substitutedCommand.ok).toBe(false);
      expect(substitutedCommand.blockers).toContain(
        `R3 readiness offline check command does not match: ${R3_REQUIRED_OFFLINE_CHECK_IDS[0]}`
      );

      receipt.offlineChecks[0].command = EXPECTED_R3_CHECK_COMMANDS.deploy_contract_tests.command;
      receipt.offlineChecks.push({
        id: "injected_unknown_check",
        executable: "node-runtime",
        command: `${process.execPath} --version`,
        args: ["--version"],
        cwd: "services/orchestrator",
        exitCode: 0,
        passed: true,
        outputDigestSha256: "c".repeat(64),
        spawnError: null
      });
      updateReceiptDigest();
      await writeFile(receiptPath, `${JSON.stringify(receipt)}\n`);
      const unexpectedCheck = await inspectR3ReadinessReceipt(
        repoRoot,
        config,
        "hermes_orchestrator_preview"
      );
      expect(unexpectedCheck.ok).toBe(false);
      expect(unexpectedCheck.blockers).toContain(
        "R3 readiness receipt contains unexpected offline check: injected_unknown_check"
      );

      receipt.offlineChecks.pop();
      const unexpectedSourcePath = "extra/unexpected-source.txt";
      const unexpectedSourceContents = "unexpected but readable source\n";
      await mkdir(path.dirname(path.join(repoRoot, unexpectedSourcePath)), { recursive: true });
      await writeFile(path.join(repoRoot, unexpectedSourcePath), unexpectedSourceContents);
      receipt.sourceHashes.push({
        path: unexpectedSourcePath,
        sha256: createHash("sha256").update(unexpectedSourceContents).digest("hex")
      });
      updateReceiptDigest();
      await writeFile(receiptPath, `${JSON.stringify(receipt)}\n`);
      const unexpectedSource = await inspectR3ReadinessReceipt(
        repoRoot,
        config,
        "hermes_orchestrator_preview"
      );
      expect(unexpectedSource.ok).toBe(false);
      expect(unexpectedSource.blockers).toContain(
        `R3 readiness receipt contains unexpected source hash: ${unexpectedSourcePath}`
      );

      receipt.sourceHashes.pop();
      const omittedPath = EXTRA_R3_PROVENANCE_PATHS.at(-1);
      receipt.sourceHashes = receipt.sourceHashes.filter((entry) => entry.path !== omittedPath);
      updateReceiptDigest();
      await writeFile(receiptPath, `${JSON.stringify(receipt)}\n`);
      const omittedSource = await inspectR3ReadinessReceipt(
        repoRoot,
        config,
        "hermes_orchestrator_preview"
      );
      expect(omittedSource.ok).toBe(false);
      expect(omittedSource.blockers).toContain(
        `R3 readiness receipt is missing source hash: ${omittedPath}`
      );
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it("fails closed if Telegram direct deploy or secret values are enabled", async () => {
    const config = structuredClone(await readCloudflareDeploymentTargets({ repoRoot: process.cwd() }));
    config.security.directDeployFromTelegram = true;
    config.security.secretValuesAllowed = true;

    const validation = validateCloudflareDeploymentTargets(config);

    expect(validation.ok).toBe(false);
    expect(validation.errors).toContain("secret_values_must_be_blocked");
    expect(validation.errors).toContain("telegram_direct_deploy_must_be_blocked");
  });
});
