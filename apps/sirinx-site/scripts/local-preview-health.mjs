import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(here, "..");
const repoRoot = resolve(siteRoot, "..", "..");

const defaultPort = Number(process.env.SIRINX_SITE_PREVIEW_HEALTH_PORT || 18732);
const reportPath = "docs/website/SIRINX_WEBSITE_LOCAL_PREVIEW_HEALTH_2026-07-03.md";
const packetPath = "_A2A_QUEUE/outbox/packet_070_sirinx_website_local_preview_health.json";

const reviewRoutes = [
  { path: "/", label: "Homepage", snippets: ["Solar Carport", "href=\"/line\"", "id=\"floating-contact-cluster\""] },
  { path: "/line/", label: "LINE Official", snippets: ["SIRINX โซล่าเซลล์", "qr-official.line.me", "id=\"floating-contact-cluster\""] },
  { path: "/contact/", label: "Contact", snippets: ["mailto:contact@sirinx.co", "https://lin.ee/S97R6nj", "id=\"floating-contact-cluster\""] },
  { path: "/projects/", label: "Projects", snippets: ["ผลงาน SIRINX", "https://lin.ee/S97R6nj", "id=\"floating-contact-cluster\""] },
  { path: "/trust-center/", label: "Trust Center", snippets: ["Trust Center", "LINE webhook", "id=\"floating-contact-cluster\""] },
  { path: "/quote/", label: "Quote Readiness", snippets: ["ยังไม่รับข้อมูลลูกค้าผ่านเว็บ", "data-crm-handoff-readiness", "id=\"floating-contact-cluster\""] },
  { path: "/roi-calculator/", label: "ROI Calculator", snippets: ["data-roi-calculator", "คำนวณเป็นกรอบประมาณการเท่านั้น", "id=\"floating-contact-cluster\""] }
];

const closedGates = [
  "deploy",
  "push",
  "line_webhook",
  "production_analytics",
  "crm_customer_data_storage",
  "customer_data_collection",
  "external_message_send",
  "provider_call",
  "paid_provider_call",
  "public_tunnel",
  "package_install",
  "production_mutation",
  "database_write_or_migration",
  "secret_or_env_read"
];

function nowBangkok() {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  })
    .formatToParts(new Date())
    .reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {});

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}+0700`;
}

function startServer({ port }) {
  const child = spawn(process.execPath, ["server.mjs"], {
    cwd: siteRoot,
    env: {
      ...process.env,
      SIRINX_SITE_DIR: "dist",
      SIRINX_SITE_PORT: String(port),
      SIRINX_SITE_HOST: "127.0.0.1"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  child.stdout.on("data", (chunk) => process.stderr.write(chunk));
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));

  return child;
}

async function waitForServer(baseUrl) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl, { redirect: "manual" });
      if (response.ok) {
        return;
      }
    } catch {
      // Keep polling until the local preview server is ready.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }

  throw new Error(`Local preview server did not become ready at ${baseUrl}`);
}

async function fetchRoute(baseUrl, route) {
  const response = await fetch(`${baseUrl}${route.path}`, { redirect: "manual" });
  const html = await response.text();
  const missingSnippets = route.snippets.filter((snippet) => !html.includes(snippet));

  return {
    path: route.path,
    label: route.label,
    status: response.status,
    ok: response.ok,
    content_type: response.headers.get("content-type") || "",
    cache_control: response.headers.get("cache-control") || "",
    bytes: Buffer.byteLength(html),
    has_sirinx_signal: /SIRINX|sirinx/i.test(html),
    has_floating_contact_cluster: html.includes('id="floating-contact-cluster"'),
    has_line_signal: /LINE|lin\.ee|304zrttj|S97R6nj/i.test(html),
    missing_snippets: missingSnippets
  };
}

export function createLocalPreviewHealthPacket({ createdAt, baseUrl, routeResults }) {
  const localOnlyBaseUrl = baseUrl.startsWith("http://127.0.0.1:");
  const routesReady = routeResults.every(
    (route) =>
      route.ok &&
      route.content_type.includes("text/html") &&
      route.cache_control.includes("no-store") &&
      route.has_sirinx_signal &&
      route.has_floating_contact_cluster &&
      route.missing_snippets.length === 0
  );
  const status =
    localOnlyBaseUrl && routesReady
      ? "LOCAL_PREVIEW_HEALTH_READY_FOR_HUMAN_REVIEW"
      : "LOCAL_PREVIEW_HEALTH_REQUIRES_ATTENTION";

  return {
    packet_id: "packet_070_sirinx_website_local_preview_health",
    created_at: createdAt,
    lane: "codex_builder",
    mode: "local_only_ephemeral_preview_health_no_public_tunnel_no_push_no_deploy",
    scope: "apps/sirinx-site",
    status,
    base_url: baseUrl,
    local_only_base_url: localOnlyBaseUrl,
    route_count: routeResults.length,
    routes_ready: routesReady,
    route_results: routeResults,
    completion_claim_allowed: false,
    deploy_gate: "BLOCKED_FOR_DEPLOY",
    push_gate: "BLOCKED_UNTIL_EXPLICIT_PUSH_APPROVAL",
    closed_gates: closedGates,
    report: reportPath,
    next_safe_action:
      "Open the local preview URL for human review, scan LINE QR on a real device, confirm existing bot/contact behavior, then rerun review:evidence."
  };
}

function renderRouteRows(packet) {
  return packet.route_results
    .map(
      (route) =>
        `| \`${route.path}\` | ${route.status} | ${route.content_type || "-"} | ${route.has_floating_contact_cluster ? "yes" : "no"} | ${
          route.missing_snippets.length === 0 ? "none" : route.missing_snippets.map((item) => `\`${item}\``).join(", ")
        } |`
    )
    .join("\n");
}

function renderReport(packet) {
  return `# SIRINX Website Local Preview Health

Status: ${packet.status}
Date: ${packet.created_at}
Scope: \`${packet.scope}\`
Mode: ${packet.mode}
Base URL: \`${packet.base_url}\`
Completion claim allowed: ${packet.completion_claim_allowed ? "yes" : "no"}
Deploy gate: \`${packet.deploy_gate}\`
Push gate: \`${packet.push_gate}\`

## Purpose

This packet starts the local preview server on an ephemeral local port, checks every human-review route, then stops the server. It does not open a public tunnel, push, deploy, activate LINE webhook, connect production analytics, or store customer data.

## Route Health

| Route | HTTP | Content type | Floating contact cluster | Missing snippets |
| --- | --- | --- | --- | --- |
${renderRouteRows(packet)}

## Closed Gates

${packet.closed_gates.map((gate) => `- ${gate}`).join("\n")}

## Next Safe Action

${packet.next_safe_action}

This preview health packet is not push approval and not deploy approval.
`;
}

export async function collectLocalPreviewHealth({ port = defaultPort } = {}) {
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = startServer({ port });

  try {
    await waitForServer(baseUrl);
    const routeResults = [];
    for (const route of reviewRoutes) {
      routeResults.push(await fetchRoute(baseUrl, route));
    }

    return createLocalPreviewHealthPacket({
      createdAt: nowBangkok(),
      baseUrl,
      routeResults
    });
  } finally {
    server.kill("SIGTERM");
  }
}

export async function writeLocalPreviewHealth(options = {}) {
  const packet = await collectLocalPreviewHealth(options);
  await mkdir(resolve(repoRoot, dirname(reportPath)), { recursive: true });
  await mkdir(resolve(repoRoot, dirname(packetPath)), { recursive: true });
  await writeFile(resolve(repoRoot, reportPath), renderReport(packet), "utf8");
  await writeFile(resolve(repoRoot, packetPath), `${JSON.stringify(packet, null, 2)}\n`, "utf8");
  return packet;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const packet = await writeLocalPreviewHealth();
  console.log(JSON.stringify(packet, null, 2));
}
