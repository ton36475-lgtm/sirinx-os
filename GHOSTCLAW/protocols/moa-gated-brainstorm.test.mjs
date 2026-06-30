import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readText = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const schema = JSON.parse(readText("./a2a2a-message-schema.json"));
const policyText = readText("./brainstorm-terminology-policy.yaml");
const protocolText = readText("./A2A2A_PROTOCOL.md");
const teamText = readFileSync(new URL("../../docs/knowledge/GHOSTCLAWS_SUB_AGENT_TEAM.md", import.meta.url), "utf8");
const moaDocText = readFileSync(new URL("../../docs/knowledge/MOA_GATED_BRAINSTORM.md", import.meta.url), "utf8");
const skillText = readFileSync(
  new URL("../../skills/ghostclaw-agent-ghostclaws-thai-jarvis/SKILL.md", import.meta.url),
  "utf8"
);

describe("Phase 8 MoA-gated brainstorm contract", () => {
  it("requires the three reference lanes and Hermes aggregator metadata", () => {
    const referenceVotes = schema.properties.moa_summary.properties.reference_votes;
    expect(referenceVotes.required).toEqual([
      "ref_A_safety_risk",
      "ref_B_speed_cost",
      "ref_C_correctness_proof"
    ]);
    expect(referenceVotes.properties.ref_A_safety_risk.description).toContain("hard veto");
    expect(schema.properties.moa_summary.properties.hermes_aggregator.properties.agent.const).toBe("hermes");
    expect(schema.properties.moa_summary.properties.hermes_aggregator.properties.consensus_threshold).toMatchObject({
      type: "number",
      minimum: 0,
      maximum: 1
    });
    expect(schema.properties.moa_summary.properties.hermes_aggregator.properties.aggregator_certainty).toMatchObject({
      type: "number",
      minimum: 0,
      maximum: 1
    });
  });

  it("locks MoA score to confidence-only and blocks policy override or recursion", () => {
    const summary = schema.properties.moa_summary.properties;
    const gated = schema.properties.moa_gated_brainstorm.properties;
    expect(summary.moa_score_is_confidence_signal_only.const).toBe(true);
    expect(summary.policy_gate_override_allowed.const).toBe(false);
    expect(summary.recursive_moa_launch_allowed.const).toBe(false);
    expect(gated.safety_disagreement_hard_veto.const).toBe(true);
    expect(gated.policy_gate_final_authority.const).toBe(true);
    expect(gated.moa_score_authorizes_action.const).toBe(false);
    expect(gated.recursive_moa_launch_allowed.const).toBe(false);
  });

  it("documents hard veto and policy authority in protocol and knowledge docs", () => {
    for (const marker of [
      "ref_A_safety_risk",
      "ref_B_speed_cost",
      "ref_C_correctness_proof",
      "aggregator: hermes",
      "consensus_threshold: 0.67",
      "moa_score_confidence_signal_only: true",
      "policy_gate_override_allowed: false",
      "recursive_moa_launch_allowed: false"
    ]) {
      expect(policyText).toContain(marker);
    }
    expect(protocolText).toContain("MoA-Gated Brainstorm Contract");
    expect(protocolText).toContain("MoA-gated brainstorm is a review gate, not an execution authority");
    expect(protocolText).toContain("A safety disagreement from `ref_A_safety_risk` is a hard veto");
    expect(teamText).toContain("Consensus threshold");
    expect(teamText).toContain("MoA cannot override the policy gate");
    expect(moaDocText).toContain("never overrides the policy gate");
    expect(moaDocText).toContain("safety_disagreement_hard_veto");
  });

  it("documents Phase 8 in the GhostClaw skill", () => {
    expect(skillText).toMatch(/phase_coverage:\s*"1-(8|9|10)"/);
    expect(skillText).toContain("ref_A_safety_risk");
    expect(skillText).toContain("ref_B_speed_cost");
    expect(skillText).toContain("ref_C_correctness_proof");
    expect(skillText).toContain("policy_gate_override_allowed");
    expect(skillText).toContain("recursive_moa_launch_allowed");
  });
});
