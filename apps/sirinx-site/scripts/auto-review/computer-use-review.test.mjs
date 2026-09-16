import { describe, expect, it } from "vitest";
import {
  buildAutoReviewResult,
  classifyAutoReviewVerdict,
  inspectLineTargets,
  scanStaticSafety
} from "./computer-use-review.mjs";

describe("P087 computer-use auto-review gate", () => {
  it("returns approval-needed verdict when low-risk checks pass but deploy remains the next action", () => {
    const verdict = classifyAutoReviewVerdict({
      checks: [
        { check_type: "route_health", status: "passed" },
        { check_type: "mobile_overlap", status: "passed" },
        { check_type: "keyboard_skip_link", status: "passed" }
      ],
      findings: [],
      next_action_class: "high_risk_approval_required"
    });

    expect(verdict).toBe("auto_review_pass_needs_human_approval");
  });

  it("blocks static content that contains live-send, production deploy, or cloud mutation patterns", () => {
    const findings = scanStaticSafety({
      files: new Map([
        [
          "unsafe.js",
          "fetch('https://api.line.me/v2/bot/message/push', { method: 'POST' });\nwrangler deploy --env production"
        ]
      ])
    });

    expect(findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining(["LIVE_SEND_PATH_DETECTED", "PRODUCTION_DEPLOY_COMMAND_DETECTED"])
    );
    expect(
      classifyAutoReviewVerdict({
        checks: [{ check_type: "static_safety", status: "failed" }],
        findings,
        next_action_class: "low_risk"
      })
    ).toBe("review_blocked_with_findings");
  });

  it("validates LINE add/chat targets and QR asset references without sending messages", () => {
    const html = `
      <img data-qr-image src="https://qr-official.line.me/gs/M_304zrttj_GW.png?oat_content=qr" />
      <a href="https://lin.ee/S97R6nj">เพิ่มเพื่อน</a>
      <a href="https://line.me/R/ti/p/%40304zrttj">Add Friend</a>
      <a href="https://line.me/R/oaMessage/%40304zrttj">Chat</a>
      <a href="/contact">สอบถามผ่านเว็บไซต์</a>
    `;

    const result = inspectLineTargets({ html });

    expect(result.status).toBe("passed");
    expect(result.add_friend_found).toBe(true);
    expect(result.chat_found).toBe(true);
    expect(result.qr_found).toBe(true);
    expect(result.send_performed).toBe(false);
  });

  it("builds a blocked review result when high-severity findings exist", () => {
    const result = buildAutoReviewResult({
      run_id: "p087-test",
      packet_id: "P087",
      mode: "local",
      target_origin: "http://127.0.0.1:18731",
      checks: [{ check_type: "static_safety", status: "failed", summary: "live send found" }],
      findings: [
        {
          severity: "critical",
          code: "LIVE_SEND_PATH_DETECTED",
          message: "Live message send path detected",
          evidence_ref: "unsafe.js"
        }
      ],
      artifacts: []
    });

    expect(result.verdict).toBe("review_blocked_with_findings");
    expect(result.human_approval_required).toBe(false);
  });
});
