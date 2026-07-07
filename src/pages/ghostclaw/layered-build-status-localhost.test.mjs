import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createLayeredBuildStatusLocalhostModel,
  localhostUatStatusResponse,
  renderLayeredBuildStatusLocalhostHtml,
} from "./layered-build-status-localhost.mjs";

describe("layered-build-status-localhost", () => {
  it("creates a local-only page model without calling a live API", async () => {
    const model = await createLayeredBuildStatusLocalhostModel();

    assert.equal(model.page_id, "ghostclaw-layered-build-status");
    assert.equal(model.sections[0].panel.status, "success");
    assert.equal(model.sections[0].panel.metrics.length > 0, true);
    assert.equal(model.sections[0].panel.actions[0].enabled, false);
  });

  it("renders deterministic UAT selectors for headless Chrome checks", async () => {
    const model = await createLayeredBuildStatusLocalhostModel();
    const html = renderLayeredBuildStatusLocalhostHtml(model);

    assert.equal(html.includes('data-uat-page="ghostclaw-layered-build-status"'), true);
    assert.equal(html.includes('data-uat-panel="LayeredBuildStatusPanel"'), true);
    assert.equal(html.includes('data-uat-status="success"'), true);
  });

  it("keeps the localhost mount on one page and without route duplication", async () => {
    const model = await createLayeredBuildStatusLocalhostModel();
    const html = renderLayeredBuildStatusLocalhostHtml(model);

    assert.equal(model.page_gate.one_page_at_a_time, true);
    assert.equal(model.page_gate.cross_page_editing, false);
    assert.equal(html.includes("/api/ghostclaw/layered-build/status"), false);
  });

  it("uses review warning data for the current packet fixture", () => {
    assert.equal(localhostUatStatusResponse.current_packet.packet_id, "P11-review-validation");
    assert.equal(localhostUatStatusResponse.current_packet.status, "review_warn");
    assert.equal(localhostUatStatusResponse.next_packet_gate.opened, false);
  });
});
