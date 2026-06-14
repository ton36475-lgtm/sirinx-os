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

  it("normalizes caption-bound image edits without external execution", () => {
    const result = evaluateHermesInboxDryRun({
      requestId: "req-image-edit",
      source: "codex-local",
      attachments: [
        {
          type: "image",
          mimeType: "image/jpeg",
          path: "/tmp/food-on-black-plate.jpg"
        }
      ],
      caption: "change only the plate from black to white",
      action: {
        id: "edit-food-plate",
        type: "image-edit",
        externalWrite: false
      },
      dryRun: true
    });

    expect(result.status).toBe(200);
    expect(result.body.status).toBe("allowed");
    expect(result.body.image_edit).toBe(true);
    expect(result.body.imageEdit).toMatchObject({
      image_ref: "/tmp/food-on-black-plate.jpg",
      edit_instruction: "change only the plate from black to white",
      tool: "image_edit",
      mode: "image-to-image",
      caption_required: true,
      fallback_text_to_image_blocked: true,
      canExecuteExternally: false,
      canRunMcp: false,
      canReadSecrets: false
    });
    expect(result.body.normalizedAction.imageEdit.imageRef).toBe("/tmp/food-on-black-plate.jpg");
    expect(result.body.externalWrites).toBe(false);
  });

  it("fails closed when image edit request is missing caption", () => {
    const result = evaluateHermesInboxDryRun({
      requestId: "req-image-edit-no-caption",
      source: "codex-local",
      attachments: [
        {
          type: "image",
          mimeType: "image/png",
          path: "/tmp/food.png"
        }
      ],
      action: {
        id: "edit-food-plate",
        type: "image-edit"
      },
      dryRun: true
    });

    expect(result.status).toBe(400);
    expect(result.body.status).toBe("image_edit_caption_required");
    expect(result.body.imageEdit.caption_required).toBe(true);
    expect(result.body.imageEdit.fallback_text_to_image_blocked).toBe(true);
    expect(result.body.externalWrites).toBe(false);
    expect(result.body.canExecuteExternally).toBe(false);
    expect(result.body.canRunMcp).toBe(false);
    expect(result.body.canReadSecrets).toBe(false);
  });
});
