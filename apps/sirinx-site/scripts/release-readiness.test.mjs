import { describe, expect, it } from "vitest";
import { collectReleaseReadiness } from "./release-readiness.mjs";

describe("website release readiness dry run", () => {
  it("reports local evidence ready for human review while deploy and push stay blocked", async () => {
    const readiness = await collectReleaseReadiness();

    expect(readiness.packet_id).toBe("packet_071_sirinx_website_release_preflight");
    expect(readiness.status).toBe("READY_FOR_HUMAN_REVIEW_BLOCKED_FOR_DEPLOY");
    expect(readiness.deploy_gate).toBe("BLOCKED_FOR_DEPLOY");
    expect(readiness.push_gate).toBe("BLOCKED_UNTIL_EXPLICIT_APPROVAL");
    expect(readiness.local_evidence).toBe("PRESENT");
    expect(readiness.manifest_exclude_guidance).toBe("PRESENT");
    expect(readiness.automated_evidence_ready).toBe(true);
    expect(readiness.review_evidence_status).toBe("REVIEW_EVIDENCE_REFRESH_READY_PENDING_HUMAN_INPUT");
    expect(readiness.manual_evidence_contract_status).toBe(
      "MANUAL_REVIEW_EVIDENCE_CONTRACT_READY_PENDING_HUMAN_EVIDENCE"
    );
    expect(readiness.manual_review_receipt_status).toBe("MANUAL_REVIEW_RECEIPT_READY_PENDING_HUMAN_INPUT");
    expect(readiness.manual_review_receipt_complete).toBe(false);
    expect(readiness.local_preview_health_status).toBe("LOCAL_PREVIEW_HEALTH_READY_FOR_HUMAN_REVIEW");
    expect(readiness.local_preview_routes_ready).toBe(true);
    expect(readiness.real_device_scan_proven).toBe(false);
    expect(readiness.deploy_approval_present).toBe(false);
    expect(readiness.can_deploy_after_preflight).toBe(false);
    expect(readiness.blockers.map((blocker) => blocker.id)).toEqual(
      expect.arrayContaining([
        "pending_manual_requirements",
        "pending_manual_checks",
        "manual_evidence_incomplete",
        "manual_review_receipt_incomplete",
        "real_device_qr_scan_missing",
        "exact_deploy_approval_missing"
      ])
    );
    expect(readiness.pending_manual_requirements).toEqual(
      expect.arrayContaining([
        "Human visual acceptance after rejected design direction",
        "QR is scannable on a real device",
        "Existing website bot/contact behavior is preserved exactly",
        "Deployment can proceed"
      ])
    );
    expect(readiness.pending_manual_checks).toEqual(
      expect.arrayContaining([
        "Real-device LINE QR scan",
        "Existing bot / inquiry path behavior",
        "Mobile overlap / layout spot check"
      ])
    );
    expect(readiness.closed_gates).toEqual(
      expect.arrayContaining(["deploy", "push", "line_webhook", "production_analytics", "crm_customer_data_storage"])
    );
  });
});
