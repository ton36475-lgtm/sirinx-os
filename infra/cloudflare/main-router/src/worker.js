const PRIMARY_HOST = "www.sirinx.co";
const APEX_HOST = "sirinx.co";
const PAGES_HOST = "sirinx-co.pages.dev";
const LEAD_SUBMIT_PATH = "/api/trpc/lead.submit";

const leadIntakeSchema = Object.freeze({
  version: "2026-05-19.lead-intake.v1",
  endpoint: LEAD_SUBMIT_PATH,
  method: "POST",
  productionWriteBehavior: "creates contact_leads row when LEAD_DB is configured",
  commandCenterProbeBehavior: "GET only; never creates production leads",
  payloadShapes: ["plain json", "tRPC array batch", "tRPC numeric-keyed batch", "input.json"],
  required: {
    all: ["name"],
    oneOf: ["phone", "email", "lineUserId"]
  },
  fields: [
    { name: "source", dbColumn: "source", maxLength: 40, required: false, pii: false, default: "contact" },
    { name: "name", dbColumn: "name", maxLength: 160, required: true, pii: true },
    { name: "company", dbColumn: "company", maxLength: 160, required: false, pii: true },
    { name: "email", dbColumn: "email", maxLength: 180, required: false, pii: true, contactChannel: true },
    { name: "phone", dbColumn: "phone", maxLength: 80, required: false, pii: true, contactChannel: true },
    { name: "interest", dbColumn: "interest", maxLength: 160, required: false, pii: false },
    { name: "budget", dbColumn: "budget", maxLength: 160, required: false, pii: false },
    { name: "timeline", dbColumn: "timeline", maxLength: 160, required: false, pii: false },
    { name: "industry", dbColumn: "industry", maxLength: 160, required: false, pii: false },
    { name: "systemSize", dbColumn: "system_size", maxLength: 80, required: false, pii: false },
    { name: "systemType", dbColumn: "system_type", maxLength: 160, required: false, pii: false },
    { name: "monthlyBill", dbColumn: "monthly_bill", maxLength: 80, required: false, pii: false },
    { name: "bessInterest", dbColumn: "bess_interest", maxLength: 40, required: false, pii: false },
    { name: "lineUserId", dbColumn: "line_user_id", maxLength: 120, required: false, pii: true, contactChannel: true },
    { name: "message", dbColumn: "message", maxLength: 4000, required: false, pii: true }
  ],
  reviewGates: [
    "production POST smoke requires explicit approval",
    "D1 binding must be reviewed before deploy",
    "customer-facing CRM or messaging writes require separate approval"
  ]
});

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-sirinx-router": "main-www"
};

function redirectToPrimary(requestUrl) {
  const url = new URL(requestUrl);
  url.protocol = "https:";
  url.hostname = PRIMARY_HOST;
  return Response.redirect(url.toString(), 301);
}

async function proxyToPages(request) {
  const incomingUrl = new URL(request.url);
  const upstreamUrl = new URL(request.url);
  upstreamUrl.protocol = "https:";
  upstreamUrl.hostname = PAGES_HOST;

  const upstreamRequest = new Request(upstreamUrl.toString(), request);
  upstreamRequest.headers.set("x-forwarded-host", incomingUrl.hostname);
  upstreamRequest.headers.set("x-forwarded-proto", "https");

  const response = await fetch(upstreamRequest);
  const headers = new Headers(response.headers);
  headers.set("x-sirinx-router", "main-www");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function trpcSuccess(data, isBatch) {
  const payload = {
    result: {
      data: {
        json: data
      }
    }
  };
  return new Response(JSON.stringify(isBatch ? [payload] : payload), {
    status: 200,
    headers: jsonHeaders
  });
}

function trpcError(message, status, isBatch = true) {
  const payload = {
    error: {
      message,
      code: -32603,
      data: {
        code: status >= 500 ? "INTERNAL_SERVER_ERROR" : "BAD_REQUEST",
        httpStatus: status
      }
    }
  };
  return new Response(JSON.stringify(isBatch ? [payload] : payload), {
    status,
    headers: jsonHeaders
  });
}

function normalizeLeadValue(value, maxLength = 2000) {
  if (value === undefined || value === null) return null;
  return String(value).trim().slice(0, maxLength) || null;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNumericKeyedBatch(body) {
  if (!isRecord(body)) return false;
  const keys = Object.keys(body);
  return keys.length > 0 && keys.every((key) => /^\d+$/.test(key));
}

function firstNumericBatchItem(body) {
  if (!isNumericKeyedBatch(body)) return body;
  const [firstKey] = Object.keys(body).sort((a, b) => Number(a) - Number(b));
  return body[firstKey];
}

function unwrapTrpcInput(item) {
  const input = item?.input ?? item;
  return input?.json || item?.json || input || item;
}

function extractLeadPayload(body) {
  const isBatch = Array.isArray(body) || isNumericKeyedBatch(body);
  const item = Array.isArray(body) ? body[0] : firstNumericBatchItem(body);
  const json = unwrapTrpcInput(item);
  return {
    isBatch,
    lead: {
      source: normalizeLeadValue(json?.source, 40) || "contact",
      name: normalizeLeadValue(json?.name, 160),
      company: normalizeLeadValue(json?.company, 160),
      email: normalizeLeadValue(json?.email, 180),
      phone: normalizeLeadValue(json?.phone, 80),
      interest: normalizeLeadValue(json?.interest, 160),
      budget: normalizeLeadValue(json?.budget, 160),
      timeline: normalizeLeadValue(json?.timeline, 160),
      industry: normalizeLeadValue(json?.industry, 160),
      systemSize: normalizeLeadValue(json?.systemSize, 80),
      systemType: normalizeLeadValue(json?.systemType, 160),
      monthlyBill: normalizeLeadValue(json?.monthlyBill, 80),
      bessInterest: normalizeLeadValue(json?.bessInterest, 40),
      lineUserId: normalizeLeadValue(json?.lineUserId, 120),
      message: normalizeLeadValue(json?.message, 4000)
    }
  };
}

function getLeadIntakeSchema() {
  return leadIntakeSchema;
}

async function ensureLeadTable(db) {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS contact_leads (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        source TEXT NOT NULL,
        name TEXT NOT NULL,
        company TEXT,
        email TEXT,
        phone TEXT,
        industry TEXT,
        interest TEXT,
        budget TEXT,
        timeline TEXT,
        system_size TEXT,
        system_type TEXT,
        monthly_bill TEXT,
        bess_interest TEXT,
        line_user_id TEXT,
        message TEXT,
        status TEXT NOT NULL DEFAULT 'new',
        raw_json TEXT NOT NULL
      )`
    )
    .run();
}

async function handleLeadSubmit(request, env) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: jsonHeaders });
  }

  if (request.method !== "POST") {
    return trpcError("Method not allowed", 405);
  }

  let parsed;
  try {
    parsed = extractLeadPayload(await request.json());
  } catch {
    return trpcError("Invalid JSON payload", 400);
  }

  const { lead, isBatch } = parsed;
  if (!lead.name) {
    return trpcError("Name is required", 400, isBatch);
  }

  if (!lead.phone && !lead.email && !lead.lineUserId) {
    return trpcError("At least one contact channel is required", 400, isBatch);
  }

  if (!env?.LEAD_DB) {
    return trpcError("Lead database binding is not configured", 503, isBatch);
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await ensureLeadTable(env.LEAD_DB);
  await env.LEAD_DB
    .prepare(
      `INSERT INTO contact_leads (
        id, created_at, source, name, company, email, phone, industry, interest,
        budget, timeline, system_size, system_type, monthly_bill, bess_interest,
        line_user_id, message, raw_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      createdAt,
      lead.source,
      lead.name,
      lead.company,
      lead.email,
      lead.phone || "",
      lead.industry,
      lead.interest,
      lead.budget,
      lead.timeline,
      lead.systemSize,
      lead.systemType,
      lead.monthlyBill,
      lead.bessInterest,
      lead.lineUserId,
      lead.message,
      JSON.stringify(lead)
    )
    .run();

  return trpcSuccess({ ok: true, id, createdAt }, isBatch);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.hostname === APEX_HOST) {
      return redirectToPrimary(request.url);
    }

    if (url.hostname === PRIMARY_HOST) {
      if (url.pathname === LEAD_SUBMIT_PATH) {
        return handleLeadSubmit(request, env);
      }
      return proxyToPages(request);
    }

    return new Response("Not found", {
      status: 404,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store"
      }
    });
  }
};

export { extractLeadPayload, getLeadIntakeSchema, handleLeadSubmit };
