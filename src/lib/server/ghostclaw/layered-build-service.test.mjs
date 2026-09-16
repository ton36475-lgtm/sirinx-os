import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assertBackendServicePacket,
  buildServiceLogicReceiptDraft,
  canOpenNextLayer,
  classifyLayerScope,
  getPreviousLayer,
  isActionBlocked,
} from "./layered-build-service.mjs";

describe("layered-build-service", () => {
  it("blocks dangerous external or destructive actions", () => {
    assert.equal(isActionBlocked("git_push"), true);
    assert.equal(isActionBlocked("deploy"), true);
    assert.equal(isActionBlocked("provider_batch_calls"), true);
    assert.equal(isActionBlocked("read_or_print_secrets"), true);
    assert.equal(isActionBlocked("read_only_status"), false);
  });

  it("keeps backend service packets inside service-layer paths", () => {
    const result = assertBackendServicePacket([
      "src/lib/server/ghostclaw/layered-build-service.mjs",
      "src/lib/server/ghostclaw/layered-build-service.test.mjs",
    ]);

    assert.equal(result.ok, true);
    assert.deepEqual(result.blockingIssues, []);
  });

  it("rejects API, frontend, and page paths from backend service packets", () => {
    const result = assertBackendServicePacket([
      "src/lib/server/ghostclaw/layered-build-service.mjs",
      "src/api/ghostclaw/route.ts",
      "apps/centerbrain-shell/app/page.tsx",
      "components/Card.tsx",
    ]);

    assert.equal(result.ok, false);
    assert.equal(result.crossLayer.apiTouched, true);
    assert.equal(result.crossLayer.frontendOrPageTouched, true);
    assert.equal(result.blockingIssues.length, 3);
  });

  it("reports forbidden files for a layer without mutating inputs", () => {
    const result = classifyLayerScope(
      ["src/lib/server/ok.mjs", "src/app/api/not-yet.ts"],
      "backend_service_logic",
    );

    assert.equal(result.ok, false);
    assert.deepEqual(result.allowed, ["src/lib/server/ok.mjs"]);
    assert.deepEqual(result.forbidden, ["src/app/api/not-yet.ts"]);
  });

  it("opens the next layer only when receipt and review gates pass", () => {
    assert.deepEqual(canOpenNextLayer({
      currentLayer: "backend_service_logic",
      currentStatus: "review_pass",
      receiptExists: true,
      reviewStatus: "pass",
    }), {
      ok: true,
      nextLayer: "api_contract",
      requirements: {
        statusAllowsProgress: true,
        receiptExists: true,
        reviewAllowsProgress: true,
      },
    });

    assert.equal(canOpenNextLayer({
      currentLayer: "backend_service_logic",
      currentStatus: "ready_for_review",
      receiptExists: true,
      reviewStatus: "pending",
    }).ok, false);
  });

  it("builds a service receipt draft that keeps API contract closed", () => {
    const draft = buildServiceLogicReceiptDraft({
      missionId: "GC-MAXPLUS-GLM52-LAYERED-LOCK-20260630-001",
      packetId: "P03-backend-service-logic",
      filesChanged: ["src/lib/server/ghostclaw/layered-build-service.mjs"],
      validation: { node_test: { status: "pass" } },
    });

    assert.equal(draft.status, "ready_for_review");
    assert.equal(draft.next_packet_gate.next_packet_id, "P04-api-contract-freeze");
    assert.equal(draft.next_packet_gate.opened, false);
  });

  it("knows strict predecessor layers", () => {
    assert.equal(getPreviousLayer("backend_service_logic"), "backend_domain_schema");
    assert.equal(getPreviousLayer("observe_freeze"), null);
  });
});
