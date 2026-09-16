import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createLayeredBuildStatusState,
} from "../../hooks/ghostclaw/use-layered-build-status.mjs";
import {
  mockLayeredBuildStatusResponse,
} from "../../lib/api/contracts/ghostclaw-layered-build-contract.mjs";
import {
  GHOSTCLAW_LAYERED_BUILD_STATUS_PAGE_ID,
  createGhostClawLayeredBuildStatusPage,
  createGhostClawLayeredBuildStatusPageRoute,
} from "./layered-build-status-page.mjs";

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

function createClock() {
  let tick = 0;
  return () => `2026-06-30T11:40:0${tick++}Z`;
}

describe("ghostclaw layered build status page", () => {
  it("renders one page shell in idle state without loading data", () => {
    const client = createClient(mockLayeredBuildStatusResponse);
    const state = createLayeredBuildStatusState({ client, clock: createClock() });
    const page = createGhostClawLayeredBuildStatusPage({ state });
    const model = page.render();

    assert.equal(model.page_id, GHOSTCLAW_LAYERED_BUILD_STATUS_PAGE_ID);
    assert.equal(model.sections.length, 1);
    assert.equal(model.sections[0].panel.status, "idle");
    assert.equal(client.calls.length, 0);
  });

  it("loads through the hook state and renders the component panel", async () => {
    const client = createClient(mockLayeredBuildStatusResponse);
    const state = createLayeredBuildStatusState({ client, clock: createClock() });
    const page = createGhostClawLayeredBuildStatusPage({ state });

    const model = await page.load({ includeReceipts: true, layer: "frontend_components" });

    assert.deepEqual(client.calls, [{ includeReceipts: true, layer: "frontend_components" }]);
    assert.equal(model.sections[0].component, "LayeredBuildStatusPanel");
    assert.equal(model.sections[0].panel.tone, "success");
    assert.equal(model.text_fallback.includes("Layered Build"), true);
  });

  it("keeps the page model local-only and one-page scoped", async () => {
    const client = createClient(mockLayeredBuildStatusResponse);
    const state = createLayeredBuildStatusState({ client, clock: createClock() });
    const page = createGhostClawLayeredBuildStatusPage({ state });

    const model = await page.load();

    assert.equal(model.page_gate.one_page_at_a_time, true);
    assert.equal(model.page_gate.cross_page_editing, false);
    assert.equal(JSON.stringify(model).includes("/api/ghostclaw/layered-build/status"), false);
  });

  it("exposes a page route adapter without fetching during construction", () => {
    const client = createClient(mockLayeredBuildStatusResponse);
    const state = createLayeredBuildStatusState({ client, clock: createClock() });
    const route = createGhostClawLayeredBuildStatusPageRoute({ state });

    assert.equal(route.page_id, GHOSTCLAW_LAYERED_BUILD_STATUS_PAGE_ID);
    assert.equal(typeof route.render, "function");
    assert.equal(typeof route.load, "function");
    assert.equal(client.calls.length, 0);
  });

  it("propagates empty state through the page panel", async () => {
    const emptyResponse = {
      ...mockLayeredBuildStatusResponse,
      phase_status: {},
      receipts: [],
    };
    const state = createLayeredBuildStatusState({
      client: createClient(emptyResponse),
      clock: createClock(),
    });
    const page = createGhostClawLayeredBuildStatusPage({ state });

    const model = await page.load();

    assert.equal(model.sections[0].panel.status, "empty");
    assert.equal(model.sections[0].panel.badge, "Empty");
  });

  it("propagates safe error state through the page panel", async () => {
    const state = createLayeredBuildStatusState({
      client: {
        getStatus: async () => {
          throw new Error("local status unavailable");
        },
      },
      clock: createClock(),
    });
    const page = createGhostClawLayeredBuildStatusPage({ state });

    const model = await page.load();

    assert.equal(model.sections[0].panel.status, "error");
    assert.equal(model.sections[0].panel.tone, "danger");
    assert.equal(JSON.stringify(model).includes("stack"), false);
  });
});
