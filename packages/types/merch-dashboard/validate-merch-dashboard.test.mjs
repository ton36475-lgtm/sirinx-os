import { describe, expect, it } from "vitest";
import { validateMerchDashboard } from "./validate-merch-dashboard.mjs";

describe("Merch dashboard local pack", () => {
  it("validates the local-only dashboard and schemas", async () => {
    const result = await validateMerchDashboard();

    expect(result.status).toBe("PASS");
    expect(result.expected_tables).toContain("ip_policy_checks");
    expect(result.workflow_active).toBe(false);
  });

  it("keeps QC and prompt pack useful enough for owner review", async () => {
    const result = await validateMerchDashboard();

    expect(result.qc_count).toBeGreaterThanOrEqual(10);
    expect(result.prompt_template_count).toBeGreaterThanOrEqual(4);
  });
});
