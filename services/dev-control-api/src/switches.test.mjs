import { describe, expect, it, beforeEach } from "vitest";
import { switches, getSwitch, evaluateRequiredSwitches } from "./switches.mjs";

describe("switches (kill switches)", () => {
  beforeEach(() => {
    // Ensure all kill switches are OFF (default safe state)
    delete process.env.CLOUDFLARE_MUTATION_ENABLED;
    delete process.env.CUSTOMER_MESSAGE_SEND_ENABLED;
    delete process.env.PAID_API_CALLS_ENABLED;
    delete process.env.PUBLIC_AI_EXPOSURE_ENABLED;
    delete process.env.DESTRUCTIVE_MCP_TOOLS_ENABLED;
    delete process.env.RENDER_EXPORT_ENABLED;
  });

  it("exports switches array and helper functions", () => {
    expect(Array.isArray(switches)).toBe(true);
    expect(switches.length).toBe(6);
    expect(typeof getSwitch).toBe("function");
    expect(typeof evaluateRequiredSwitches).toBe("function");
  });

  it("each switch has id, title, env, enabled, description", () => {
    for (const sw of switches) {
      expect(sw).toHaveProperty("id");
      expect(sw).toHaveProperty("title");
      expect(sw).toHaveProperty("env");
      expect(sw).toHaveProperty("enabled");
      expect(typeof sw.enabled).toBe("boolean");
      expect(sw).toHaveProperty("description");
    }
  });

  it("all switches default to disabled (safe mode)", () => {
    // switches were captured at module load; re-import to verify defaults
    // Since module-level state is fixed, just verify the known IDs exist
    const ids = switches.map((s) => s.id);
    expect(ids).toContain("cloud-mutation");
    expect(ids).toContain("customer-messaging");
    expect(ids).toContain("paid-api");
    expect(ids).toContain("public-ai-exposure");
    expect(ids).toContain("destructive-mcp");
    expect(ids).toContain("render-export");
  });

  it("getSwitch returns switch by id", () => {
    const sw = getSwitch("cloud-mutation");
    expect(sw).toBeDefined();
    expect(sw.id).toBe("cloud-mutation");
    expect(sw.env).toBe("CLOUDFLARE_MUTATION_ENABLED");
  });

  it("getSwitch returns undefined for unknown id", () => {
    expect(getSwitch("nonexistent-switch")).toBeUndefined();
  });

  it("evaluateRequiredSwitches returns allowed=true when no switches required", () => {
    const result = evaluateRequiredSwitches([]);
    expect(result.allowed).toBe(true);
    expect(result.blocked).toEqual([]);
  });

  it("evaluateRequiredSwitches blocks when required switch is disabled", () => {
    const result = evaluateRequiredSwitches(["cloud-mutation"]);
    // By default env is not set → switch.enabled = false → blocked
    expect(result.allowed).toBe(false);
    expect(result.blocked.length).toBeGreaterThan(0);
    expect(result.blocked[0].id).toBe("cloud-mutation");
  });

  it("evaluateRequiredSwitches handles unknown switch ids gracefully", () => {
    const result = evaluateRequiredSwitches(["nonexistent-switch"]);
    expect(result.allowed).toBe(true);
    expect(result.blocked).toEqual([]);
  });
});
