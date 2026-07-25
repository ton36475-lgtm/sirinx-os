import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  LAYERED_BUILD_STATUS_HOOK_STATES,
  createLayeredBuildStatusViewModel,
} from "../../hooks/ghostclaw/use-layered-build-status.mjs";
import {
  mockLayeredBuildStatusResponse,
} from "../../lib/api/contracts/ghostclaw-layered-build-contract.mjs";
import {
  createLayeredBuildStatusPanel,
  renderLayeredBuildStatusPanelText,
} from "./layered-build-status-panel.mjs";

function createSnapshot(status, overrides = {}) {
  return {
    status,
    data: overrides.data ?? null,
    error: overrides.error ?? null,
    view: overrides.view ?? null,
    updated_at: overrides.updated_at ?? "2026-06-30T11:30:00Z",
  };
}

describe("layered-build-status-panel", () => {
  it("renders a loading variant from hook snapshot props only", () => {
    const panel = createLayeredBuildStatusPanel(createSnapshot(LAYERED_BUILD_STATUS_HOOK_STATES.LOADING));

    assert.equal(panel.component, "LayeredBuildStatusPanel");
    assert.equal(panel.tone, "info");
    assert.equal(panel.badge, "Loading");
    assert.deepEqual(panel.metrics, []);
  });

  it("renders a success variant from the hook view model without fetching data", () => {
    const view = createLayeredBuildStatusViewModel(mockLayeredBuildStatusResponse);
    const panel = createLayeredBuildStatusPanel(createSnapshot(LAYERED_BUILD_STATUS_HOOK_STATES.SUCCESS, { view }), {
      actionLabel: "Open next packet",
    });

    assert.equal(panel.tone, "success");
    assert.equal(panel.metrics.find((metric) => metric.label === "Mission").value, "GC-MAXPLUS-GLM52-LAYERED-LOCK-20260630-001");
    assert.equal(panel.actions[0].label, "Open next packet");
    assert.equal(panel.actions[0].enabled, false);
    assert.equal(JSON.stringify(panel).includes("/api/ghostclaw/layered-build/status"), false);
  });

  it("renders an empty variant for empty hook state", () => {
    const panel = createLayeredBuildStatusPanel(createSnapshot(LAYERED_BUILD_STATUS_HOOK_STATES.EMPTY));

    assert.equal(panel.tone, "muted");
    assert.equal(panel.badge, "Empty");
    assert.equal(panel.summary, "No layered build status entries are available yet.");
  });

  it("renders a safe error variant without raw error bodies", () => {
    const panel = createLayeredBuildStatusPanel(createSnapshot(LAYERED_BUILD_STATUS_HOOK_STATES.ERROR, {
      error: {
        name: "LayeredBuildStatusClientError",
        message: "Layered build status request returned an error.",
        code: "STATUS_UNAVAILABLE",
        status: 503,
        raw_body: "do-not-render",
      },
    }));

    assert.equal(panel.tone, "danger");
    assert.equal(panel.badge, "STATUS_UNAVAILABLE");
    assert.equal(JSON.stringify(panel).includes("do-not-render"), false);
  });

  it("falls back to idle for an unloaded snapshot", () => {
    const panel = createLayeredBuildStatusPanel(createSnapshot(LAYERED_BUILD_STATUS_HOOK_STATES.IDLE));

    assert.equal(panel.tone, "neutral");
    assert.equal(panel.badge, "Idle");
  });

  it("validates props and renders a compact text fallback", () => {
    assert.throws(
      () => createLayeredBuildStatusPanel(null),
      /requires a hook snapshot object/,
    );

    const view = createLayeredBuildStatusViewModel(mockLayeredBuildStatusResponse);
    const panel = createLayeredBuildStatusPanel(createSnapshot(LAYERED_BUILD_STATUS_HOOK_STATES.SUCCESS, { view }), {
      title: "Layer Status",
    });
    const text = renderLayeredBuildStatusPanelText(panel);

    assert.equal(text.includes("Layer Status"), true);
    assert.equal(text.includes("Receipts:"), true);
  });
});
