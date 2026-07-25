import { describe, expect, it } from "vitest";
import { handleRequest } from "../server.mjs";

function createResponseRecorder() {
  const response = {
    statusCode: null,
    headers: null,
    body: "",
    writeHead(statusCode, headers) {
      this.statusCode = statusCode;
      this.headers = headers;
    },
    end(body = "") {
      this.body = String(body);
    }
  };
  return response;
}

async function callRoute(url) {
  const request = {
    method: "GET",
    url,
    headers: {
      origin: "http://localhost:8710"
    }
  };
  const response = createResponseRecorder();
  await handleRequest(request, response);
  return {
    statusCode: response.statusCode,
    headers: response.headers,
    body: JSON.parse(response.body)
  };
}

describe("GhostClaw control-plane status API route", () => {
  it("serves the P103/P104 contract through the local API route without opening live actions", async () => {
    const result = await callRoute("/api/ghostclaw/control-plane/status?include_receipts=true");

    expect(result.statusCode).toBe(200);
    expect(result.headers["cache-control"]).toBe("no-store");
    expect(result.body.contract_id).toBe("ghostclaw-control-plane-status-v1");
    expect(result.body.mode).toBe("read_only_control_plane_status");
    expect(result.body.dry_run).toBe(true);
    expect(result.body.live_execution).toBe(false);
    expect(result.body.receipts.length).toBeGreaterThan(0);
    expect(result.body.guardrails).toMatchObject({
      read_only: true,
      worker_execution: false,
      live_telegram_send: false,
      provider_call: false,
      secret_read: false,
      install: false,
      push: false,
      deploy: false,
      cloudflare_r2_mutation: false,
      database_migration: false
    });
  });

  it("passes query parameters to the read-only status layer", async () => {
    const result = await callRoute(
      "/api/ghostclaw/control-plane/status?project=agm-autoflow&include_receipts=true&include_paths=false&limit=1"
    );

    expect(result.statusCode).toBe(200);
    expect(result.body.projects.map((project) => project.slug)).toEqual(["agm-autoflow"]);
    expect(result.body.receipts).toHaveLength(1);
    expect(result.body.receipts[0].artifact_path).toBeNull();
    expect(result.body.packets.every((packet) => packet.live_execution === false)).toBe(true);
  });

  it("returns a local-safe INVALID_QUERY response for malformed query flags", async () => {
    const result = await callRoute("/api/ghostclaw/control-plane/status?include_receipts=maybe");

    expect(result.statusCode).toBe(400);
    expect(result.body.error.code).toBe("INVALID_QUERY");
  });
});
