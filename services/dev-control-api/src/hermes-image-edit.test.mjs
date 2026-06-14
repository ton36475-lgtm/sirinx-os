import { describe, expect, it } from "vitest";
import {
  createHermesImageEditAcceptanceDryRun,
  createHermesImageEditDryRun,
  getHermesImageEditStatus
} from "./hermes-image-edit.mjs";

describe("Hermes image edit local contract", () => {
  it("exposes local-only image edit status", () => {
    const status = getHermesImageEditStatus();

    expect(status.status).toBe("ready-local-only");
    expect(status.image_edit).toBe(true);
    expect(status.caption_required).toBe(true);
    expect(status.fallback_text_to_image_blocked).toBe(true);
    expect(status.externalWrites).toBe(false);
    expect(status.canExecuteExternally).toBe(false);
    expect(status.canRunMcp).toBe(false);
    expect(status.canReadSecrets).toBe(false);
    expect(status.blockedActions).toContain("text_to_image_fallback_when_source_image_exists");
    expect(status.acceptancePacket).toMatchObject({
      patch_ready: true,
      gateway_restart_required: true,
      caption_required: true,
      provider_edit_capability: "needs_manual_probe",
      text_to_image_fallback: "blocked",
      canRestartGateway: false,
      canCallProvider: false
    });
    expect(status.acceptancePacket.evidenceFields.map((field) => field.id)).toContain("image_ref_preserved");
  });

  it("creates a dry-run packet that preserves image_ref and caption", () => {
    const result = createHermesImageEditDryRun({
      requestId: "test-image-edit",
      image_ref: "/tmp/food.png",
      caption: "change only the plate from black to white"
    });

    expect(result.status).toBe("dry-run-image-edit-ready");
    expect(result.externalWrites).toBe(false);
    expect(result.canExecuteExternally).toBe(false);
    expect(result.hermesInbox.image_edit).toBe(true);
    expect(result.hermesInbox.imageEdit).toMatchObject({
      image_ref: "/tmp/food.png",
      edit_instruction: "change only the plate from black to white",
      fallback_text_to_image_blocked: true
    });
  });

  it("creates a local-only acceptance packet dry-run with manual restart evidence", () => {
    const result = createHermesImageEditAcceptanceDryRun({
      requestId: "acceptance-test",
      source: "vitest",
      image_ref: "/tmp/food.png",
      caption: "change only the plate from black to white"
    });

    expect(result.status).toBe("acceptance-dry-run-ready");
    expect(result.patch_ready).toBe(true);
    expect(result.gateway_restart_required).toBe(true);
    expect(result.provider_edit_capability).toBe("needs_manual_probe");
    expect(result.text_to_image_fallback).toBe("blocked");
    expect(result.externalWrites).toBe(false);
    expect(result.canExecuteExternally).toBe(false);
    expect(result.canRunMcp).toBe(false);
    expect(result.canReadSecrets).toBe(false);
    expect(result.canCallProvider).toBe(false);
    expect(result.canRestartGateway).toBe(false);
    expect(result.providerCapabilityCheck).toMatchObject({
      checkedLive: false,
      tokenRead: false,
      tokenPrinted: false,
      providerSwitch: false
    });
    expect(result.gatewayRestartChecklist).toMatchObject({
      required: true,
      autoRestart: false,
      manualApprovalRequired: true
    });
    expect(result.evidence).toMatchObject({
      source_image_present: "operator-supplied",
      caption_bound_same_event: true,
      image_ref_preserved: true,
      image_edit_selected: true,
      image_generate_not_selected: true,
      result_reviewed_by_human: false,
      operation: "image_edit"
    });
    expect(result.hermesInbox.imageEdit.image_ref).toBe("/tmp/food.png");
    expect(result.stopPoint).toContain("WAITING FOR MANUAL GATEWAY RESTART APPROVAL");
  });

  it("fails closed when an acceptance dry-run tries to execute external actions", () => {
    const result = createHermesImageEditAcceptanceDryRun({
      requestId: "blocked-acceptance-test",
      restartGateway: true,
      callProvider: true,
      readSecret: true
    });

    expect(result.status).toBe("acceptance-dry-run-blocked");
    expect(result.externalWrites).toBe(false);
    expect(result.canExecuteExternally).toBe(false);
    expect(result.canRestartGateway).toBe(false);
    expect(result.canCallProvider).toBe(false);
    expect(result.canReadSecrets).toBe(false);
    expect(result.blockedActions).toContain("requested_external_action_blocked");
  });
});
