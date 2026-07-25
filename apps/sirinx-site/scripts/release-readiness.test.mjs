import { describe, expect, it } from "vitest";
import { collectReleaseReadiness, hasExactDeployApproval, summarizeAutoReviewEvidence } from "./release-readiness.mjs";

describe("P087 auto-review evidence summary", () => {
  it("accepts low-risk checks only when the auto-review pass has artifacts and no high-risk findings", () => {
    const summary = summarizeAutoReviewEvidence({
      verdict: "auto_review_pass_needs_human_approval",
      checks: [{ status: "passed" }],
      findings: [{ severity: "warning", code: "UNEXPECTED_EXTERNAL_REQUEST" }],
      artifacts: [{ path_or_r2_key: "reports/review/p087/screenshot.png", sha256: "abc" }]
    });

    expect(summary.evidence_ready).toBe(true);
    expect(summary.low_risk_checks_accepted).toEqual(
      expect.arrayContaining([
        "Confirm Add LINE target",
        "Confirm Chat target",
        "Confirm LINE did not replace existing inquiry path",
        "Keyboard skip-link spot check",
        "Mobile overlap / layout spot check"
      ])
    );
  });

  it("does not accept auto-review evidence when a high-risk finding is present", () => {
    const summary = summarizeAutoReviewEvidence({
      verdict: "review_blocked_with_findings",
      checks: [{ status: "passed" }],
      findings: [{ severity: "critical", code: "LIVE_SEND_PATH_DETECTED" }],
      artifacts: [{ path_or_r2_key: "reports/review/p087/screenshot.png", sha256: "abc" }]
    });

    expect(summary.evidence_ready).toBe(false);
    expect(summary.low_risk_checks_accepted).toEqual([]);
  });
});

describe("website release readiness dry run", () => {
  it("requires an exact deploy approval token, not the placeholder", () => {
    expect(hasExactDeployApproval("APPROVE_DEPLOY_SIRINX_SITE_<date>")).toBe(false);
    expect(hasExactDeployApproval("APPROVE_DEPLOY_SIRINX_SITE_2026-07-06")).toBe(true);
  });

  it("reports local evidence ready for exact deploy run while push and other gates stay blocked", async () => {
    const readiness = await collectReleaseReadiness();

    expect(readiness.packet_id).toBe("packet_071_sirinx_website_release_preflight");
    expect(readiness.status).toBe("RELEASE_PREFLIGHT_READY_FOR_EXACT_DEPLOY_RUN");
    expect(readiness.deploy_gate).toBe("READY_FOR_EXACT_DEPLOY_RUN");
    expect(readiness.push_gate).toBe("BLOCKED_UNTIL_EXPLICIT_APPROVAL");
    expect(readiness.local_evidence).toBe("PRESENT");
    expect(readiness.manifest_exclude_guidance).toBe("PRESENT");
    expect(readiness.automated_evidence_ready).toBe(true);
    expect(readiness.auto_review_evidence_ready).toBe(true);
    expect(readiness.auto_review_verdict).toBe("auto_review_pass_needs_human_approval");
    expect(readiness.auto_review_warning_count).toBeGreaterThanOrEqual(0);
    expect(readiness.auto_review_artifact_count).toBeGreaterThan(0);
    expect(readiness.auto_visual_bot_evidence_ready).toBe(true);
    expect(readiness.auto_visual_bot_verdict).toBe("auto_review_pass_bot_verified");
    expect(readiness.auto_visual_bot_routes_checked).toEqual(
      expect.arrayContaining(["/", "/line/", "/contact/", "/trust-center/", "/projects/", "/quote/", "/roi-calculator/"])
    );
    expect(readiness.review_evidence_status).toBe("REVIEW_EVIDENCE_REFRESH_READY_PENDING_HUMAN_INPUT");
    expect(readiness.manual_evidence_contract_status).toBe(
      "MANUAL_REVIEW_EVIDENCE_CONTRACT_READY_PENDING_HUMAN_EVIDENCE"
    );
    expect(readiness.manual_review_receipt_status).toBe("MANUAL_REVIEW_RECEIPT_READY_PENDING_HUMAN_INPUT");
    expect(readiness.manual_review_receipt_complete).toBe(false);
    expect(readiness.local_preview_health_status).toBe("LOCAL_PREVIEW_HEALTH_READY_FOR_HUMAN_REVIEW");
    expect(readiness.local_preview_routes_ready).toBe(true);
    expect(readiness.real_device_scan_proven).toBe(true);
    expect(readiness.real_device_scan_source).toBe("manual_review_template");
    expect(readiness.deploy_approval_present).toBe(true);
    expect(readiness.can_deploy_after_preflight).toBe(true);
    expect(readiness.blockers).toEqual([]);
    expect(readiness.blockers.map((blocker) => blocker.id)).not.toContain("pending_manual_checks");
    expect(readiness.blockers.map((blocker) => blocker.id)).not.toContain("manual_evidence_incomplete");
    expect(readiness.blockers.map((blocker) => blocker.id)).not.toContain("manual_review_receipt_incomplete");
    expect(readiness.blockers.map((blocker) => blocker.id)).not.toContain("real_device_qr_scan_missing");
    expect(readiness.pending_manual_requirements).toEqual([]);
    expect(readiness.accepted_manual_requirements).toContain("Deployment can proceed");
    expect(readiness.pending_manual_requirements).not.toContain("QR is scannable on a real device");
    expect(readiness.pending_manual_requirements).not.toContain("Mobile overlap and spacing are acceptable");
    expect(readiness.pending_manual_requirements).not.toContain("Human visual acceptance after rejected design direction");
    expect(readiness.pending_manual_requirements).not.toContain("Existing website bot/contact behavior is preserved exactly");
    expect(readiness.pending_manual_checks).toEqual([]);
    expect(readiness.pending_manual_checks).not.toContain("Real-device LINE QR scan");
    expect(readiness.pending_manual_checks).not.toContain("Confirm Add LINE target");
    expect(readiness.pending_manual_checks).not.toContain("Confirm Chat target");
    expect(readiness.pending_manual_checks).not.toContain("Confirm LINE did not replace existing inquiry path");
    expect(readiness.pending_manual_checks).not.toContain("Keyboard skip-link spot check");
    expect(readiness.pending_manual_checks).not.toContain("Mobile overlap / layout spot check");
    expect(readiness.accepted_manual_requirements).toEqual(
      expect.arrayContaining([
        "QR is scannable on a real device",
        "Mobile overlap and spacing are acceptable",
        "Human visual acceptance after rejected design direction",
        "Existing website bot/contact behavior is preserved exactly"
      ])
    );
    expect(readiness.accepted_manual_checks).toEqual(
      expect.arrayContaining([
        "Real-device LINE QR scan",
        "Confirm QR opens `SIRINX โซล่าเซลล์`",
        "Confirm Add LINE target",
        "Confirm Chat target",
        "Confirm LINE did not replace existing inquiry path",
        "Keyboard skip-link spot check",
        "Mobile overlap / layout spot check"
      ])
    );
    expect(readiness.accepted_manual_checks).toEqual(
      expect.arrayContaining([
        "Local homepage visual review",
        "Local `/line` visual review",
        "Local `/contact` visual review",
        "Local `/projects` visual review",
        "Local `/trust-center` visual review",
        "Local `/quote` visual review",
        "Local `/roi-calculator` visual review",
        "Desktop floating LINE dock review",
        "Mobile contact tray review",
        "Existing bot / inquiry path behavior"
      ])
    );
    expect(readiness.manual_evidence_complete_after_auto_review).toBe(true);
    expect(readiness.manual_review_receipt_complete_after_auto_review).toBe(true);
    expect(readiness.closed_gates).toEqual(
      expect.arrayContaining(["push", "line_webhook", "production_analytics", "crm_customer_data_storage"])
    );
    expect(readiness.closed_gates).not.toContain("deploy");
    expect(readiness.next_safe_action).toBe(
      "Open the scoped website commit gate first; push and deploy remain separate exact gates."
    );
  });
});
