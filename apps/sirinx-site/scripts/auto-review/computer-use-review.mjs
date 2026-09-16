import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { basename, dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const here = dirname(fileURLToPath(import.meta.url));
const scriptsRoot = resolve(here, "..");
const siteRoot = resolve(scriptsRoot, "..");
const repoRoot = resolve(siteRoot, "..", "..");
const defaultPort = Number(process.env.SIRINX_SITE_AUTO_REVIEW_PORT || 18741);
const defaultReportDir = resolve(repoRoot, "reports/review/p087");

export const autoReviewTargets = [
  { slug: "home", path: "/" },
  { slug: "line", path: "/line/" },
  { slug: "contact", path: "/contact/" },
  { slug: "projects", path: "/projects/" },
  { slug: "trust-center", path: "/trust-center/" },
  { slug: "quote", path: "/quote/" },
  { slug: "roi-calculator", path: "/roi-calculator/" }
];

export const autoReviewViewports = [
  { slug: "mobile-390", width: 390, height: 844, isMobile: true },
  { slug: "mobile-430", width: 430, height: 932, isMobile: true },
  { slug: "tablet-768", width: 768, height: 1024, isMobile: true },
  { slug: "desktop-1440", width: 1440, height: 1024 }
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

const safetyPatterns = [
  {
    code: "LIVE_SEND_PATH_DETECTED",
    severity: "critical",
    pattern:
      /api\.line\.me\/v2\/bot\/message|telegram\.org\/bot[^"'\s]+\/sendMessage|curl\s+[^;\n]*-X\s+POST[^;\n]*(line|telegram|message)|sendMessage\s*\(/i,
    message: "Live customer or operator message send path detected"
  },
  {
    code: "PRODUCTION_DEPLOY_COMMAND_DETECTED",
    severity: "critical",
    pattern: /\b(wrangler\s+deploy|cloudflare\s+deploy|pnpm\s+[^;\n]*deploy|npm\s+run\s+deploy)\b/i,
    message: "Production or preview deploy command detected"
  },
  {
    code: "CLOUDFLARE_MUTATION_DETECTED",
    severity: "high",
    pattern: /\bwrangler\s+(r2|kv|d1|pages|queues|deploy|delete|secret)\b|\bDNS\s+mutation\b/i,
    message: "Cloudflare mutation command detected"
  },
  {
    code: "SECRET_LIKE_TEXT_DETECTED",
    severity: "high",
    pattern: /(sk-[A-Za-z0-9_-]{20,}|sk-or-v1-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9_]{20,}|BEGIN (RSA|OPENSSH|PRIVATE) KEY)/,
    message: "Secret-like value detected"
  }
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

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function fileSha256(path) {
  return sha256(await readFile(path));
}

async function walkFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(path)));
    } else {
      files.push(path);
    }
  }

  return files;
}

export function classifyAutoReviewVerdict({ checks = [], findings = [], next_action_class = "low_risk" } = {}) {
  const hasBlockingFinding = findings.some((finding) => ["high", "critical"].includes(finding.severity));
  const hasFailedCheck = checks.some((check) => ["failed", "blocked"].includes(check.status));

  if (hasBlockingFinding || hasFailedCheck) {
    return "review_blocked_with_findings";
  }

  if (next_action_class === "high_risk_approval_required") {
    return "auto_review_pass_needs_human_approval";
  }

  return "auto_review_pass";
}

export function buildAutoReviewResult({
  run_id,
  task_id = "sirinx-site-auto-review",
  packet_id = "P087_COMPUTER_USE_AUTO_REVIEW_GATE",
  mode = "local",
  target_origin,
  checks = [],
  findings = [],
  artifacts = [],
  started_at = nowBangkok(),
  ended_at = nowBangkok(),
  next_action_class = "high_risk_approval_required"
} = {}) {
  const verdict = classifyAutoReviewVerdict({ checks, findings, next_action_class });

  return {
    run_id,
    task_id,
    packet_id,
    mode,
    target_origin,
    verdict,
    human_approval_required: verdict === "auto_review_pass_needs_human_approval",
    started_at,
    ended_at,
    checks,
    findings,
    artifacts,
    closed_gates: verdict === "auto_review_pass" ? [] : closedGates,
    next_safe_action:
      verdict === "auto_review_pass_needs_human_approval"
        ? "Use a separate exact approval gate before deploy, push, cloud mutation, webhook activation, CRM storage, or live send."
        : verdict === "review_blocked_with_findings"
          ? "Resolve blocked findings and rerun P087 auto review before approval discussion."
          : "Low-risk review evidence can be accepted without opening high-risk action gates."
  };
}

export function scanStaticSafety({ files = new Map() } = {}) {
  const findings = [];

  for (const [label, content] of files.entries()) {
    for (const check of safetyPatterns) {
      if (check.pattern.test(content)) {
        findings.push({
          finding_id: `${check.code.toLowerCase()}_${findings.length + 1}`,
          severity: check.severity,
          code: check.code,
          message: check.message,
          evidence_ref: label,
          created_at: nowBangkok()
        });
      }
    }
  }

  return findings;
}

function collectAttrs(html, attr) {
  return [...html.matchAll(new RegExp(`${attr}\\s*=\\s*["']([^"']+)["']`, "gi"))].map((match) => match[1]);
}

export function inspectLineTargets({ html = "" } = {}) {
  const hrefs = collectAttrs(html, "href");
  const srcs = collectAttrs(html, "src");
  const addFriendFound = hrefs.some((href) => /lin\.ee\/S97R6nj|line\.me\/R\/ti\/p\/%40304zrttj|line\.me\/R\/ti\/p\/@304zrttj/i.test(href));
  const chatFound = hrefs.some((href) => /line\.me\/R\/oaMessage\/%40304zrttj/i.test(href));
  const qrFound = srcs.some((src) => /qr-official\.line\.me\/gs\/M_304zrttj_GW\.png/i.test(src));
  const inquiryPathFound = hrefs.some((href) => href === "/contact" || href.startsWith("/contact"));
  const status = addFriendFound && chatFound && qrFound && inquiryPathFound ? "passed" : "failed";

  return {
    check_type: "line_qr_targets",
    status,
    add_friend_found: addFriendFound,
    chat_found: chatFound,
    qr_found: qrFound,
    inquiry_path_found: inquiryPathFound,
    send_performed: false,
    summary: status === "passed" ? "LINE add/chat/QR targets exist without live send" : "Missing LINE or inquiry target"
  };
}

async function readStaticReviewFiles() {
  const distRoot = resolve(siteRoot, "dist");
  const files = new Map();
  const candidates = (await walkFiles(distRoot)).filter((file) => /\.(html|js|css|json|txt|xml)$/i.test(file));

  for (const file of candidates) {
    files.set(relative(repoRoot, file), await readFile(file, "utf8"));
  }

  return files;
}

function startServer({ port }) {
  const child = spawn(process.execPath, ["server.mjs"], {
    cwd: siteRoot,
    env: {
      ...process.env,
      SIRINX_SITE_DIR: "dist",
      SIRINX_SITE_PORT: String(port)
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
      const response = await fetch(baseUrl);
      if (response.ok) {
        return;
      }
    } catch {
      // Keep polling until the local-only preview is ready.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }

  throw new Error(`Local preview server did not become ready at ${baseUrl}`);
}

function normalizeRouteName(route) {
  return route === "/" ? "home" : route.replaceAll("/", "-").replace(/^-|-$/g, "");
}

function createCheck({ check_type, status, summary, route = null, viewport = null, details = {} }) {
  return {
    check_id: `${check_type}_${route || "global"}_${viewport || "all"}`.replace(/[^a-z0-9_-]+/gi, "_"),
    check_type,
    status,
    route,
    viewport,
    summary,
    details,
    created_at: nowBangkok()
  };
}

function finding({ severity, code, message, evidence_ref }) {
  return {
    finding_id: `${code.toLowerCase()}_${Date.now()}`,
    severity,
    code,
    message,
    evidence_ref,
    created_at: nowBangkok()
  };
}

async function createArtifact(path, artifactType) {
  return {
    artifact_id: `${artifactType}_${basename(path).replace(/[^a-z0-9_.-]+/gi, "_")}`,
    artifact_type: artifactType,
    path_or_r2_key: path,
    sha256: await fileSha256(path),
    created_at: nowBangkok()
  };
}

async function runBrowserReview({ baseUrl, outputDir }) {
  const checks = [];
  const findings = [];
  const artifacts = [];
  const networkEvents = [];
  const consoleEvents = [];
  const screenshotDir = resolve(outputDir, "screenshots");

  await mkdir(screenshotDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  try {
    for (const viewport of autoReviewViewports) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        isMobile: Boolean(viewport.isMobile)
      });
      const page = await context.newPage();

      page.on("console", (message) => {
        consoleEvents.push({
          type: message.type(),
          text: message.text(),
          route: page.url(),
          viewport: viewport.slug
        });
      });
      page.on("request", (request) => {
        const url = request.url();
        const method = request.method();
        networkEvents.push({ method, url, viewport: viewport.slug });
        const isLocal = url.startsWith(baseUrl);
        const isAllowedLineAsset = method === "GET" && /qr-official\.line\.me|line\.me|lin\.ee/i.test(url);
        if (method !== "GET" && method !== "HEAD") {
          findings.push(
            finding({
              severity: "critical",
              code: "LIVE_NETWORK_WRITE_DETECTED",
              message: `Browser review observed non-read-only request: ${method}`,
              evidence_ref: url
            })
          );
        }
        if (!isLocal && !isAllowedLineAsset) {
          findings.push(
            finding({
              severity: "warning",
              code: "UNEXPECTED_EXTERNAL_REQUEST",
              message: "Unexpected external read request observed during local review",
              evidence_ref: url
            })
          );
        }
      });

      for (const target of autoReviewTargets) {
        const response = await page.goto(`${baseUrl}${target.path}`, { waitUntil: "networkidle" });
        const route = target.path;
        const routeName = normalizeRouteName(route);
        const screenshotPath = resolve(screenshotDir, `${routeName}-${viewport.slug}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        artifacts.push(await createArtifact(screenshotPath, "screenshot"));

        const content = await page.content();
        const pageState = await page.evaluate(() => ({
          title: document.title,
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          skipLinkExists: Boolean(document.querySelector('.skip-link[href="#main"]')),
          mainExists: Boolean(document.querySelector("main#main")),
          focusedBefore: document.activeElement?.tagName || "",
          contactDockExists: Boolean(document.querySelector("#floating-contact-cluster")),
          inquiryPathExists: Boolean(document.querySelector("#inquiry-panel, a[href='/contact'], a[href^='/contact?']")),
          qrCount: document.querySelectorAll("[data-qr-image]").length
        }));
        const routeOk = Boolean(response?.ok());
        const overflowOk = pageState.scrollWidth <= pageState.innerWidth + 2;
        const skipOk = pageState.skipLinkExists && pageState.mainExists;
        const lineTargets = inspectLineTargets({ html: content });

        checks.push(
          createCheck({
            check_type: "route_health",
            status: routeOk ? "passed" : "failed",
            route,
            viewport: viewport.slug,
            summary: routeOk ? `Route ${route} loaded` : `Route ${route} failed to load`,
            details: { status: response?.status() || 0, title: pageState.title }
          }),
          createCheck({
            check_type: "mobile_overlap",
            status: overflowOk ? "passed" : "failed",
            route,
            viewport: viewport.slug,
            summary: overflowOk ? "No horizontal overflow detected" : "Horizontal overflow detected",
            details: { scroll_width: pageState.scrollWidth, inner_width: pageState.innerWidth }
          }),
          createCheck({
            check_type: "keyboard_skip_link",
            status: skipOk ? "passed" : "failed",
            route,
            viewport: viewport.slug,
            summary: skipOk ? "Skip link and main target exist" : "Skip link/main target missing"
          }),
          createCheck({
            check_type: "line_qr_targets",
            status: lineTargets.status,
            route,
            viewport: viewport.slug,
            summary: lineTargets.summary,
            details: lineTargets
          }),
          createCheck({
            check_type: "existing_inquiry_path",
            status: pageState.inquiryPathExists ? "passed" : "failed",
            route,
            viewport: viewport.slug,
            summary: pageState.inquiryPathExists
              ? "Existing inquiry/contact path remains present"
              : "Existing inquiry/contact path missing"
          })
        );
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }

  const consolePath = resolve(outputDir, "console/console-events.json");
  const networkPath = resolve(outputDir, "network/network-events.json");
  await mkdir(dirname(consolePath), { recursive: true });
  await mkdir(dirname(networkPath), { recursive: true });
  await writeFile(consolePath, `${JSON.stringify(consoleEvents, null, 2)}\n`, "utf8");
  await writeFile(networkPath, `${JSON.stringify(networkEvents, null, 2)}\n`, "utf8");
  artifacts.push(await createArtifact(consolePath, "log"));
  artifacts.push(await createArtifact(networkPath, "network"));

  const consoleErrors = consoleEvents.filter((event) => event.type === "error");
  checks.push(
    createCheck({
      check_type: "console_errors",
      status: consoleErrors.length === 0 ? "passed" : "failed",
      summary: consoleErrors.length === 0 ? "No browser console errors observed" : "Browser console errors observed",
      details: { count: consoleErrors.length }
    }),
    createCheck({
      check_type: "network_no_live_send",
      status: findings.some((item) => item.code === "LIVE_NETWORK_WRITE_DETECTED") ? "failed" : "passed",
      summary: "No live send or write network request was performed"
    })
  );

  return { checks, findings, artifacts };
}

export async function runComputerUseAutoReview({
  outputDir = defaultReportDir,
  port = defaultPort,
  runId = `p087_auto_review_${Date.now()}`,
  packetId = "P087_COMPUTER_USE_AUTO_REVIEW_GATE"
} = {}) {
  const startedAt = nowBangkok();
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = startServer({ port });

  try {
    await waitForServer(baseUrl);
    await mkdir(outputDir, { recursive: true });

    const staticFiles = await readStaticReviewFiles();
    const staticFindings = scanStaticSafety({ files: staticFiles });
    const staticChecks = [
      createCheck({
        check_type: "static_safety",
        status: staticFindings.length === 0 ? "passed" : "failed",
        summary:
          staticFindings.length === 0
            ? "No live send, deploy, cloud mutation, or secret-like static pattern detected"
            : "Blocked static safety pattern detected",
        details: { finding_count: staticFindings.length }
      })
    ];
    const browserReview = await runBrowserReview({ baseUrl, outputDir });
    const result = buildAutoReviewResult({
      run_id: runId,
      packet_id: packetId,
      mode: "local",
      target_origin: baseUrl,
      checks: [...staticChecks, ...browserReview.checks],
      findings: [...staticFindings, ...browserReview.findings],
      artifacts: browserReview.artifacts,
      started_at: startedAt,
      ended_at: nowBangkok(),
      next_action_class: "high_risk_approval_required"
    });

    const resultPath = resolve(outputDir, "auto_review_result.json");
    const receiptPath = resolve(outputDir, "auto_review_receipt.json");
    const receipt = {
      receipt_id: `${runId}_receipt`,
      packet_id: packetId,
      status: result.verdict,
      run_id: runId,
      created_at: nowBangkok(),
      result_path: resultPath,
      closed_gates: closedGates,
      no_push: true,
      no_deploy: true,
      no_cloud_mutation: true,
      no_live_send: true,
      no_secret_read: true
    };
    await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");

    const finalResult = {
      ...result,
      artifacts: [...browserReview.artifacts, await createArtifact(receiptPath, "json")],
      receipt_path: receiptPath
    };
    await writeFile(resultPath, `${JSON.stringify(finalResult, null, 2)}\n`, "utf8");
    return finalResult;
  } finally {
    server.kill("SIGTERM");
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = await runComputerUseAutoReview();
  console.log(JSON.stringify(result, null, 2));
}
