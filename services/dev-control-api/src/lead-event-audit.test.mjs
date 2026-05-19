import { describe, expect, it } from "vitest";
import { getDefaultLeadAuditPayload, getLeadEventAuditPreview } from "./lead-event-audit.mjs";

describe("lead event audit preview", () => {
  it("builds a high-load home-office audit event without external writes", () => {
    const preview = getLeadEventAuditPreview();

    expect(preview.status).toBe("ready-local-lead-event-audit");
    expect(preview.modelVersion).toBe("2026-05-20.lead-event-audit.v1");
    expect(preview.externalWrites).toBe(false);
    expect(preview.productionPostProbeRun).toBe(false);
    expect(preview.crmWrites).toBe(false);
    expect(preview.supabaseWrites).toBe(false);
    expect(preview.leadEvent.packageLane).toBe("hybrid-h20-engineered");
    expect(preview.leadEvent.workflowLane).toBe("sales-engineering-review");
    expect(preview.leadEvent.routing.primaryProfile).toBe("sales");
    expect(preview.leadEvent.routing.supportProfiles).toEqual(expect.arrayContaining(["backend", "data", "qa"]));
  });

  it("does not expose raw phone or email values in the audit preview", () => {
    const payload = getDefaultLeadAuditPayload();
    const preview = getLeadEventAuditPreview(payload);
    const serialized = JSON.stringify(preview);

    expect(preview.leadEvent.contactEvidence).toMatchObject({
      hasPhone: true,
      hasEmail: true,
      rawContactValuesStored: false
    });
    expect(serialized).not.toContain(payload.phone);
    expect(serialized).not.toContain(payload.email);
  });

  it("keeps missing-contact leads blocked locally before CRM handoff", () => {
    const preview = getLeadEventAuditPreview({
      source: "assessment",
      name: "No Contact Home",
      monthlyBill: "12000",
      bessInterest: "backup",
      deviceType: "desktop"
    });

    expect(preview.externalWrites).toBe(false);
    expect(preview.leadEvent.workflowLane).toBe("missing-contact-channel");
    expect(preview.leadEvent.routing.commandCenterLane).toBe("blocked");
    expect(preview.leadEvent.riskFlags).toContain("missing-contact-channel");
    expect(preview.evidenceChecklist.find((item) => item.id === "contact-channel")?.status).toBe("missing");
  });

  it("lists every external handoff as blocked approval-required work", () => {
    const preview = getLeadEventAuditPreview();

    expect(preview.blockedExternalActions.map((action) => action.id)).toEqual([
      "crm-write",
      "supabase-write",
      "production-lead-post",
      "customer-message-send"
    ]);
    expect(preview.blockedExternalActions.every((action) => action.externalWrites === false)).toBe(true);
    expect(preview.blockedExternalActions.every((action) => action.requiresHumanApproval === true)).toBe(true);
  });
});
