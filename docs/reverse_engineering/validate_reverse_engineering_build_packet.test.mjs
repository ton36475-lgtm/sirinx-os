import { describe, expect, it } from "vitest";
import { validateReverseEngineeringPacket } from "./validate_reverse_engineering_build_packet.mjs";

describe("Reverse engineering Build Packet", () => {
  it("contains required phases, artifacts, and policy guards", async () => {
    const result = await validateReverseEngineeringPacket();
    expect(result.status).toBe("PASS");
    expect(result.failures).toEqual([]);
    expect(result.required_flow).toContain("Build_Packet");
  });
});
