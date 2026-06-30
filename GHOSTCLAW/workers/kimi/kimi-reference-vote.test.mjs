import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function readText(path) {
  return readFile(path, "utf8");
}

describe("GHOSTCLAW Phase 7 Kimi worker lane contract", () => {
  it("locks Kimi reference votes to advisory artifacts with decision and evidence metadata", async () => {
    const schema = await readJson("GHOSTCLAW/workers/kimi/kimi-reference-vote.schema.json");
    const required = schema.required;

    expect(required).toEqual(expect.arrayContaining([
      "vote_id",
      "voter",
      "proposal_id",
      "decision_id",
      "requester_agent",
      "approver_agent",
      "receipt_required",
      "evidence_pack",
      "live_provider_call_performed",
      "model_download_performed",
      "gpu_inference_performed",
      "receipt_hash",
    ]));
    expect(schema.properties.voter.const).toBe("kimi_coding_worker");
    expect(schema.properties.receipt_required.const).toBe(true);
    expect(schema.properties.live_provider_call_performed.const).toBe(false);
    expect(schema.properties.model_download_performed.const).toBe(false);
    expect(schema.properties.gpu_inference_performed.const).toBe(false);
    expect(schema.additionalProperties).toBe(false);
  });

  it("requires the evidence pack to be secret-free and scoped", async () => {
    const schema = await readJson("GHOSTCLAW/workers/kimi/kimi-reference-vote.schema.json");
    const evidencePack = schema.properties.evidence_pack;

    expect(evidencePack.required).toEqual(expect.arrayContaining(["sources", "scope", "no_secrets"]));
    expect(evidencePack.properties.no_secrets.const).toBe(true);
    expect(evidencePack.properties.sources.minItems).toBe(1);
  });

  it("hard-blocks provider, model, secret, deployment, shell, and self-approval actions in policy", async () => {
    const policy = await readText("GHOSTCLAW/workers/kimi/kimi-worker.policy.yaml");

    for (const marker of [
      "model_download",
      "gpu_live_inference",
      "gpu_inference",
      "secret_access",
      "env_read",
      "api_key_read",
      "deploy",
      "push",
      "production_action",
      "live_provider_call",
      "install_dependencies",
      "run_shell_command",
      "cross_lane_write",
      "self_approval",
      "action_tier_cap remains final authority",
    ]) {
      expect(policy).toContain(marker);
    }
  });

  it("registers kimi_coding_worker with all Phase 7 roles and guard fields", async () => {
    const registry = await readJson("GHOSTCLAW/workers/registry/worker-registry.json");
    const worker = registry.workers.find((entry) => entry.id === "kimi_coding_worker");

    expect(worker).toBeDefined();
    expect(worker).toMatchObject({
      model: "kimi_k2_7_code",
      role: "coding_tool_use_reference",
      lane: "code_patch",
      policy_file: "GHOSTCLAW/workers/kimi/kimi-worker.policy.yaml",
      vote_schema: "GHOSTCLAW/workers/kimi/kimi-reference-vote.schema.json",
      heartbeat_required: true,
      receipt_required: true,
      self_approval_allowed: false,
    });
    expect(worker.allowed_roles).toEqual(expect.arrayContaining([
      "coding_tool_use_reference",
      "coding_worker",
      "patch_planner",
      "test_planner",
      "moa_reference_vote_worker",
    ]));
    expect(worker.blocked_actions).toEqual(expect.arrayContaining([
      "model_download",
      "gpu_live_inference",
      "gpu_inference",
      "secret_access",
      "deploy",
      "push",
      "production_action",
      "live_provider_call",
      "self_approval",
    ]));
  });

  it("documents Kimi as a draft-only worker in the GhostClaw skill", async () => {
    const skill = await readText("skills/ghostclaw-agent-ghostclaws-thai-jarvis/SKILL.md");

    expect(skill).toContain("## 10. Kimi Worker Lane (Phase 7)");
    expect(skill).toContain("coding_tool_use_reference");
    expect(skill).toContain("patch_planner");
    expect(skill).toContain("test_planner");
    expect(skill).toContain("MoA reference vote worker");
    expect(skill).toContain("model_download");
    expect(skill).toContain("gpu_live_inference");
    expect(skill).toContain("live provider call");
  });
});
