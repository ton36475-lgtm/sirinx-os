const PRIMARY_HOST = "www.sirinx.co";
const APEX_HOST = "sirinx.co";
const PAGES_HOST = "sirinx-co.pages.dev";
const LEAD_SUBMIT_PATH = "/api/trpc/lead.submit";

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

function extractLeadPayload(body) {
  const isBatch = Array.isArray(body);
  const item = isBatch ? body[0] : body;
  const json = item?.json || item?.input?.json || item?.input || item;
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
      monthlyBill: normalizeLeadValue(json?.monthlyBill, 80),
      message: normalizeLeadValue(json?.message, 4000)
    }
  };
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
        phone TEXT NOT NULL,
        interest TEXT,
        budget TEXT,
        timeline TEXT,
        monthly_bill TEXT,
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
  if (!lead.name || !lead.phone) {
    return trpcError("Name and phone are required", 400, isBatch);
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
        id, created_at, source, name, company, email, phone, interest, budget,
        timeline, monthly_bill, message, raw_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      createdAt,
      lead.source,
      lead.name,
      lead.company,
      lead.email,
      lead.phone,
      lead.interest,
      lead.budget,
      lead.timeline,
      lead.monthlyBill,
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

export { extractLeadPayload, handleLeadSubmit };
