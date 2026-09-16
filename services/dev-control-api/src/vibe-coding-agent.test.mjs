import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  codingEngineSecurityRules,
  evaluateCodingEngineSecurityAction,
  getVibeCodingAgentStatus
} from "./vibe-coding-agent.mjs";

let tempRoot;

afterEach(async () => {
  if (tempRoot) {
    await rm(tempRoot, { recursive: true, force: true });
    tempRoot = undefined;
  }
});

async function makeEvidenceRoot() {
  tempRoot = await mkdtemp(path.join(tmpdir(), "sirinx-vibe-agent-"));
  return tempRoot;
}

describe("Vibe Coding Agent contract", () => {
  it("recommends local safe actions without enabling external execution", async () => {
    const evidenceRoot = await makeEvidenceRoot();
    const status = await getVibeCodingAgentStatus({
      evidenceRoot,
      now: () => new Date("2026-05-26T02:00:00.000Z")
    });

    expect(status.status).toBe("local-agent-ready");
    expect(status.mode).toBe("local-only-execution-agent");
    expect(status.externalWrites).toBe(false);
    expect(status.canExecuteExternally).toBe(false);
    expect(status.canRunMcp).toBe(false);
    expect(status.canDeploy).toBe(false);
    expect(status.summary.blockedExternalGates).toBe(5);
    expect(status.summary.readyForHumanReview).toBe(0);
    expect(status.summary.codingEngineSecurityRules).toBe(6);
    expect(status.uatCrudMongoSecurityProfile).toMatchObject({
      mode: "dry-run-discovery-only",
      defaultWriteDecision: "approval_required",
      syntheticDataOnly: true,
      canReadRealEnv: false,
      canUseCustomerData: false,
      canInstallPackages: false,
      canOpenPublicTunnel: false
    });
    expect(status.safeActions.map((action) => action.command)).toEqual([
      "pnpm verify:workspace",
      "pnpm soc:check",
      "pnpm dashboard:e2e"
    ]);
    expect(status.blockedActions).toEqual(
      expect.arrayContaining(["deploy", "push", "publish", "external_connector_activation", "real_mcp_execution"])
    );
    expect(status.approvalPacket.status).toBe("blocked-evidence-incomplete");
  });

  it("routes complete evidence to human review only, never auto-executes it", async () => {
    const evidenceRoot = await makeEvidenceRoot();
    await writeFile(
      path.join(evidenceRoot, "codex-mobile-qr-mfa.md"),
      [
        "- [x] same ChatGPT account/workspace confirmed",
        "- [x] Mac host appears online in ChatGPT mobile Codex",
        "- [x] MFA/SSO/passkey completed",
        "- [x] Mac keep-awake confirmed",
        "- [x] wrong-account rollback understood"
      ].join("\n"),
      "utf8"
    );

    const status = await getVibeCodingAgentStatus({
      evidenceRoot,
      now: () => new Date("2026-05-26T02:05:00.000Z")
    });

    expect(status.summary.readyForHumanReview).toBe(1);
    expect(status.summary.executableExternalActions).toBe(0);
    expect(status.canExecuteExternally).toBe(false);
    expect(status.reviewQueue.some((item) => item.id === "codex-mobile-qr-mfa" && item.status === "ready-for-human-review")).toBe(true);
    expect(status.approvalPacket.nextRequiredApproval).toContain("human review");
  });

  it("exposes coding engine security rules for CRUD MongoDB UAT", () => {
    expect(codingEngineSecurityRules.map((rule) => rule.id)).toEqual([
      "no-secret-env-read",
      "mongodb-crud-write-gate",
      "no-production-customer-data",
      "no-implicit-runtime-start",
      "no-implicit-install-or-tunnel",
      "mcp-filesystem-local-only"
    ]);
  });

  it("blocks real MCP filesystem execution while allowing local directory handling", () => {
    const mcpDecision = evaluateCodingEngineSecurityAction({
      id: "mcp-create-directory",
      type: "mcp_sirinx_files_create_directory",
      target: { path: "/Users/sirinx/sirinx-os/skills/uat-crud-mongodb" },
      realMcpExecution: true
    });
    const localDecision = evaluateCodingEngineSecurityAction({
      id: "local-create-directory",
      type: "local-filesystem-write",
      target: "/Users/sirinx/sirinx-os/skills/uat-crud-mongodb",
      description: "mcp_sirinx_files_create_directory mapped to local work"
    });

    expect(mcpDecision.decision).toBe("blocked");
    expect(mcpDecision.hardBlocks).toContain("real-mcp-execution-blocked");
    expect(localDecision.decision).toBe("allowed");
    expect(localDecision.matchedRules).toContain("mcp-filesystem-local-only");
  });

  it("blocks real env reads, customer data, and provider calls in the coding engine", () => {
    const decision = evaluateCodingEngineSecurityAction({
      id: "unsafe-uat",
      type: "mongodb-crud-uat",
      target: ".env",
      paths: [".env.local"],
      readsSecretValues: true,
      customerData: true,
      providerCall: true
    });

    expect(decision.decision).toBe("blocked");
    expect(decision.allowed).toBe(false);
    expect(decision.hardBlocks).toEqual(
      expect.arrayContaining([
        "secret-env-file-read-blocked",
        "production-or-customer-data-blocked",
        "provider-call-blocked-in-local-coding-engine"
      ])
    );
  });

  it("blocks object-shaped real env targets even when the action is read-only", () => {
    const decision = evaluateCodingEngineSecurityAction({
      id: "inspect-target-object",
      type: "local-review",
      target: { path: ".env.production" },
      readOnly: true
    });

    expect(decision.decision).toBe("blocked");
    expect(decision.allowed).toBe(false);
    expect(decision.hardBlocks).toContain("secret-env-file-read-blocked");
    expect(decision.matchedRules).toContain("no-secret-env-read");
  });

  it("requires approval for MongoDB CRUD writes, installs, and tunnels", () => {
    const writeDecision = evaluateCodingEngineSecurityAction({
      id: "uat-write",
      type: "mongodb-crud-uat",
      target: "mongodb:local-synthetic-uat",
      databaseWrite: true
    });
    const installDecision = evaluateCodingEngineSecurityAction({
      id: "install-playwright",
      type: "dependency-install",
      target: "workspace:dev-dependencies",
      dependencyInstall: true
    });
    const tunnelDecision = evaluateCodingEngineSecurityAction({
      id: "open-tunnel",
      type: "public-tunnel",
      target: "tunnel:localhost-uat",
      publicTunnel: true
    });

    expect(writeDecision.decision).toBe("approval_required");
    expect(writeDecision.approvalReasons).toContain("database-write-action");
    expect(installDecision.decision).toBe("approval_required");
    expect(installDecision.approvalReasons).toContain("dependency-install-action");
    expect(tunnelDecision.decision).toBe("approval_required");
    expect(tunnelDecision.approvalReasons).toContain("public-tunnel-action");
  });
});
