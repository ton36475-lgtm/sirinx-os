import { spawn } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createLocalRagQueryDryRun, createLocalRagScanDryRun, getLocalRagStatus } from "./local-rag.mjs";

const fixedNow = () => new Date("2026-05-26T07:00:00.000Z");

describe("Local RAG prototype", () => {
  let repoRoot;

  beforeAll(async () => {
    repoRoot = await mkdtemp(join(tmpdir(), "sirinx-local-rag-"));
    await mkdir(join(repoRoot, "docs/knowledge"), { recursive: true });
    await mkdir(join(repoRoot, "apps/dev-dashboard/src"), { recursive: true });
    await mkdir(join(repoRoot, "node_modules/pkg"), { recursive: true });
    await mkdir(join(repoRoot, "dist"), { recursive: true });

    await writeFile(
      join(repoRoot, "docs/knowledge/gateway.md"),
      "Gateway Agent approval packet center keeps local RAG evidence and provenance safe.\n"
    );
    await writeFile(
      join(repoRoot, "apps/dev-dashboard/src/app.js"),
      "export const dashboard = 'Mission Control local RAG panel';\n"
    );
    await writeFile(join(repoRoot, "docs/knowledge/unsafe.md"), "OPENAI_API_KEY=sk-test-secret\n");
    await writeFile(join(repoRoot, ".env"), "SUPABASE_SERVICE_ROLE_KEY=secret\n");
    await writeFile(join(repoRoot, "node_modules/pkg/index.js"), "module.exports = 'ignore';\n");
    await writeFile(join(repoRoot, "dist/bundle.js"), "console.log('ignore build output');\n");
  });

  afterAll(async () => {
    await rm(repoRoot, { force: true, recursive: true });
  });

  it("reports a locked local-only RAG contract with optional turbovec status", async () => {
    const status = await getLocalRagStatus({
      now: fixedNow,
      projectRoot: repoRoot,
      turbovecStatus: { status: "missing", package: "turbovec", optional: true }
    });

    expect(status.status).toBe("local-rag-prototype-ready");
    expect(status.mode).toBe("local-only-rag-prototype");
    expect(status.corpusScope.id).toBe("full-repo-safe-text");
    expect(status.summary).toMatchObject({
      corpusScope: "full-repo-safe-text",
      canCallPaidApi: false,
      canRunMcp: false,
      canReadSecrets: false
    });
    expect(status.dependency.turbovec.status).toBe("missing");
    expect(status.externalWrites).toBe(false);
    expect(status.canCallPaidApi).toBe(false);
    expect(status.canActivateConnector).toBe(false);
    expect(status.canRunMcp).toBe(false);
    expect(status.canReadSecrets).toBe(false);
    expect(status.canDeploy).toBe(false);
    expect(status.canPublish).toBe(false);
    expect(status.stopPoint).toBe("LOCAL RAG PROTOTYPE READY - WAITING FOR HUMAN APPROVAL");
  });

  it("dry-runs a full repo safe-text scan while excluding secrets and generated folders", async () => {
    const scan = await createLocalRagScanDryRun(
      {
        requestId: "local-rag-scan-test",
        source: "vitest"
      },
      {
        now: fixedNow,
        projectRoot: repoRoot,
        turbovecStatus: { status: "missing", package: "turbovec", optional: true }
      }
    );

    expect(scan.status).toBe("dry-run-local-rag-scan-ready");
    expect(scan.requestId).toBe("local-rag-scan-test");
    expect(scan.summary.filesIndexed).toBe(2);
    expect(scan.summary.secretLikeFilesBlocked).toBe(1);
    expect(scan.summary.generatedOrDependencyPathsBlocked).toBeGreaterThanOrEqual(2);
    expect(scan.documents.map((document) => document.relativePath).sort()).toEqual([
      "apps/dev-dashboard/src/app.js",
      "docs/knowledge/gateway.md"
    ]);
    expect(JSON.stringify(scan)).not.toContain("sk-test-secret");
    expect(JSON.stringify(scan)).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(scan.externalWrites).toBe(false);
    expect(scan.canCallPaidApi).toBe(false);
    expect(scan.canRunMcp).toBe(false);
    expect(scan.canReadSecrets).toBe(false);
  });

  it("queries deterministic local fixture embeddings without external calls", async () => {
    const result = await createLocalRagQueryDryRun(
      {
        requestId: "local-rag-query-test",
        query: "gateway approval evidence",
        source: "vitest"
      },
      {
        now: fixedNow,
        projectRoot: repoRoot,
        turbovecStatus: { status: "missing", package: "turbovec", optional: true }
      }
    );

    expect(result.status).toBe("dry-run-local-rag-query-ready");
    expect(result.requestId).toBe("local-rag-query-test");
    expect(result.embeddingBackend).toBe("deterministic-local-fixture");
    expect(result.topResults[0].relativePath).toBe("docs/knowledge/gateway.md");
    expect(result.topResults[0].score).toBeGreaterThan(0);
    expect(result.externalWrites).toBe(false);
    expect(result.canCallPaidApi).toBe(false);
    expect(result.canRunMcp).toBe(false);
    expect(result.stopPoint).toBe("LOCAL RAG QUERY DRY-RUN COMPLETE - WAITING FOR HUMAN APPROVAL");
  });
});

describe("Local RAG API routes", () => {
  const port = 19200 + Math.floor(Math.random() * 1000);
  const baseUrl = `http://127.0.0.1:${port}`;
  let server;
  let repoRoot;

  beforeAll(async () => {
    repoRoot = await mkdtemp(join(tmpdir(), "sirinx-local-rag-api-"));
    await mkdir(join(repoRoot, "docs/knowledge"), { recursive: true });
    await writeFile(join(repoRoot, "docs/knowledge/api.md"), "Local RAG API evidence packet.\n");

    server = spawn("node", ["services/dev-control-api/server.mjs"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DEV_CONTROL_API_PORT: String(port),
        DEV_CONTROL_API_HOST: "127.0.0.1",
        SIRINX_PROJECT_ROOT: repoRoot,
        SIRINX_RAG_SKIP_TURBOVEC_CHECK: "1"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    await waitForServer(`${baseUrl}/api/local-rag`);
  }, 10000);

  afterAll(async () => {
    if (server && !server.killed) {
      server.kill("SIGTERM");
    }
    await rm(repoRoot, { force: true, recursive: true });
  });

  it("serves local RAG status over the local API", async () => {
    const response = await fetch(`${baseUrl}/api/local-rag`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("local-rag-prototype-ready");
    expect(body.mode).toBe("local-only-rag-prototype");
    expect(body.externalWrites).toBe(false);
    expect(body.canCallPaidApi).toBe(false);
  });

  it("fails closed on invalid local RAG query dry-run JSON", async () => {
    const response = await fetch(`${baseUrl}/api/local-rag/query/dry-run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{invalid-json"
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      status: "invalid_local_rag_query_request",
      externalWrites: false,
      productionWrites: false,
      customerVisible: false,
      canCallPaidApi: false,
      canActivateConnector: false,
      canRunMcp: false,
      canReadSecrets: false,
      requiresHumanApproval: true
    });
  });
});

async function waitForServer(url) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 8000) {
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  throw new Error(`server did not start for ${url}`);
}
