import { describe, expect, it } from "vitest";
import { evaluatePolicy, normalizePolicyAction, summarizePolicyDecision } from "./index.mjs";

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
