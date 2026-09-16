import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { createActiveFocusFinalLocalReview } from "./ghostclaw_active_focus_final_local_review.mjs";

async function writeJson(root, relativePath, payload) {
  const path = join(root, relativePath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

const guardrails = {
  live_send: false,
  provider_call: false,
  external_message_send: false,
  payload_executed: false,
  commit: false,
  push: false,
  deploy: false,
  cloudflare_r2_mutation: false,
  secret_read: false,
  install: false
};

const paths = {
  telegram: ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P065-TELEGRAM-ERROR-LOOP-READINESS-20260703.json",
  review: ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P069-ACTIVE-FOCUS-REVIEW-READY-20260703.json",
  next: ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P070-ACTIVE-FOCUS-NEXT-GATES-20260703.json",
  status: ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P071-ACTIVE-FOCUS-OPERATOR-STATUS-20260703.json",
  bundle: ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P072-ACTIVE-FOCUS-HANDOFF-BUNDLE-20260703.json",
  index: ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P073-ACTIVE-FOCUS-HANDOFF-INDEX-20260703.json",
  verify: ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P074-ACTIVE-FOCUS-HANDOFF-VERIFY-20260703.json",
  gate: ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P057-LOCAL-COMMIT-GATE-CHECK-20260703.json",
  helper: ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P058-LOCAL-COMMIT-HELPER-DRY-RUN-20260703.json"
};

function checks(count = 1) {
  return Array.from({ length: count }, (_, index) => ({ name: `check_${index}`, passed: true }));
}

function nextGates() {
  return {
    status: "PASS_NEXT_GATES_READY",
    checks: checks(),
    guardrails,
    gate_options: [
      { id: "local_commit", status: "ready_for_exact_operator_gate_no_commit_performed" },
      { id: "telegram_live_send", status: "closed_requires_separate_exact_gate" },
      { id: "provider_call", status: "closed_requires_separate_exact_gate" },
      { id: "cloudflare_r2_write", status: "closed_requires_separate_exact_gate" },
      { id: "push_deploy", status: "closed_requires_separate_exact_gate" },
      { id: "install_or_dependency_change", status: "closed_requires_separate_exact_gate" }
    ]
  };
}

async function createFixture(overrides = {}) {
  const root = await mkdtemp(join(tmpdir(), "active-focus-final-review-"));
  await writeJson(root, paths.telegram, {
    status: "PASS_TELEGRAM_ERROR_LOOP_READINESS",
    guardrails: { ...guardrails, ...(overrides.telegramGuardrails || {}) }
  });
  await writeJson(root, paths.review, {
    status: "PASS_REVIEW_READY",
    checks: checks(),
    guardrails
  });
  await writeJson(root, paths.next, overrides.nextGates || nextGates());
  await writeJson(root, paths.status, {
    status: "PASS_OPERATOR_STATUS_READY",
    checks: checks(),
    guardrails
  });
  await writeJson(root, paths.bundle, {
    status: "PASS_HANDOFF_BUNDLE_READY",
    checks: checks(),
    guardrails
  });
  await writeJson(root, paths.index, {
    status: "PASS_HANDOFF_INDEX_READY",
    checks: checks(),
    file_hashes: Array.from({ length: 6 }, (_, index) => ({ path: `file-${index}`, sha256: "a".repeat(64) })),
    guardrails
  });
  await writeJson(root, paths.verify, {
    status: overrides.verifyStatus || "PASS_HANDOFF_VERIFY_READY",
    checks: checks(),
    hash_results: Array.from({ length: 6 }, (_, index) => ({ path: `file-${index}`, matched: overrides.hashMatched !== false })),
    guardrails
  });
  await writeJson(root, paths.gate, {
    status: "PASS",
    candidate_pathspec_count: overrides.pathspecCount || 63,
    git_status_line_count: overrides.statusLineCount || 113,
    failures: []
  });
  await writeJson(root, paths.helper, {
    status: "PASS",
    executed: overrides.helperExecuted === true,
    failures: []
  });
  await writeJson(root, "reports/mission/A2A2A_LOCAL_COMMIT_GATE_20260703.json", {
    candidate_pathspecs: [
      "scripts/ghostclaw_active_focus_final_local_review.mjs",
      "scripts/ghostclaw_active_focus_final_local_review.test.mjs",
      "reports/mission/A2A2A_ACTIVE_FOCUS_FINAL_LOCAL_REVIEW_20260703.md",
      ...Array.from({ length: 60 }, (_, index) => `fixture/path-${index}.md`)
    ],
    required_evidence: [
      ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P075-ACTIVE-FOCUS-FINAL-LOCAL-REVIEW-20260703.json",
      ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P075-ACTIVE-FOCUS-FINAL-LOCAL-REVIEW-20260703.json"
    ]
  });
  return root;
}

describe("Active focus final local review", () => {
  it("passes when Telegram readiness and the A2A2A handoff chain are locally verified", async () => {
    const root = await createFixture();
    const packet = await createActiveFocusFinalLocalReview({
      root,
      createdAt: "2026-07-03T01:40:00.000Z"
    });

    expect(packet.status).toBe("PASS_FINAL_LOCAL_REVIEW_READY");
    expect(packet.commit_gate_summary.candidate_pathspecs).toBe(63);
    expect(packet.guardrails.provider_call).toBe(false);
    expect(packet.telegram_safe_draft).toContain("handoff_verify: PASS_HANDOFF_VERIFY_READY");
  });

  it("fails closed if the commit helper executed a commit", async () => {
    const root = await createFixture({ helperExecuted: true });
    const packet = await createActiveFocusFinalLocalReview({ root });

    expect(packet.status).toBe("FAIL_FINAL_LOCAL_REVIEW_NOT_READY");
    expect(packet.failures).toContain("commit_helper_dry_run_pass");
  });

  it("fails closed if handoff verification reports hash drift", async () => {
    const root = await createFixture({ hashMatched: false });
    const packet = await createActiveFocusFinalLocalReview({ root });

    expect(packet.status).toBe("FAIL_FINAL_LOCAL_REVIEW_NOT_READY");
    expect(packet.failures).toContain("handoff_verify_pass");
  });

  it("fails closed if provider calls are opened in Telegram readiness", async () => {
    const root = await createFixture({ telegramGuardrails: { provider_call: true } });
    const packet = await createActiveFocusFinalLocalReview({ root });

    expect(packet.status).toBe("FAIL_FINAL_LOCAL_REVIEW_NOT_READY");
    expect(packet.failures).toContain("telegram_error_loop_readiness_pass");
  });
});
