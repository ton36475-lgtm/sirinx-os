import { describe, expect, test } from "vitest";
import {
  GOD_MODE_LAYERS,
  GOD_MODE_QUEUE,
  GOD_MODE_R0_GATES,
  getGodModeLayer,
  getGodModeQueueSummary,
} from "./god-mode-master-os";

describe("god mode master os contract", () => {
  test("keeps the six-layer GhostClaws architecture visible", () => {
    expect(GOD_MODE_LAYERS).toHaveLength(6);
    expect(GOD_MODE_LAYERS.map((layer) => layer.id)).toEqual([
      "L0",
      "L1",
      "L2",
      "L3",
      "L4",
      "L5",
    ]);
    expect(getGodModeLayer("L1")?.status).toBe("blocked");
    expect(getGodModeLayer("L2")?.status).toBe("planned");
  });

  test("summarizes queue blockers without granting execution", () => {
    expect(GOD_MODE_QUEUE).toHaveLength(14);
    expect(getGodModeQueueSummary()).toEqual({
      total: 14,
      blocked: 2,
      r0Gated: 2,
    });
  });

  test("keeps R0 gates explicit and human-approval-only", () => {
    expect(GOD_MODE_R0_GATES).toHaveLength(5);
    expect(GOD_MODE_R0_GATES).toEqual(
      expect.arrayContaining([
        "git push - Agent Bridge v0.1.0",
        "GhostClaws Mission Control production deploy",
      ]),
    );
  });
});
