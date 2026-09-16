import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  LAYERED_BUILD_STATUS_HOOK_STATES,
  createLayeredBuildStatusState,
  createLayeredBuildStatusViewModel,
  isLayeredBuildStatusEmpty,
  useLayeredBuildStatus,
} from "./use-layered-build-status.mjs";
import {
  LayeredBuildStatusClientError,
} from "../../lib/api/ghostclaw/layered-build-status-client.mjs";
import {
  mockLayeredBuildStatusResponse,
} from "../../lib/api/contracts/ghostclaw-layered-build-contract.mjs";

function createClock() {
  let tick = 0;
  return () => `2026-06-30T11:20:0${tick++}Z`;
}

function createClient(response) {
  const calls = [];
  return {
    calls,
    getStatus: async (query) => {
      calls.push(query);
      return response;
    },
  };
}

describe("use-layered-build-status", () => {
  it("starts in idle state without fetching or calling providers", () => {
    const client = createClient(mockLayeredBuildStatusResponse);
    const state = createLayeredBuildStatusState({ client, clock: createClock() });

    assert.equal(state.getSnapshot().status, LAYERED_BUILD_STATUS_HOOK_STATES.IDLE);
    assert.equal(client.calls.length, 0);
  });

  it("loads via the injected API client and exposes success view state", async () => {
    const client = createClient(mockLayeredBuildStatusResponse);
    const seen = [];
    const state = createLayeredBuildStatusState({ client, clock: createClock() });
    state.subscribe((snapshot) => seen.push(snapshot.status));

    const snapshot = await state.load({ includeReceipts: true, layer: "api_client" });

    assert.deepEqual(client.calls, [{ includeReceipts: true, layer: "api_client" }]);
    assert.deepEqual(seen, [
      LAYERED_BUILD_STATUS_HOOK_STATES.LOADING,
      LAYERED_BUILD_STATUS_HOOK_STATES.SUCCESS,
    ]);
    assert.equal(snapshot.status, LAYERED_BUILD_STATUS_HOOK_STATES.SUCCESS);
    assert.equal(snapshot.view.mission_id, "GC-MAXPLUS-GLM52-LAYERED-LOCK-20260630-001");
    assert.equal(snapshot.view.local_only, true);
  });

  it("returns an empty state when the response has no phase or receipt data", async () => {
    const emptyResponse = {
      ...mockLayeredBuildStatusResponse,
      phase_status: {},
      receipts: [],
    };
    const state = createLayeredBuildStatusState({
      client: createClient(emptyResponse),
      clock: createClock(),
    });

    const snapshot = await state.load();

    assert.equal(isLayeredBuildStatusEmpty(emptyResponse), true);
    assert.equal(snapshot.status, LAYERED_BUILD_STATUS_HOOK_STATES.EMPTY);
    assert.equal(snapshot.view.receipt_count, 0);
    assert.equal(snapshot.view.phase_count, 0);
  });

  it("normalizes client errors without exposing raw bodies or secrets", async () => {
    const state = createLayeredBuildStatusState({
      client: {
        getStatus: async () => {
          throw new LayeredBuildStatusClientError("Layered build status request returned an error.", {
            status: 503,
            body: { error: { code: "STATUS_UNAVAILABLE", message: "offline" } },
          });
        },
      },
      clock: createClock(),
    });

    const snapshot = await state.load();

    assert.equal(snapshot.status, LAYERED_BUILD_STATUS_HOOK_STATES.ERROR);
    assert.equal(snapshot.error.code, "STATUS_UNAVAILABLE");
    assert.equal(snapshot.error.status, 503);
    assert.deepEqual(Object.keys(snapshot.error), ["name", "message", "code", "status"]);
  });

  it("resets from populated state back to idle", async () => {
    const state = useLayeredBuildStatus({
      client: createClient(mockLayeredBuildStatusResponse),
      clock: createClock(),
    });

    await state.load();
    const reset = state.reset();

    assert.equal(reset.status, LAYERED_BUILD_STATUS_HOOK_STATES.IDLE);
    assert.equal(reset.data, null);
    assert.equal(reset.view, null);
  });

  it("creates a stable view model for components without route strings", () => {
    const view = createLayeredBuildStatusViewModel(mockLayeredBuildStatusResponse);

    assert.equal(view.current_packet_id, "P04-api-contract-freeze");
    assert.equal(view.next_packet_id, "P05-api-route-handler");
    assert.equal(view.blocked_action_count, mockLayeredBuildStatusResponse.blocked_actions.length);
    assert.equal(Object.values(view).includes("/api/ghostclaw/layered-build/status"), false);
  });
});
