import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { validateLayeredBuildStatusResponse } from "../../lib/api/contracts/ghostclaw-layered-build-contract.mjs";
import {
  handleLayeredBuildStatusRequest,
  layeredBuildStatusRoute,
} from "./layered-build-status-route.mjs";

const baseMissionState = Object.freeze({
  mission: Object.freeze({
    mission_id: "GC-MAXPLUS-GLM52-LAYERED-LOCK-20260630-001",
    mission_name: "MAXPLUS_GLM52_SAFE_HARNESS_LAYERED_BUILD_LOCK_V8",
    mode: "full_auto_safe_local_layered_sequence",
  }),
  phase_status: Object.freeze({
    api_contract_freeze: "review_pass",
    api_route_handler: "leased",
    api_client_wiring: "blocked",
  }),
  current_packet: Object.freeze({
    packet_id: "P04-api-contract-freeze",
    layer: "api_contract",
    status: "review_pass",
    active_file_lease: ".ghostclaw_runtime/a2a2a/locks/P04-api-contract-freeze.lease.json",
    packet_receipt: ".ghostclaw_runtime/a2a2a/receipts/P04-api-contract-freeze.receipt.json",
  }),
  blocked_actions: Object.freeze([
    "git_push",
    "deploy",
    "install_dependencies",
    "read_or_print_secrets",
  ]),
});

describe("layered-build-status-route", () => {
  it("matches the frozen contract route", () => {
    assert.equal(layeredBuildStatusRoute.method, "GET");
    assert.equal(layeredBuildStatusRoute.path, "/api/ghostclaw/layered-build/status");
  });

  it("returns a contract-valid read-only status response", () => {
    const response = handleLayeredBuildStatusRequest({
      method: "GET",
      missionState: baseMissionState,
      updatedAt: "2026-06-30T10:57:26Z",
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.local_only, true);
    assert.equal(response.body.next_packet_gate.next_packet_id, "P05-api-route-handler");
    assert.equal(response.body.next_packet_gate.allowed_by_review_gate, true);
    assert.equal(response.body.next_packet_gate.opened, false);
    assert.deepEqual(response.body.receipts, []);
    assert.equal(validateLayeredBuildStatusResponse(response.body).ok, true);
  });

  it("includes receipt paths only when explicitly requested", () => {
    const response = handleLayeredBuildStatusRequest({
      method: "GET",
      query: { include_receipts: "true" },
      missionState: baseMissionState,
      receipts: [
        {
          packet_id: "P03-backend-service-logic",
          path: ".ghostclaw_runtime/a2a2a/receipts/P03-backend-service-logic.receipt.json",
          status: "review_pass",
          extra: "not included",
        },
      ],
      updatedAt: "2026-06-30T10:57:26Z",
    });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body.receipts, [
      {
        packet_id: "P03-backend-service-logic",
        path: ".ghostclaw_runtime/a2a2a/receipts/P03-backend-service-logic.receipt.json",
        status: "review_pass",
      },
      {
        packet_id: "P04-api-contract-freeze",
        path: ".ghostclaw_runtime/a2a2a/receipts/P04-api-contract-freeze.receipt.json",
        status: "review_pass",
      },
    ]);
  });

  it("filters phase status by layer query without changing the gate", () => {
    const response = handleLayeredBuildStatusRequest({
      method: "GET",
      query: { layer: "api_contract" },
      missionState: baseMissionState,
      updatedAt: "2026-06-30T10:57:26Z",
    });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body.phase_status, { api_contract_freeze: "review_pass" });
    assert.equal(response.body.next_packet_gate.next_packet_id, "P05-api-route-handler");
  });

  it("normalizes invalid query and non-GET requests into contract errors", () => {
    const invalidLayer = handleLayeredBuildStatusRequest({
      method: "GET",
      query: { layer: "frontend_now" },
      missionState: baseMissionState,
    });
    const unsafeMethod = handleLayeredBuildStatusRequest({
      method: "POST",
      missionState: baseMissionState,
    });

    assert.equal(invalidLayer.status, 400);
    assert.equal(invalidLayer.body.error.code, "INVALID_QUERY");
    assert.equal(unsafeMethod.status, 403);
    assert.equal(unsafeMethod.body.error.code, "POLICY_BLOCKED");
  });

  it("uses the backend service gate and keeps the next layer closed when review is pending", () => {
    const response = handleLayeredBuildStatusRequest({
      method: "GET",
      missionState: {
        ...baseMissionState,
        current_packet: {
          ...baseMissionState.current_packet,
          status: "ready_for_review",
        },
      },
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.next_packet_gate.allowed_by_review_gate, false);
    assert.equal(response.body.next_packet_gate.opened, false);
    assert.equal(response.body.next_packet_gate.requirements.reviewAllowsProgress, false);
  });
});
