import { describe, expect, it } from "vitest";
import { collectMasterPlanCurrentAudit } from "./master-plan-current-audit.mjs";

describe("website master plan current audit", () => {
  it("maps the website-first plan to local evidence without allowing a completion claim", async () => {
    const audit = await collectMasterPlanCurrentAudit();

    expect(audit.packet_id).toBe("packet_060_sirinx_website_master_plan_current_audit");
    expect(audit.status).toBe("LOCAL_EVIDENCE_READY_FOR_HUMAN_REVIEW_NOT_COMPLETE");
    expect(audit.completion_claim_allowed).toBe(false);
    expect(audit.deploy_approval).toBe("not_granted");
    expect(audit.push_approval).toBe("not_granted");
    expect(audit.missing_local_requirements).toEqual([]);
    expect(audit.local_requirements.length).toBeGreaterThanOrEqual(16);
    expect(audit.local_requirements.every((requirement) => requirement.status === "proven_locally")).toBe(true);
  });

  it("keeps real-device QR, existing bot behavior, visual review, and push/deploy approval pending", async () => {
    const audit = await collectMasterPlanCurrentAudit();
    const pendingIds = audit.pending_requirements.map((requirement) => requirement.id);

    expect(pendingIds).toEqual(
      expect.arrayContaining([
        "manual_visual_acceptance",
        "real_device_qr_scan",
        "existing_bot_manual_behavior",
        "mobile_spacing_real_review",
        "explicit_push_deploy_gate"
      ])
    );
    expect(audit.closed_gates).toEqual(
      expect.arrayContaining(["deploy", "push", "line_webhook", "production_analytics", "crm_customer_data_storage"])
    );
  });

  it("includes recent screenshot and GitHub recheck packets in the source evidence", async () => {
    const audit = await collectMasterPlanCurrentAudit();

    expect(audit.source_packets).toEqual(
      expect.arrayContaining([
        "_A2A_QUEUE/outbox/packet_058_sirinx_website_review_screenshot_evidence.json",
        "_A2A_QUEUE/outbox/packet_059_sirinx_website_github_current_recheck.json",
        "_A2A_QUEUE/outbox/packet_069_sirinx_website_manual_review_evidence_contract.json",
        "_A2A_QUEUE/outbox/packet_070_sirinx_website_local_preview_health.json",
        "_A2A_QUEUE/outbox/packet_072_sirinx_website_manual_review_receipt.json"
      ])
    );
  });
});
