import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readJson = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const readText = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

const latentManifest = readJson("../../.ghostclaw_runtime/latent/latent-manifest.json");
const controlManifest = readJson("../../.ghostclaw_runtime/latent/control-plane-manifest.json");
const kvGate = readJson("../../.ghostclaw_runtime/latent/kv-compatibility-gate.json");
const docText = readText("../../docs/knowledge/SIRINX_LATENTMAS_GHOSTCLAW_INTEGRATION.md");
const skillText = readText("../../skills/ghostclaw-agent-ghostclaws-thai-jarvis/SKILL.md");

describe("Phase 9 LatentMAS dual-plane contract", () => {
  it("locks JSON control plane as source of truth and latent plane as shadow-only", () => {
    expect(latentManifest.json_control_plane_source_of_truth).toBe(true);
    expect(latentManifest.latent_plane_shadow_only).toBe(true);
    expect(latentManifest.safety_policy_plane_final_authority).toBe(true);
    expect(latentManifest.kv_only_protocol_allowed).toBe(false);
    expect(controlManifest.json_control_plane_source_of_truth).toBe(true);
    expect(controlManifest.latent_plane_override_allowed).toBe(false);
    expect(controlManifest.moa_or_latent_score_override_allowed).toBe(false);
    expect(controlManifest.effective_score_cap).toBe(100);
  });

  it("locks exact KV compatibility and JSON fallback", () => {
    expect(kvGate.kv_required_field_count).toBe(12);
    expect(kvGate.required_fields).toHaveLength(12);
    expect(kvGate.exact_kv_compatibility_gate).toBe(true);
    expect(kvGate.backend_requirement).toBe("past_key_values");
    expect(kvGate.on_mismatch).toMatchObject({
      action: "fallback_to_json_text_brainstorm",
      log: "kv_mismatch",
      latent_bonus: 0
    });
    expect(kvGate.kv_only_protocol_allowed).toBe(false);
  });

  it("locks debug probe and live execution blocks", () => {
    expect(latentManifest.debug_probe_mode).toBe("parallel_text_probe");
    expect(latentManifest.decode_from_kv).toBe(false);
    expect(kvGate.debug_probe_mode).toBe("parallel_text_probe");
    expect(kvGate.decode_from_kv).toBe(false);
    expect(latentManifest.LATENTMAS_LIVE_ENABLED).toBe(false);
    expect(latentManifest.model_download_allowed).toBe(false);
    expect(latentManifest.gpu_live_inference_allowed).toBe(false);
    expect(latentManifest.provider_model_call_allowed).toBe(false);
    expect(latentManifest.secret_access_allowed).toBe(false);
  });

  it("documents Phase 9 in docs and skill without local benchmark claims", () => {
    for (const marker of [
      "json_control_plane_source_of_truth",
      "latent_plane_shadow_only",
      "safety_policy_plane_final_authority",
      "exact KV compatibility gate",
      "parallel_text_probe",
      "LATENTMAS_LIVE_ENABLED",
      "model_download_allowed",
      "gpu_live_inference_allowed"
    ]) {
      expect(docText).toContain(marker);
    }
    expect(docText).toContain("4.3x");
    expect(docText).toContain("83.7%");
    expect(docText).toContain("+13.3%");
    expect(skillText).toMatch(/phase_coverage:\s*"1-(10|11)"/);
    expect(skillText).toContain("json_control_plane_source_of_truth");
    expect(skillText).toContain("past_key_values");
    expect(skillText).toContain("parallel_text_probe");
    expect(skillText).toContain("model download, GPU live inference, live provider calls, and secret access remain blocked");
  });
});
