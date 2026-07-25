import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  LAYERED_BUILD_ERROR_CODES,
  createLayeredBuildContractError,
  createLayeredBuildStatusResponse,
  layeredBuildStatusContract,
  mockLayeredBuildStatusResponse,
  validateLayeredBuildStatusResponse,
} from "./ghostclaw-layered-build-contract.mjs";

describe("ghostclaw-layered-build-contract", () => {
  it("freezes the read-only status route before route implementation", () => {
    assert.equal(layeredBuildStatusContract.route.method, "GET");
    assert.equal(layeredBuildStatusContract.route.path, "/api/ghostclaw/layered-build/status");
    assert.equal(layeredBuildStatusContract.errors[403], "POLICY_BLOCKED");
  });

  it("accepts the frozen mock response", () => {
    const result = validateLayeredBuildStatusResponse(mockLayeredBuildStatusResponse);
    assert.equal(result.ok, true);
    assert.deepEqual(result.issues, []);
  });

  it("rejects responses with unknown layers or non-local output", () => {
    const result = validateLayeredBuildStatusResponse({
      ...mockLayeredBuildStatusResponse,
      current_packet: {
        ...mockLayeredBuildStatusResponse.current_packet,
        layer: "frontend_pages",
        status: "unknown",
      },
      local_only: false,
    });

    assert.equal(result.ok, false);
    assert.ok(result.issues.includes("current_packet.status is not an allowed packet status"));
    assert.ok(result.issues.includes("local_only must be true"));
  });

  it("creates validated status responses for the future route handler", () => {
    const response = createLayeredBuildStatusResponse({
      mission: {
        mission_id: "GC-MAXPLUS-GLM52-LAYERED-LOCK-20260630-001",
        mission_name: "MAXPLUS_GLM52_SAFE_HARNESS_LAYERED_BUILD_LOCK_V8",
        mode: "full_auto_safe_local_layered_sequence",
      },
      currentPacket: mockLayeredBuildStatusResponse.current_packet,
      phaseStatus: mockLayeredBuildStatusResponse.phase_status,
      nextPacketGate: mockLayeredBuildStatusResponse.next_packet_gate,
      blockedActions: mockLayeredBuildStatusResponse.blocked_actions,
      receipts: mockLayeredBuildStatusResponse.receipts,
      updatedAt: "2026-06-30T10:44:14Z",
    });

    assert.equal(response.local_only, true);
    assert.equal(response.current_packet.packet_id, "P04-api-contract-freeze");
  });

  it("normalizes unknown errors into the contract violation shape", () => {
    const error = createLayeredBuildContractError("OTHER", "Bad contract", { field: "status" });

    assert.deepEqual(error, {
      error: {
        code: LAYERED_BUILD_ERROR_CODES.CONTRACT_VIOLATION,
        message: "Bad contract",
        details: { field: "status" },
        request_id: null,
      },
    });
  });
});
