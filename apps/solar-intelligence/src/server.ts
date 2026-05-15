import { createServer } from "node:http";
import {
  buildCompetitorIntelligence,
  buildCustomerUsageProfile,
  buildLoadBreakdown,
  designCommercialBessSystem,
  generateCommercialQuotation,
  generateSolarProposal,
  systemSizeBands
} from "./domain/index.js";
import { buildCommercialBessProjectFromPayload, buildCustomerIntakeFromPayload } from "./domain/intake-builders.js";
import {
  syncCommercialBessToObsidian,
  syncCompetitorIntelligenceToObsidian,
  syncProposalToObsidian,
  syncQuotationToObsidian
} from "./obsidian/markdown.js";
import { listProjectRecords, saveProjectRecord, type StoredProjectRecord } from "./storage/project-store.js";
import { renderPage } from "./ui/page.js";
import { renderQuotationDocument } from "./ui/quotation-document.js";

const host = process.env.SOLAR_INTEL_HOST || "127.0.0.1";
const port = Number(process.env.SOLAR_INTEL_PORT || 8720);

function sendJson(response: import("node:http").ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(JSON.stringify(body, null, 2));
}

function sendHtml(response: import("node:http").ServerResponse, body: string): void {
  response.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(body);
}

async function readJson(request: import("node:http").IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function quoteFromPayload(payload: unknown) {
  const body = asObject(payload);
  const customer = buildCustomerIntakeFromPayload(body.customer ?? body.solar ?? body);
  const proposal = generateSolarProposal(customer);
  const ciProject = buildCommercialBessProjectFromPayload(body.project ?? body.ci ?? body);
  const ciBess = designCommercialBessSystem(ciProject);
  const usage = buildCustomerUsageProfile(body.usage ?? body);
  const options = asObject(body.options ?? body.quotation ?? body);
  return generateCommercialQuotation(proposal, ciBess, usage, options);
}

function storedKind(value: unknown): StoredProjectRecord["kind"] {
  if (
    value === "ci-bess" ||
    value === "usage-profile" ||
    value === "quotation" ||
    value === "competitor-intelligence" ||
    value === "solar-proposal"
  ) {
    return value;
  }
  return "solar-proposal";
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${host}:${port}`);

  try {
    if (request.method === "GET" && url.pathname === "/health") {
      sendJson(response, 200, {
        status: "ok",
        service: "solar-energy-intelligence",
        mode: "local-phase-1"
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/proposal") {
      sendJson(response, 200, generateSolarProposal());
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/proposal") {
      const customer = buildCustomerIntakeFromPayload(await readJson(request));
      sendJson(response, 200, generateSolarProposal(customer));
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/ci-bess") {
      sendJson(response, 200, designCommercialBessSystem());
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/ci-bess") {
      const project = buildCommercialBessProjectFromPayload(await readJson(request));
      sendJson(response, 200, designCommercialBessSystem(project));
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/load-taxonomy") {
      sendJson(response, 200, {
        sizeBands: systemSizeBands,
        breakdown: buildLoadBreakdown()
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/load-taxonomy") {
      const project = buildCommercialBessProjectFromPayload(await readJson(request));
      sendJson(response, 200, {
        sizeBands: systemSizeBands,
        breakdown: buildLoadBreakdown(project)
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/usage-profile") {
      sendJson(response, 200, buildCustomerUsageProfile());
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/usage-profile") {
      sendJson(response, 200, buildCustomerUsageProfile(await readJson(request)));
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/quotation") {
      sendJson(response, 200, generateCommercialQuotation());
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/quotation") {
      sendJson(response, 200, quoteFromPayload(await readJson(request)));
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/competitor-intelligence") {
      sendJson(response, 200, buildCompetitorIntelligence());
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/obsidian/sync") {
      const payload = await readJson(request);
      const customer = buildCustomerIntakeFromPayload(payload);
      const proposal = generateSolarProposal(customer);
      const files = await syncProposalToObsidian(proposal);
      sendJson(response, 200, { ok: true, files });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/ci-bess/obsidian/sync") {
      const project = buildCommercialBessProjectFromPayload(await readJson(request));
      const design = designCommercialBessSystem(project);
      const files = await syncCommercialBessToObsidian(design);
      sendJson(response, 200, { ok: true, files });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/quotation/obsidian/sync") {
      const quote = quoteFromPayload(await readJson(request));
      const files = await syncQuotationToObsidian(quote);
      sendJson(response, 200, { ok: true, files, quotationNo: quote.quotationNo });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/competitor-intelligence/obsidian/sync") {
      const files = await syncCompetitorIntelligenceToObsidian(buildCompetitorIntelligence());
      sendJson(response, 200, { ok: true, files });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/projects") {
      sendJson(response, 200, { projects: await listProjectRecords() });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/projects") {
      const body = await readJson(request);
      const record = asObject(body);
      const kind = storedKind(record.kind);
      const name = typeof record.name === "string" ? record.name : "untitled";
      const saved = await saveProjectRecord({
        kind,
        name,
        payload: record.payload ?? {},
        result: record.result ?? {}
      });
      sendJson(response, 200, { ok: true, ...saved });
      return;
    }

    if (request.method === "GET" && url.pathname === "/quotation") {
      sendHtml(response, renderQuotationDocument(generateCommercialQuotation()));
      return;
    }

    if (request.method === "GET" && url.pathname === "/") {
      sendHtml(response, renderPage(generateSolarProposal()));
      return;
    }

    sendJson(response, 404, { error: "not_found" });
  } catch (error) {
    sendJson(response, 500, {
      error: "solar_intelligence_failed",
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

server.listen(port, host, () => {
  console.log(`Solar Energy Intelligence listening on http://${host}:${port}`);
});
