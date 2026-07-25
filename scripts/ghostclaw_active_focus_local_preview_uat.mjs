import { execFile as execFileCallback, spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { createConnection } from "node:net";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);

const DEFAULT_JSON =
  ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P062-ACTIVE-FOCUS-LOCAL-PREVIEW-UAT-20260703.json";
const DEFAULT_REPORT = "reports/mission/A2A2A_ACTIVE_FOCUS_LOCAL_PREVIEW_UAT_20260703.md";
const DEFAULT_RECEIPT =
  ".ghostclaw_runtime/a2a2a/receipts/A2A2A-P062-ACTIVE-FOCUS-LOCAL-PREVIEW-UAT-20260703.json";
const DEFAULT_AGM_SMOKE_JSON =
  ".ghostclaw_runtime/a2a2a/evidence/A2A2A-P062-AGM-SITE-SMOKE-20260703.json";

const closedGates = [
  "commit",
  "push",
  "deploy",
  "cloudflare_r2_mutation",
  "provider_call",
  "telegram_live_send",
  "customer_data_external_routing",
  "secret_or_env_read",
  "key_value_print",
  "install"
];

const sirinxRoutes = [
  { path: "/", label: "SIRINX Home", snippets: ["SIRINX", "id=\"floating-contact-cluster\""] },
  { path: "/quote/", label: "Quotation Readiness", snippets: ["ยังไม่รับข้อมูลลูกค้าผ่านเว็บ", "data-crm-handoff-readiness"] },
  { path: "/roi-calculator/", label: "ROI Calculator", snippets: ["data-roi-calculator", "คำนวณเป็นกรอบประมาณการเท่านั้น"] }
];

function parseArgs(argv) {
  const args = {
    root: process.cwd(),
    json: DEFAULT_JSON,
    report: DEFAULT_REPORT,
    receipt: DEFAULT_RECEIPT,
    sirinxPort: Number(process.env.SIRINX_ACTIVE_FOCUS_SITE_PORT || 18732),
    autoglowPort: Number(process.env.SIRINX_ACTIVE_FOCUS_AUTOGLOW_PORT || 18733),
    skipBuild: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") args.root = argv[++index];
    else if (arg === "--json") args.json = argv[++index];
    else if (arg === "--report") args.report = argv[++index];
    else if (arg === "--receipt") args.receipt = argv[++index];
    else if (arg === "--sirinx-port") args.sirinxPort = Number(argv[++index]);
    else if (arg === "--autoglow-port") args.autoglowPort = Number(argv[++index]);
    else if (arg === "--skip-build") args.skipBuild = true;
  }

  return args;
}

function excerpt(text = "") {
  const clean = String(text).trim();
  if (clean.length <= 1200) return clean;
  return `${clean.slice(0, 550)}\n...\n${clean.slice(-550)}`;
}

function isPortOpen({ host = "127.0.0.1", port }) {
  return new Promise((resolvePromise) => {
    const socket = createConnection({ host, port });
    socket.once("connect", () => {
      socket.destroy();
      resolvePromise(true);
    });
    socket.once("error", () => resolvePromise(false));
    socket.setTimeout(500, () => {
      socket.destroy();
      resolvePromise(false);
    });
  });
}

async function assertPortAvailable(port) {
  if (await isPortOpen({ port })) {
    throw new Error(`port_in_use:${port}`);
  }
}

async function runCommand({ root, command, args }) {
  const started = Date.now();
  try {
    const result = await execFile(command, args, {
      cwd: root,
      maxBuffer: 1024 * 1024 * 8
    });
    return {
      command: [command, ...args].join(" "),
      status: "PASS",
      duration_ms: Date.now() - started,
      stdout_excerpt: excerpt(result.stdout),
      stderr_excerpt: excerpt(result.stderr)
    };
  } catch (error) {
    return {
      command: [command, ...args].join(" "),
      status: "FAIL",
      duration_ms: Date.now() - started,
      stdout_excerpt: excerpt(error.stdout),
      stderr_excerpt: excerpt(error.stderr || error.message),
      error: error.message
    };
  }
}

function startNodeServer({ root, script, env }) {
  const child = spawn(process.execPath, [script], {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"]
  });

  const output = [];
  child.stdout.on("data", (chunk) => output.push(chunk.toString("utf8")));
  child.stderr.on("data", (chunk) => output.push(chunk.toString("utf8")));

  return { child, output };
}

async function waitForUrl(url) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.ok) return;
    } catch {
      // Poll until the local server accepts connections.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }
  throw new Error(`local_url_not_ready:${url}`);
}

async function stopServer(server) {
  if (!server?.child || server.child.killed) return;
  await new Promise((resolvePromise) => {
    const timer = setTimeout(() => {
      server.child.kill("SIGKILL");
      resolvePromise();
    }, 3000);
    server.child.once("exit", () => {
      clearTimeout(timer);
      resolvePromise();
    });
    server.child.kill("SIGTERM");
  });
}

async function fetchTextCheck(baseUrl, route) {
  const response = await fetch(`${baseUrl}${route.path}`, { redirect: "manual" });
  const text = await response.text();
  const missingSnippets = route.snippets.filter((snippet) => !text.includes(snippet));
  return {
    path: route.path,
    label: route.label,
    status: response.status,
    ok: response.ok,
    content_type: response.headers.get("content-type") || "",
    bytes: Buffer.byteLength(text),
    missing_snippets: missingSnippets
  };
}

async function fetchJsonCheck(url) {
  const response = await fetch(url, { redirect: "manual" });
  const body = await response.text();
  let parsed = null;
  try {
    parsed = JSON.parse(body);
  } catch {
    // Report invalid JSON below.
  }

  return {
    url,
    status: response.status,
    ok: response.ok,
    content_type: response.headers.get("content-type") || "",
    brand_name: parsed?.brandName || null,
    product_name: parsed?.productName || null,
    schema_present: Boolean(parsed?.id && parsed?.scenes)
  };
}

export function createActiveFocusLocalPreviewUatPacket({
  root,
  createdAt,
  sirinxBaseUrl,
  autoglowBaseUrl,
  commands,
  sirinxRoutes: routeResults,
  autoglowHome,
  autoglowProjectApi,
  serverOutput = {}
}) {
  const commandsPass = commands.every((command) => command.status === "PASS");
  const localUrls = [sirinxBaseUrl, autoglowBaseUrl].every((url) => url.startsWith("http://127.0.0.1:"));
  const sirinxReady = routeResults.every(
    (route) => route.ok && route.content_type.includes("text/html") && route.missing_snippets.length === 0
  );
  const autoglowReady =
    autoglowHome.ok &&
    autoglowHome.content_type.includes("text/html") &&
    autoglowHome.missing_snippets.length === 0 &&
    autoglowProjectApi.ok &&
    autoglowProjectApi.content_type.includes("application/json") &&
    autoglowProjectApi.brand_name === "AGM AUTOGLOW" &&
    autoglowProjectApi.schema_present;
  const status = commandsPass && localUrls && sirinxReady && autoglowReady ? "PASS" : "FAIL";

  return {
    packet_id: "A2A2A-P062-ACTIVE-FOCUS-LOCAL-PREVIEW-UAT-20260703",
    title: "A2A2A Active Focus Local Preview UAT",
    created_at: createdAt,
    repo: root,
    mode: "local_only_ephemeral_preview_uat_no_external_mutation",
    active_focus: ["sirinx.co", "AGM AutoFlow"],
    paused_out_of_focus: ["Kusala", "Phitsanulok News"],
    status,
    local_urls: {
      sirinx_site: sirinxBaseUrl,
      agm_autoglow_dashboard: autoglowBaseUrl
    },
    checks: {
      commands_pass: commandsPass,
      local_urls: localUrls,
      sirinx_ready: sirinxReady,
      autoglow_ready: autoglowReady
    },
    commands,
    sirinx_routes: routeResults,
    agm_autoglow_dashboard: {
      home: autoglowHome,
      project_api: autoglowProjectApi
    },
    server_output: serverOutput,
    closed_gates: closedGates,
    next_safe_action:
      status === "PASS"
        ? "Use the local URLs for human review, then open a separate explicit local commit gate if this active-focus slice should be committed."
        : "Fix the failed local preview UAT check before commit or release review."
  };
}

function renderReport(packet) {
  const commandRows = packet.commands
    .map((command) => `| \`${command.command}\` | ${command.status} | ${command.duration_ms} |`)
    .join("\n");
  const routeRows = packet.sirinx_routes
    .map((route) => `| \`${route.path}\` | ${route.status} | ${route.missing_snippets.length ? route.missing_snippets.join(", ") : "none"} |`)
    .join("\n");

  return `# A2A2A Active Focus Local Preview UAT - 2026-07-03

## Status

${packet.status}: \`sirinx.co\` and AGM AutoFlow were checked through local-only preview surfaces.

## Local URLs

- SIRINX site preview: \`${packet.local_urls.sirinx_site}\`
- AGM AutoGlow dashboard: \`${packet.local_urls.agm_autoglow_dashboard}\`

## Command Checks

| Command | Status | Duration ms |
|---|---:|---:|
${commandRows}

## SIRINX Site Route Checks

| Route | HTTP | Missing snippets |
|---|---:|---|
${routeRows}

## AGM AutoGlow Dashboard Checks

- Home: HTTP ${packet.agm_autoglow_dashboard.home.status}, missing snippets: ${
    packet.agm_autoglow_dashboard.home.missing_snippets.length
      ? packet.agm_autoglow_dashboard.home.missing_snippets.join(", ")
      : "none"
  }
- API: HTTP ${packet.agm_autoglow_dashboard.project_api.status}, brand: \`${packet.agm_autoglow_dashboard.project_api.brand_name}\`, schema present: ${
    packet.agm_autoglow_dashboard.project_api.schema_present ? "yes" : "no"
  }

## Focus Boundary

- Active: \`sirinx.co\`, AGM AutoFlow
- Paused/out-of-focus: Kusala, Phitsanulok News

## Closed Gates

${packet.closed_gates.map((gate) => `- ${gate}`).join("\n")}

## Next Safe Action

${packet.next_safe_action}
`;
}

async function writeJson(path, payload) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function writeText(path, content) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

export async function collectActiveFocusLocalPreviewUat(options = {}) {
  const root = resolve(options.root || process.cwd());
  const sirinxPort = options.sirinxPort || 18732;
  const autoglowPort = options.autoglowPort || 18733;
  const sirinxBaseUrl = `http://127.0.0.1:${sirinxPort}`;
  const autoglowBaseUrl = `http://127.0.0.1:${autoglowPort}`;
  const runtimeDataDir = resolve(root, ".ghostclaw_runtime/a2a2a/tmp/active-focus-autoglow-dashboard");

  await assertPortAvailable(sirinxPort);
  await assertPortAvailable(autoglowPort);
  await rm(runtimeDataDir, { recursive: true, force: true });

  const commands = [];
  if (!options.skipBuild) {
    commands.push(await runCommand({ root, command: "pnpm", args: ["--filter", "@sirinx/site", "build"] }));
    commands.push(await runCommand({ root, command: "pnpm", args: ["--filter", "@agm/site", "build"] }));
  }
  commands.push(
    await runCommand({
      root,
      command: process.execPath,
      args: ["apps/agm-site/scripts/browser-smoke.mjs", "--json", DEFAULT_AGM_SMOKE_JSON]
    })
  );

  const failedCommands = commands.filter((command) => command.status !== "PASS");
  if (failedCommands.length > 0) {
    return createActiveFocusLocalPreviewUatPacket({
      root,
      createdAt: new Date().toISOString(),
      sirinxBaseUrl,
      autoglowBaseUrl,
      commands,
      sirinxRoutes: [],
      autoglowHome: { ok: false, status: 0, content_type: "", missing_snippets: ["not_started_due_to_failed_command"] },
      autoglowProjectApi: { ok: false, status: 0, content_type: "", brand_name: null, schema_present: false }
    });
  }

  const sirinxServer = startNodeServer({
    root,
    script: "apps/sirinx-site/server.mjs",
    env: {
      SIRINX_SITE_DIR: "dist",
      SIRINX_SITE_HOST: "127.0.0.1",
      SIRINX_SITE_PORT: String(sirinxPort)
    }
  });
  const autoglowServer = startNodeServer({
    root,
    script: "apps/agm-autoglow-dashboard/server.mjs",
    env: {
      AUTOGLOW_DASHBOARD_HOST: "127.0.0.1",
      AUTOGLOW_DASHBOARD_PORT: String(autoglowPort),
      AUTOGLOW_DASHBOARD_DATA_DIR: runtimeDataDir
    }
  });

  try {
    await waitForUrl(sirinxBaseUrl);
    await waitForUrl(autoglowBaseUrl);
    const routeResults = [];
    for (const route of sirinxRoutes) {
      routeResults.push(await fetchTextCheck(sirinxBaseUrl, route));
    }
    const autoglowHome = await fetchTextCheck(autoglowBaseUrl, {
      path: "/",
      label: "AGM AutoGlow Dashboard",
      snippets: ["Creative Production Command Center", "Local Mode", "No provider call / no publish"]
    });
    const autoglowProjectApi = await fetchJsonCheck(`${autoglowBaseUrl}/api/project`);

    return createActiveFocusLocalPreviewUatPacket({
      root,
      createdAt: new Date().toISOString(),
      sirinxBaseUrl,
      autoglowBaseUrl,
      commands,
      sirinxRoutes: routeResults,
      autoglowHome,
      autoglowProjectApi,
      serverOutput: {
        sirinx: excerpt(sirinxServer.output.join("")),
        autoglow: excerpt(autoglowServer.output.join(""))
      }
    });
  } finally {
    await Promise.all([stopServer(sirinxServer), stopServer(autoglowServer)]);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const packet = await collectActiveFocusLocalPreviewUat(args);
  await writeJson(resolve(args.root, args.json), packet);
  await writeText(resolve(args.root, args.report), renderReport(packet));
  await writeJson(resolve(args.root, args.receipt), {
    packet_id: packet.packet_id,
    status: packet.status,
    created_at: packet.created_at,
    evidence: args.json,
    report: args.report,
    active_focus: packet.active_focus,
    closed_gates: packet.closed_gates,
    next_safe_action: packet.next_safe_action
  });
  console.log(JSON.stringify(packet, null, 2));
  if (packet.status !== "PASS") process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
