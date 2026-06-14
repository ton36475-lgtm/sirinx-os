import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ComplianceGuardAgent,
  EdgeOrchestratorAgent,
  EvidencePackagerAgent,
  createDefaultMockJob,
  validateMockJob
} from "./local-prototype.mjs";

const fixedNow = () => new Date("2026-05-30T05:00:00.000Z");

describe("CF_LOCAL_AGENT_PROTOTYPE_001 mock job contract", () => {
  it("validates the default local mock job without requiring secrets or Cloudflare calls", () => {
    const job = createDefaultMockJob({ now: fixedNow });
    const result = validateMockJob(job);

    expect(result.ok).toBe(true);
    expect(result.normalized.job_id).toBe("job_20260530_cf_local_001");
    expect(result.normalized.approval_required).toBe(false);
    expect(result.normalized.cloudflareApiCall).toBe(false);
    expect(result.normalized.secretRequired).toBe(false);
  });

  it("fails closed when job schema is incomplete", () => {
    const result = validateMockJob({
      type: "cloudflare_agent_team_local_prototype",
      requested_action: "run local evidence dry-run"
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe("invalid_mock_job");
    expect(result.findings).toEqual(expect.arrayContaining(["job_id_required", "correlation_id_required"]));
  });
});

describe("CF_LOCAL_AGENT_PROTOTYPE_001 compliance guard", () => {
  it("allows local preview and evidence packaging work", () => {
    const guard = new ComplianceGuardAgent({ now: fixedNow });
    const result = guard.review(
      createDefaultMockJob({
        now: fixedNow,
        overrides: {
          requested_action: "run local mock job and write local evidence packet"
        }
      })
    );

    expect(result.status).toBe("allowed_local_only");
    expect(result.canProceedLocalOnly).toBe(true);
    expect(result.canExecuteCloudMutation).toBe(false);
    expect(result.blockedReasons).toEqual([]);
  });

  it("blocks risky Cloudflare mutation actions even when requested as a mock job", () => {
    const guard = new ComplianceGuardAgent({ now: fixedNow });
    const result = guard.review(
      createDefaultMockJob({
        now: fixedNow,
        overrides: {
          approval_required: true,
          requested_action: "wrangler deploy and create D1 R2 Queue Vectorize resources",
          target_environment: "cloudflare-dev"
        }
      })
    );

    expect(result.status).toBe("blocked_preapproval_required");
    expect(result.canProceedLocalOnly).toBe(false);
    expect(result.canExecuteCloudMutation).toBe(false);
    expect(result.blockedReasons).toEqual(
      expect.arrayContaining(["wrangler_deploy", "d1_create", "r2_create", "queue_create", "vectorize_create"])
    );
  });
});

describe("CF_LOCAL_AGENT_PROTOTYPE_001 evidence packager", () => {
  it("writes a local evidence packet without secrets or external writes", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sirinx-cf-local-prototype-"));
    const evidencePath = path.join(tempDir, "evidence.md");
    const job = createDefaultMockJob({ now: fixedNow });
    const compliance = new ComplianceGuardAgent({ now: fixedNow }).review(job);
    const packager = new EvidencePackagerAgent({ now: fixedNow });

    const result = packager.writeEvidence({ job, compliance, outputPath: evidencePath });

    expect(result.status).toBe("local_evidence_written");
    expect(result.path).toBe(evidencePath);
    expect(result.externalWrite).toBe(false);
    expect(result.cloudflareApiCall).toBe(false);

    const evidence = fs.readFileSync(evidencePath, "utf8");
    expect(evidence).toContain("CF_LOCAL_AGENT_PROTOTYPE_001 Evidence");
    expect(evidence).toContain("cloudflareApiCall: false");
    expect(evidence).toContain("secretRequired: false");
    expect(evidence).not.toMatch(/sk-[A-Za-z0-9_-]{16,}/);
    expect(evidence).not.toMatch(/cfat_[A-Za-z0-9_-]{16,}/);
  });
});

describe("CF_LOCAL_AGENT_PROTOTYPE_001 orchestrator", () => {
  it("runs the full local-only flow and stops before Cloudflare mutation", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sirinx-cf-local-flow-"));
    const evidencePath = path.join(tempDir, "flow.md");
    const orchestrator = new EdgeOrchestratorAgent({ now: fixedNow });

    const result = orchestrator.run(createDefaultMockJob({ now: fixedNow }), {
      outputPath: evidencePath
    });

    expect(result.status).toBe("done_local_evidence_only");
    expect(result.job.status).toBe("validated");
    expect(result.compliance.status).toBe("allowed_local_only");
    expect(result.evidence.status).toBe("local_evidence_written");
    expect(result.cloudflareApiCall).toBe(false);
    expect(result.externalWrite).toBe(false);
    expect(result.stopBefore).toEqual(
      expect.arrayContaining(["wrangler_deploy", "dns_edit", "access_policy_write", "remote_mcp_registration"])
    );
    expect(fs.existsSync(evidencePath)).toBe(true);
  });
}
);
