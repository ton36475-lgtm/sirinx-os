import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  mockLayeredBuildStatusResponse,
} from "../contracts/ghostclaw-layered-build-contract.mjs";
import {
  LayeredBuildStatusClientError,
  createLayeredBuildStatusClient,
  createMockLayeredBuildStatusClient,
} from "./layered-build-status-client.mjs";

function createJsonResponse(body, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    json: async () => body,
  };
}

describe("layered-build-status-client", () => {
  it("builds URLs from the frozen route path without duplicating route strings in callers", () => {
    const client = createLayeredBuildStatusClient({
      baseUrl: "http://127.0.0.1:8711/",
      fetchImpl: async () => createJsonResponse(mockLayeredBuildStatusResponse),
    });

    assert.equal(
      client.buildUrl({ includeReceipts: true, layer: "api_route_handler" }),
      "http://127.0.0.1:8711/api/ghostclaw/layered-build/status?include_receipts=true&layer=api_route_handler",
    );
  });

  it("fetches and validates the frozen status response contract", async () => {
    const calls = [];
    const client = createLayeredBuildStatusClient({
      fetchImpl: async (url, init) => {
        calls.push({ url, init });
        return createJsonResponse(mockLayeredBuildStatusResponse);
      },
    });

    const response = await client.getStatus();

    assert.equal(response.local_only, true);
    assert.equal(calls[0].url, "/api/ghostclaw/layered-build/status");
    assert.equal(calls[0].init.method, "GET");
    assert.equal(calls[0].init.headers.accept, "application/json");
  });

  it("throws a typed client error when the response violates the contract", async () => {
    const client = createLayeredBuildStatusClient({
      fetchImpl: async () => createJsonResponse({
        ...mockLayeredBuildStatusResponse,
        local_only: false,
      }),
    });

    await assert.rejects(
      () => client.getStatus(),
      (error) => {
        assert.equal(error instanceof LayeredBuildStatusClientError, true);
        assert.equal(error.details.code, "CONTRACT_VIOLATION");
        return true;
      },
    );
  });

  it("normalizes route error bodies without exposing secrets or raw logs", async () => {
    const errorBody = {
      error: {
        code: "POLICY_BLOCKED",
        message: "Only read-only GET status requests are allowed.",
        details: { method: "POST" },
        request_id: null,
      },
    };
    const client = createLayeredBuildStatusClient({
      fetchImpl: async () => createJsonResponse(errorBody, { ok: false, status: 403 }),
    });

    await assert.rejects(
      () => client.getStatus(),
      (error) => {
        assert.equal(error.details.status, 403);
        assert.equal(error.details.body.error.code, "POLICY_BLOCKED");
        assert.deepEqual(Object.keys(error.details.body.error), ["code", "message", "details", "request_id"]);
        return true;
      },
    );
  });

  it("supports explicit local mock fallback when no fetch implementation is available", async () => {
    const client = createLayeredBuildStatusClient({
      fetchImpl: null,
      allowMockFallback: true,
    });

    const response = await client.getStatus();
    assert.equal(response.mission_id, "GC-MAXPLUS-GLM52-LAYERED-LOCK-20260630-001");
    assert.equal(response.local_only, true);
  });

  it("provides a mock client for UI and hook packets without network calls", async () => {
    const client = createMockLayeredBuildStatusClient();
    const response = await client.getStatus();

    assert.equal(client.buildUrl(), "/api/ghostclaw/layered-build/status");
    assert.equal(response.current_packet.packet_id, "P04-api-contract-freeze");
  });
});
