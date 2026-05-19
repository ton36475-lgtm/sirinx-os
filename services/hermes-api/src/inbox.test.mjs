import { describe, expect, it } from "vitest";
import { evaluateHermesInboxDryRun, normalizeHermesInboxRequest } from "./inbox.mjs";

describe("Hermes inbox dry-run normalizer", () => {
  it("allows local doc-write previews without external writes", () => {
    const result = evaluateHermesInboxDryRun({
      requestId: "req-local-doc",
      source: "codex-local",
      target: { id: "docs/knowledge/SIRINX_PLAN.md" },
      intent: { type: "local-doc-write", summary: "Update plan", rawTextIncluded: false },
      action: {
        id: "update-plan",
        type: "local-doc-write",
        externalWrite: false
      },
      dryRun: true
    });

    expect(result.status).toBe(200);
    expect(result.body.status).toBe("allowed");
    expect(result.body.externalWrites).toBe(false);
    expect(result.body.policy.externalWrites).toBe(false);
  });

  it("requires approval for Cloudflare deploy previews", () => {
    const result = evaluateHermesInboxDryRun({
      requestId: "req-cloudflare",
      source: "codex-local",
      target: { id: "cloudflare:main-router" },
      intent: { type: "cloudflare-deploy", summary: "Deploy main router" },
      action: {
        id: "deploy-main-router",
        type: "cloudflare-deploy",
        externalWrite: true,
        productionWrite: true
      },
      dryRun: true
    });

    expect(result.status).toBe(202);
    expect(result.body.status).toBe("approval_required");
    expect(result.body.externalWrites).toBe(false);
  });

  it("blocks secret reads", () => {
    const result = evaluateHermesInboxDryRun({
      requestId: "req-secret",
      source: "codex-local",
      target: { id: ".env" },
      action: {
        id: "read-env",
        type: "local-review",
        readsSecretValues: true
      },
      dryRun: true
    });

    expect(result.status).toBe(403);
    expect(result.body.policy.hardBlocks).toContain("secret-value-read-requested");
    expect(result.body.externalWrites).toBe(false);
  });

  it("rejects external sources without verified signature", () => {
    const result = evaluateHermesInboxDryRun({
      requestId: "req-telegram",
      source: "telegram",
      target: { id: "telegram:home-target" },
      action: {
        id: "telegram-smoke",
        type: "telegram-send",
        customerVisible: true
      },
      dryRun: true
    });

    expect(result.status).toBe(401);
    expect(result.body.status).toBe("auth_required");
    expect(result.body.externalWrites).toBe(false);
  });

  it("rejects phase 1 execution mode", () => {
    const result = evaluateHermesInboxDryRun({
      requestId: "req-execute",
      source: "codex-local",
      target: { id: "docs/knowledge/SIRINX_PLAN.md" },
      action: {
        id: "update-plan",
        type: "local-doc-write"
      },
      dryRun: false
    });

    expect(result.status).toBe(403);
    expect(result.body.result).toBe("phase_1_dry_run_only");
  });

  it("normalizes target and action from request shape", () => {
    const normalized = normalizeHermesInboxRequest({
      requestId: "req-normalize",
      source: "hermes-dashboard",
      target: { id: "PROJECT_STATE.md" },
      intent: { type: "local-review" }
    });

    expect(normalized.ok).toBe(true);
    expect(normalized.action.id).toBe("req-normalize");
    expect(normalized.action.target).toBe("PROJECT_STATE.md");
  });

  it("returns a safe invalid request response for missing targets", () => {
    const result = evaluateHermesInboxDryRun({
      requestId: "req-missing-target",
      source: "codex-local",
      action: {
        id: "missing-target",
        type: "local-review"
      }
    });

    expect(result.status).toBe(400);
    expect(result.body.externalWrites).toBe(false);
  });
});
