import { describe, expect, it } from "vitest";
import {
  CODING_ENGINE_SECURITY_RULES,
  UAT_CRUD_MONGODB_SECURITY_RULE_IDS,
  evaluateCodingEngineSecurityAction,
  evaluatePolicy,
  normalizePolicyAction,
  summarizePolicyDecision
} from "./index.mjs";

describe("policy-core evaluator", () => {
  it("allows local documentation work without external writes", () => {
    const decision = evaluatePolicy({
      id: "docs-plan",
      type: "local-doc-write",
      target: "docs/knowledge/SIRINX_PLAN.md",
      paths: ["docs/knowledge/SIRINX_PLAN.md"]
    });

    expect(decision.decision).toBe("allowed");
    expect(decision.allowed).toBe(true);
    expect(decision.externalWrites).toBe(false);
  });

  it("blocks requests that read or print secret values", () => {
    const decision = evaluatePolicy({
      id: "read-env",
      type: "local-review",
      target: ".env",
      readsSecretValues: true,
      printsSecrets: true
    });

    expect(decision.decision).toBe("blocked");
    expect(decision.hardBlocks).toEqual(
      expect.arrayContaining(["secret-value-read-requested", "secret-print-requested"])
    );
  });

  it("requires exact approval for Cloudflare deployment targets", () => {
    const decision = evaluatePolicy({
      id: "deploy-main-router",
      type: "cloudflare-deploy",
      target: "cloudflare:main-router",
      externalWrite: true,
      productionWrite: true
    });

    expect(decision.decision).toBe("approval_required");
    expect(decision.allowed).toBe(false);
    expect(decision.externalWrites).toBe(false);
  });

  it("requires exact approval for MongoDB CRUD UAT writes", () => {
    const decision = evaluatePolicy({
      id: "uat-crud-mongodb-write",
      type: "mongodb-crud-uat",
      target: "mongodb:local-synthetic-uat",
      databaseWrite: true
    });

    expect(decision.decision).toBe("approval_required");
    expect(decision.allowed).toBe(false);
    expect(decision.approvalReasons).toEqual(
      expect.arrayContaining(["external-or-production-action", "database-write-action"])
    );
  });

  it("requires exact approval for dependency install and public tunnel actions", () => {
    const installDecision = evaluatePolicy({
      id: "install-playwright",
      type: "dependency-install",
      target: "workspace:dev-dependencies",
      dependencyInstall: true
    });

    const tunnelDecision = evaluatePolicy({
      id: "open-public-tunnel",
      type: "public-tunnel",
      target: "tunnel:localhost-uat",
      publicTunnel: true
    });

    expect(installDecision.decision).toBe("approval_required");
    expect(installDecision.approvalReasons).toContain("dependency-install-action");
    expect(tunnelDecision.decision).toBe("approval_required");
    expect(tunnelDecision.approvalReasons).toContain("public-tunnel-action");
  });

  it("rejects approval evidence for the wrong target", () => {
    const decision = evaluatePolicy(
      {
        id: "telegram-smoke",
        type: "telegram-send",
        target: "telegram:home-target",
        customerVisible: true
      },
      {
        approval: {
          approved: true,
          target: "telegram:wrong-target",
          scope: "telegram-smoke"
        }
      }
    );

    expect(decision.decision).toBe("approval_required");
    expect(decision.approved).toBe(false);
  });

  it("allows an external action only when exact approval matches the target", () => {
    const decision = evaluatePolicy(
      {
        id: "open-pr",
        type: "github-pr",
        target: "github:ton36475-lgtm/sirinx",
        externalWrite: true
      },
      {
        approval: {
          approved: true,
          target: "github:ton36475-lgtm/sirinx",
          scope: "open-pr"
        }
      }
    );

    expect(decision.decision).toBe("allowed");
    expect(decision.allowed).toBe(true);
    expect(decision.externalWrites).toBe(true);
    expect(decision.requiresApproval).toBe(true);
  });

  it("blocks Solis telemetry until consent, credential storage, and station mapping evidence exist", () => {
    const decision = evaluatePolicy({
      id: "solis-smoke",
      type: "solis-telemetry-read",
      target: "solis:customer-site-1",
      readOnly: true,
      evidence: {
        consent: true,
        credentialStorage: false,
        stationMapping: true
      }
    });

    expect(decision.decision).toBe("blocked");
    expect(decision.hardBlocks).toContain("solis-consent-credential-or-station-evidence-missing");
  });

  it("publishes centralized coding-engine rules for UAT and MCP filesystem lanes", () => {
    expect(CODING_ENGINE_SECURITY_RULES.map((rule) => rule.id)).toEqual([
      "no-secret-env-read",
      "mongodb-crud-write-gate",
      "no-production-customer-data",
      "no-implicit-runtime-start",
      "no-implicit-install-or-tunnel",
      "mcp-filesystem-local-only"
    ]);
    expect(UAT_CRUD_MONGODB_SECURITY_RULE_IDS).toEqual([
      "dry-run-discovery-only",
      "no-real-env-read",
      "no-mongodb-connect",
      "no-database-write",
      "synthetic-data-only",
      "no-package-install",
      "no-public-tunnel",
      "no-provider-call",
      "no-customer-data"
    ]);
  });

  it("blocks real MCP execution while permitting local filesystem planning", () => {
    const mcpDecision = evaluateCodingEngineSecurityAction({
      id: "mcp-create-directory",
      type: "mcp_sirinx_files_create_directory",
      target: { path: "/Users/sirinx/sirinx-os/skills/uat-crud-mongodb" },
      description: "requested MCP filesystem mutation",
      realMcpExecution: true
    });
    const localDecision = evaluateCodingEngineSecurityAction({
      id: "local-create-directory",
      type: "local-filesystem-write",
      target: "/Users/sirinx/sirinx-os/skills/uat-crud-mongodb",
      description: "mcp_sirinx_files_create_directory mapped to local filesystem work"
    });

    expect(mcpDecision.decision).toBe("blocked");
    expect(mcpDecision.allowed).toBe(false);
    expect(mcpDecision.hardBlocks).toContain("real-mcp-execution-blocked");
    expect(mcpDecision.matchedRules).toContain("mcp-filesystem-local-only");
    expect(localDecision.decision).toBe("allowed");
    expect(localDecision.allowed).toBe(true);
    expect(localDecision.matchedRules).toContain("mcp-filesystem-local-only");
  });

  it("returns compact summaries for API use", () => {
    const action = normalizePolicyAction({ type: "local-review", target: "PROJECT_STATE.md" });
    const summary = summarizePolicyDecision(evaluatePolicy(action));

    expect(summary).toMatchObject({
      decision: "allowed",
      externalWrites: false,
      target: "PROJECT_STATE.md"
    });
  });
});
