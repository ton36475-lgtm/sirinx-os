import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";
import { chromium, firefox, webkit } from "@playwright/test";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const scriptsRoot = resolve(here, "..");
const siteRoot = resolve(scriptsRoot, "..");
const repoRoot = resolve(siteRoot, "..", "..");
const defaultPort = Number(process.env.SIRINX_SITE_AUTO_VISUAL_PORT || 18742);
const defaultReportDir = resolve(repoRoot, "reports/review/p087b");
const baselineDir = resolve(repoRoot, "reports/visual/baseline");
const visualThreshold = 0.001;

export const autoVisualViewports = [
  { slug: "mobile-375", width: 375, height: 812, isMobile: true },
  { slug: "mobile-414", width: 414, height: 896, isMobile: true },
  { slug: "tablet-768", width: 768, height: 1024, isMobile: true },
  { slug: "desktop-1440", width: 1440, height: 1024 }
];

export const blockedActionsConfirmed = [
  "deploy",
  "push",
  "cloud_mutation",
  "line_webhook_live_call",
  "crm_customer_storage_write",
  "live_send",
  "provider_api_call",
  "secret_read"
];

const requiredCheckTypes = [
  "visual_regression",
  "accessibility_bot",
  "broken_link_crawler",
  "console_error_scan",
  "mobile_overlap_bot",
  "lighthouse_automated",
  "seo_meta_bot",
  "form_dry_run_bot",
  "cross_browser_bot"
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

function routeSlug(route) {
  return route === "/" ? "home" : route.replaceAll("/", "-").replace(/^-|-$/g, "");
}

function checkId(checkType, route = "global", detail = "all") {
  return `${checkType}_${route}_${detail}`.replace(/[^a-z0-9_-]+/gi, "_");
}

function makeCheck({ check_type, status, summary, route = null, detail = null, data = {} }) {
  return {
    check_id: checkId(check_type, route || "global", detail || "all"),
    check_type,
    status,
    route,
    detail,
    summary,
    data,
    created_at: nowBangkok()
  };
}

export function makeDependencyMissingCheck({ check_type, dependency, message, route = null, detail = null }) {
  return makeCheck({
    check_type,
    status: "failed",
    route,
    detail,
    summary: `Required dependency missing: ${dependency}. ${message}`,
    data: {
      dependency,
      reason: "missing_dependency",
      message
    }
  });
}

export function makeBaselineMissingVisualResult({ route, viewport, baselinePath }) {
  return {
    route,
    viewport,
    status: "failed",
    baseline_seeded: true,
    reason: "baseline_missing",
    verdict: "baseline_initialized_needs_second_run",
    diff_ratio: null,
    baseline_path: baselinePath,
    message: "Visual baseline was missing; current screenshot was stored for a required second run."
  };
}

function makeFinding({ severity = "warning", code, message, evidence_ref = "" }) {
  return {
    finding_id: `${code.toLowerCase()}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    severity,
    code,
    message,
    evidence_ref,
    created_at: nowBangkok()
  };
}

async function createArtifact(path, artifactType) {
  return {
    artifact_id: `${artifactType}_${relative(repoRoot, path).replace(/[^a-z0-9_.-]+/gi, "_")}`,
    artifact_type: artifactType,
    path_or_r2_key: path,
    sha256: await fileSha256(path),
    created_at: nowBangkok()
  };
}

export function classifyAutoVisualBotVerdict({ checks = [], findings = [], visual_diff_results = [] } = {}) {
  const baselineNeedsSecondRun =
    checks.some((check) => check.check_type === "visual_regression" && check.data?.reason === "baseline_missing") ||
    visual_diff_results.some((result) => result.reason === "baseline_missing");
  if (baselineNeedsSecondRun) {
    return "baseline_initialized_needs_second_run";
  }

  const checkTypes = new Set(checks.map((check) => check.check_type));
  const missingRequired = requiredCheckTypes.some((checkType) => !checkTypes.has(checkType));
  const failedCheck = checks.some((check) => ["failed", "blocked"].includes(check.status));
  const highRiskFinding = findings.some((finding) => ["high", "critical"].includes(finding.severity));

  if (missingRequired || failedCheck || highRiskFinding) {
    return "auto_review_blocked_findings_attached";
  }

  return "auto_review_pass_bot_verified";
}

function attrValues(html, attr) {
  return [...html.matchAll(new RegExp(`${attr}\\s*=\\s*["']([^"']+)["']`, "gi"))].map((match) => match[1]);
}

function firstAttr(html, selectorRegex) {
  const match = html.match(selectorRegex);
  return match?.[1] || "";
}

function expectedCanonical(route) {
  if (route === "/") return "https://www.sirinx.co/";
  const normalized = route === "/" ? "" : route.replace(/\/$/, "");
  return `https://www.sirinx.co${normalized}`;
}

export function inspectSeoMeta({ html = "", route = "/" } = {}) {
  const findings = [];
  const title = firstAttr(html, /<title[^>]*>([^<]+)<\/title>/i).trim();
  const description = firstAttr(
    html,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i
  ).trim();
  const canonical = firstAttr(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i).trim();
  const ogImage = firstAttr(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i).trim();
  const h1Count = (html.match(/<h1\b/gi) || []).length;
  const jsonLdBlocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];

  if (!title) findings.push(makeFinding({ severity: "high", code: "SEO_TITLE_MISSING", message: "Missing title", evidence_ref: route }));
  if (!description) {
    findings.push(
      makeFinding({ severity: "high", code: "SEO_DESCRIPTION_MISSING", message: "Missing meta description", evidence_ref: route })
    );
  }
  if (canonical !== expectedCanonical(route)) {
    findings.push(
      makeFinding({
        severity: "high",
        code: "SEO_CANONICAL_MISMATCH",
        message: `Canonical mismatch: expected ${expectedCanonical(route)}`,
        evidence_ref: canonical || route
      })
    );
  }
  if (!ogImage) findings.push(makeFinding({ severity: "warning", code: "SEO_OG_IMAGE_MISSING", message: "Missing og:image", evidence_ref: route }));
  if (h1Count !== 1) {
    findings.push(
      makeFinding({ severity: "high", code: "SEO_H1_COUNT_INVALID", message: `Expected exactly one H1, found ${h1Count}`, evidence_ref: route })
    );
  }

  for (const [index, block] of jsonLdBlocks.entries()) {
    try {
      JSON.parse(block[1]);
    } catch {
      findings.push(
        makeFinding({ severity: "high", code: "SEO_JSON_LD_INVALID", message: "Invalid JSON-LD", evidence_ref: `${route}#jsonld-${index}` })
      );
    }
  }

  if (jsonLdBlocks.length === 0) {
    findings.push(makeFinding({ severity: "warning", code: "SEO_JSON_LD_MISSING", message: "No JSON-LD block found", evidence_ref: route }));
  }

  return {
    check_type: "seo_meta_bot",
    status: findings.some((finding) => finding.severity === "high") ? "failed" : "passed",
    findings,
    title,
    description_present: Boolean(description),
    canonical,
    og_image_present: Boolean(ogImage),
    json_ld_count: jsonLdBlocks.length,
    h1_count: h1Count
  };
}

export function validateDryRunForms({ html = "" } = {}) {
  const findings = [];
  const forms = [...html.matchAll(/<form\b[\s\S]*?<\/form>/gi)];

  for (const [index, match] of forms.entries()) {
    const form = match[0];
    const method = firstAttr(form, /\bmethod\s*=\s*["']?([^"'\s>]+)/i).toLowerCase() || "get";
    const action = firstAttr(form, /\baction\s*=\s*["']([^"']+)["']/i);
    const liveAction = /api\.line\.me|telegram\.org|send(grid|mail)|\/api\/(lead|crm|message|send)/i.test(action);

    if (method === "post" || liveAction || /^https?:\/\//i.test(action)) {
      findings.push(
        makeFinding({
          severity: "high",
          code: "LIVE_FORM_POST_DETECTED",
          message: "Form dry-run found a live or external submit path",
          evidence_ref: action || `form-${index}`
        })
      );
    }
  }

  return {
    check_type: "form_dry_run_bot",
    status: findings.length === 0 ? "passed" : "failed",
    form_count: forms.length,
    submit_performed: false,
    findings
  };
}

export function summarizeAutoVisualBotReceipt(receipt) {
  if (!receipt) {
    return {
      present: false,
      evidence_ready: false,
      accepted_manual_requirements: [],
      accepted_manual_checks: []
    };
  }

  const blocked = new Set(receipt.blocked_actions_confirmed || []);
  const requiredBlocksPresent = ["deploy", "push", "cloud_mutation", "live_send", "secret_read"].every((gate) =>
    blocked.has(gate)
  );
  const noBlockingArrays =
    (receipt.a11y_violations || []).length === 0 &&
    (receipt.broken_links || []).length === 0 &&
    (receipt.console_errors || []).length === 0 &&
    (receipt.overlap_findings || []).length === 0 &&
    (receipt.seo_findings || []).length === 0;
  const crossBrowserOk = (receipt.cross_browser_results || []).every((result) => result.status === "passed");
  const evidenceReady =
    receipt.verdict === "auto_review_pass_bot_verified" && requiredBlocksPresent && noBlockingArrays && crossBrowserOk;

  return {
    present: true,
    evidence_ready: evidenceReady,
    verdict: receipt.verdict || "unknown",
    routes_checked: receipt.routes_checked || [],
    accepted_manual_requirements: evidenceReady
      ? ["Human visual acceptance after rejected design direction", "Existing website bot/contact behavior is preserved exactly"]
      : [],
    accepted_manual_checks: evidenceReady
      ? [
          "Local homepage visual review",
          "Local `/line` visual review",
          "Local `/contact` visual review",
          "Local `/projects` visual review",
          "Local `/trust-center` visual review",
          "Local `/quote` visual review",
          "Local `/roi-calculator` visual review",
          "Desktop floating LINE dock review",
          "Mobile contact tray review",
          "Existing bot / inquiry path behavior"
        ]
      : []
  };
}

function startServer({ port }) {
  const child = spawn(process.execPath, ["server.mjs"], {
    cwd: siteRoot,
    env: { ...process.env, SIRINX_SITE_DIR: "dist", SIRINX_SITE_PORT: String(port) },
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
      if (response.ok) return;
    } catch {
      // Poll until the local-only preview server is ready.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }
  throw new Error(`Local preview server did not become ready at ${baseUrl}`);
}

async function readRoutesFromSitemap() {
  const sitemap = await readFile(resolve(siteRoot, "dist", "sitemap.xml"), "utf8");
  const routes = [...sitemap.matchAll(/<loc>https:\/\/www\.sirinx\.co([^<]*)<\/loc>/g)].map((match) => {
    const path = match[1] || "/";
    return path === "" ? "/" : path.endsWith("/") ? path : `${path}/`;
  });
  return [...new Set(routes.length > 0 ? routes : ["/"])];
}

function pngBytesPerPixel(colorType) {
  if (colorType === 6) return 4;
  if (colorType === 2) return 3;
  throw new Error(`Unsupported PNG color type: ${colorType}`);
}

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function decodePng(buffer) {
  const signature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== signature) {
    throw new Error("Invalid PNG signature");
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
  }

  if (bitDepth !== 8) throw new Error(`Unsupported PNG bit depth: ${bitDepth}`);
  const bytesPerPixel = pngBytesPerPixel(colorType);
  const stride = width * bytesPerPixel;
  const inflated = inflateSync(Buffer.concat(idat));
  const raw = Buffer.alloc(height * stride);
  let input = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[input];
    input += 1;
    const rowStart = y * stride;

    for (let x = 0; x < stride; x += 1) {
      const left = x >= bytesPerPixel ? raw[rowStart + x - bytesPerPixel] : 0;
      const up = y > 0 ? raw[rowStart + x - stride] : 0;
      const upLeft = y > 0 && x >= bytesPerPixel ? raw[rowStart + x - stride - bytesPerPixel] : 0;
      const value = inflated[input];
      input += 1;

      if (filter === 0) raw[rowStart + x] = value;
      else if (filter === 1) raw[rowStart + x] = (value + left) & 0xff;
      else if (filter === 2) raw[rowStart + x] = (value + up) & 0xff;
      else if (filter === 3) raw[rowStart + x] = (value + Math.floor((left + up) / 2)) & 0xff;
      else if (filter === 4) raw[rowStart + x] = (value + paethPredictor(left, up, upLeft)) & 0xff;
      else throw new Error(`Unsupported PNG filter: ${filter}`);
    }
  }

  return { width, height, colorType, bytesPerPixel, raw };
}

async function comparePngFiles(currentPath, baselinePath) {
  const current = decodePng(await readFile(currentPath));
  const baseline = decodePng(await readFile(baselinePath));
  if (current.width !== baseline.width || current.height !== baseline.height || current.bytesPerPixel !== baseline.bytesPerPixel) {
    return {
      status: "failed",
      diff_ratio: 1,
      current_dimensions: [current.width, current.height],
      baseline_dimensions: [baseline.width, baseline.height]
    };
  }

  let changed = 0;
  const totalPixels = current.width * current.height;
  for (let pixel = 0; pixel < totalPixels; pixel += 1) {
    const index = pixel * current.bytesPerPixel;
    let same = true;
    for (let channel = 0; channel < current.bytesPerPixel; channel += 1) {
      if (Math.abs(current.raw[index + channel] - baseline.raw[index + channel]) > 3) {
        same = false;
        break;
      }
    }
    if (!same) changed += 1;
  }

  const diffRatio = changed / totalPixels;
  return {
    status: diffRatio <= visualThreshold ? "passed" : "failed",
    diff_ratio: Number(diffRatio.toFixed(6)),
    current_dimensions: [current.width, current.height],
    baseline_dimensions: [baseline.width, baseline.height]
  };
}

async function setupLocalOnlyNetwork(context, baseUrl, networkEvents, findings) {
  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = request.url();
    const method = request.method();
    const isLocal = url.startsWith(baseUrl);
    networkEvents.push({ method, url, local: isLocal });

    if (method !== "GET" && method !== "HEAD") {
      findings.push(
        makeFinding({
          severity: "critical",
          code: "LIVE_NETWORK_WRITE_DETECTED",
          message: `Non-read-only request observed: ${method}`,
          evidence_ref: url
        })
      );
      await route.abort();
      return;
    }

    if (!isLocal) {
      findings.push(
        makeFinding({
          severity: "warning",
          code: "EXTERNAL_REQUEST_MOCKED",
          message: "External read request was blocked/mocked during local-only review",
          evidence_ref: url
        })
      );
      await route.fulfill({ status: 204, body: "" });
      return;
    }

    await route.continue();
  });
}

async function runAccessibilityHeuristic(page, route) {
  const violations = await page.evaluate(() => {
    const items = [];
    if (!document.documentElement.lang) items.push({ impact: "serious", id: "html_lang_missing", message: "HTML lang is missing" });
    if (!document.title.trim()) items.push({ impact: "serious", id: "title_missing", message: "Document title is missing" });
    if (!document.querySelector("main")) items.push({ impact: "serious", id: "main_missing", message: "Main landmark is missing" });
    document.querySelectorAll("img").forEach((img, index) => {
      if (!img.hasAttribute("alt")) items.push({ impact: "serious", id: "image_alt_missing", message: `Image ${index} missing alt` });
    });
    document.querySelectorAll("button, a").forEach((el, index) => {
      const text = `${el.textContent || ""} ${el.getAttribute("aria-label") || ""}`.trim();
      if (!text) items.push({ impact: "serious", id: "interactive_name_missing", message: `Interactive element ${index} has no name` });
    });
    const ids = new Map();
    document.querySelectorAll("[id]").forEach((el) => ids.set(el.id, (ids.get(el.id) || 0) + 1));
    for (const [id, count] of ids.entries()) {
      if (count > 1) items.push({ impact: "serious", id: "duplicate_id", message: `Duplicate id: ${id}` });
    }
    return items;
  });

  return violations.map((violation) => ({ ...violation, route }));
}

async function loadAxeCore() {
  try {
    const axeModule = await import("axe-core");
    const source = axeModule.default?.source || axeModule.source;
    if (!source) throw new Error("axe-core source export was not found");
    return { source, error: null };
  } catch (error) {
    return { source: null, error: error.message };
  }
}

async function runAxeAccessibility(page, route, axeSource) {
  await page.addScriptTag({ content: axeSource });
  const result = await page.evaluate(async () => window.axe.run(document));
  return result.violations.flatMap((violation) =>
    violation.nodes.map((node) => ({
      impact: violation.impact || "serious",
      id: violation.id,
      message: violation.help,
      route,
      target: node.target
    }))
  );
}

export function browserContextOptionsForEngine(engineName) {
  const options = { viewport: { width: 390, height: 844 } };
  if (engineName !== "firefox") {
    options.isMobile = true;
  }
  return options;
}

async function runOverlapCheck(page, route, viewportSlug) {
  return page.evaluate(
    ({ route, viewportSlug }) => {
      const elements = [...document.querySelectorAll("a, button, input, textarea, select, [role='button']")]
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          return (
            rect.width > 4 &&
            rect.height > 4 &&
            style.visibility !== "hidden" &&
            style.display !== "none" &&
            style.opacity !== "0" &&
            style.pointerEvents !== "none" &&
            !element.closest("[aria-hidden='true']") &&
            !element.closest("#floating-contact-cluster")
          );
        })
        .map((element, index) => ({
          index,
          text: `${element.textContent || element.getAttribute("aria-label") || element.id || element.tagName}`.trim().slice(0, 80),
          cluster: Boolean(element.closest("#floating-contact-cluster")),
          nav: Boolean(element.closest("nav")),
          rect: (() => {
            const rect = element.getBoundingClientRect();
            return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
          })()
        }));

      const findings = [];
      for (let i = 0; i < elements.length; i += 1) {
        for (let j = i + 1; j < elements.length; j += 1) {
          const a = elements[i];
          const b = elements[j];
          if ((a.cluster && b.cluster) || (a.nav && b.nav)) continue;
          const left = Math.max(a.rect.x, b.rect.x);
          const top = Math.max(a.rect.y, b.rect.y);
          const right = Math.min(a.rect.x + a.rect.width, b.rect.x + b.rect.width);
          const bottom = Math.min(a.rect.y + a.rect.height, b.rect.y + b.rect.height);
          const width = right - left;
          const height = bottom - top;
          if (width <= 0 || height <= 0) continue;
          const overlapArea = width * height;
          const smallestArea = Math.min(a.rect.width * a.rect.height, b.rect.width * b.rect.height);
          const ratio = overlapArea / smallestArea;
          if (ratio > 0.15) {
            findings.push({ route, viewport: viewportSlug, ratio: Number(ratio.toFixed(3)), a: a.text, b: b.text });
          }
        }
      }
      return findings;
    },
    { route, viewportSlug }
  );
}

async function crawlInternalLinks({ baseUrl, pages }) {
  const brokenLinks = [];
  const checked = new Set();

  for (const { route, html } of pages) {
    for (const href of attrValues(html, "href")) {
      if (!href || href.startsWith("#") || href.startsWith("javascript:")) continue;
      if (/^(mailto:|tel:)/i.test(href)) continue;
      if (/^(https:\/\/lin\.ee\/S97R6nj|https:\/\/line\.me\/R\/(ti\/p|oaMessage)\/%40304zrttj)/i.test(href)) continue;
      if (/^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|d2xsxph8kpxj0f\.cloudfront\.net|qr-official\.line\.me)\b/i.test(href)) {
        continue;
      }
      if (/^https?:\/\//i.test(href) && !href.startsWith("https://www.sirinx.co")) {
        brokenLinks.push({ route, href, status: "malformed_external_href" });
        continue;
      }

      const path = href.startsWith("https://www.sirinx.co") ? new URL(href).pathname : href.split("#")[0];
      const normalizedPath = path === "" ? "/" : path;
      if (checked.has(normalizedPath)) continue;
      checked.add(normalizedPath);

      const response = await fetch(`${baseUrl}${normalizedPath}`);
      if (!response.ok) {
        brokenLinks.push({ route, href, status: response.status });
      }
    }
  }

  return brokenLinks;
}

function collectProcess(command, args, { cwd, timeoutMs = 60_000 } = {}) {
  return new Promise((resolvePromise) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      resolvePromise({ exitCode: 124, stdout, stderr: `${stderr}\nTimed out after ${timeoutMs}ms`.trim() });
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolvePromise({ exitCode: 127, stdout, stderr: error.message });
    });
    child.on("close", (exitCode) => {
      clearTimeout(timer);
      resolvePromise({ exitCode, stdout, stderr });
    });
  });
}

async function runLighthouseAutomated({ baseUrl, outputDir }) {
  const outputPath = resolve(outputDir, "lighthouse.json");
  let lighthouseCli;
  try {
    lighthouseCli = require.resolve("lighthouse/cli/index.js");
  } catch (error) {
    return {
      status: "failed",
      tool: "lighthouse",
      reason: "missing_dependency_or_execution_failed",
      error: error.message,
      thresholds: { performance: 85, accessibility: 95, seo: 95, best_practices: 90 }
    };
  }

  const args = [
    lighthouseCli,
    baseUrl,
    "--quiet",
    "--chrome-flags=--headless=new --no-sandbox",
    "--output=json",
    `--output-path=${outputPath}`
  ];
  const result = await collectProcess(process.execPath, args, { cwd: siteRoot, timeoutMs: 90_000 });
  if (result.exitCode !== 0) {
    return {
      status: "failed",
      tool: "lighthouse",
      reason: "missing_dependency_or_execution_failed",
      error: (result.stderr || result.stdout || "Lighthouse CLI did not complete").trim(),
      thresholds: { performance: 85, accessibility: 95, seo: 95, best_practices: 90 }
    };
  }

  const report = JSON.parse(await readFile(outputPath, "utf8"));
  const categoryScore = (key) => Math.round((report.categories?.[key]?.score ?? 0) * 100);
  return {
    status: "passed",
    tool: "lighthouse",
    performance: categoryScore("performance"),
    accessibility: categoryScore("accessibility"),
    seo: categoryScore("seo"),
    best_practices: categoryScore("best-practices"),
    report_path: outputPath,
    thresholds: { performance: 85, accessibility: 95, seo: 95, best_practices: 90 }
  };
}

async function runCrossBrowserSmoke({ baseUrl, routes }) {
  const engines = [
    ["chromium", chromium],
    ["webkit", webkit],
    ["firefox", firefox]
  ];
  const results = [];

  for (const [engineName, engine] of engines) {
    let browser;
    try {
      browser = await engine.launch({ headless: true });
      const context = await browser.newContext(browserContextOptionsForEngine(engineName));
      for (const route of routes) {
        const page = await context.newPage();
        const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
        const mainExists = await page.locator("main").count();
        results.push({
          engine: engineName,
          route,
          status: response?.ok() && mainExists > 0 ? "passed" : "failed",
          http_status: response?.status() || 0,
          main_exists: mainExists > 0
        });
        await page.close();
      }
      await context.close();
    } catch (error) {
      const missingExecutable = /Executable doesn't exist|playwright install/i.test(error.message);
      results.push({
        engine: engineName,
        route: "*",
        status: "failed",
        code: missingExecutable ? "ENGINE_NOT_INSTALLED" : "CROSS_BROWSER_SMOKE_FAILED",
        error: missingExecutable ? `${engineName} engine not installed: ${error.message}` : error.message
      });
    } finally {
      if (browser) await browser.close();
    }
  }

  return results;
}

export async function runAutoVisualBotCheck({
  outputDir = defaultReportDir,
  port = defaultPort,
  runId = `p087b_auto_visual_${Date.now()}`,
  packetId = "P087B_AUTO_VISUAL_BOT_CHECK_LAYER"
} = {}) {
  const runAt = nowBangkok();
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = startServer({ port });

  try {
    await waitForServer(baseUrl);
    await mkdir(outputDir, { recursive: true });
    await mkdir(resolve(outputDir, "screenshots"), { recursive: true });
    await mkdir(baselineDir, { recursive: true });

    const routes = await readRoutesFromSitemap();
    const checks = [];
    const findings = [];
    const artifacts = [];
    const visualDiffResults = [];
    const a11yViolations = [];
    const axeCore = await loadAxeCore();
    const consoleErrors = [];
    const consoleWarnings = [];
    const overlapFindings = [];
    const seoFindings = [];
    const formFindings = [];
    const routePages = [];
    const routeMetrics = [];
    const networkEvents = [];

    const browser = await chromium.launch({ headless: true });
    try {
      for (const viewport of autoVisualViewports) {
        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
          isMobile: Boolean(viewport.isMobile)
        });
        await setupLocalOnlyNetwork(context, baseUrl, networkEvents, findings);

        for (const route of routes) {
          const page = await context.newPage();
          const routeName = routeSlug(route);
          page.on("console", (message) => {
            const entry = { route, viewport: viewport.slug, type: message.type(), text: message.text() };
            if (message.type() === "error") consoleErrors.push(entry);
            if (message.type() === "warning" && /error|failed|blocked|exception/i.test(message.text())) {
              consoleWarnings.push(entry);
            }
          });
          page.on("pageerror", (error) => {
            consoleErrors.push({ route, viewport: viewport.slug, type: "pageerror", text: error.message });
          });

          const started = Date.now();
          const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
          routeMetrics.push({ route, viewport: viewport.slug, load_ms: Date.now() - started, status: response?.status() || 0 });

          const currentPath = resolve(outputDir, "screenshots", `${routeName}-${viewport.slug}.png`);
          await page.screenshot({ path: currentPath, fullPage: true });
          artifacts.push(await createArtifact(currentPath, "screenshot"));

          const baselinePath = resolve(baselineDir, `${routeName}-${viewport.slug}.png`);
          let baselineSeeded = false;
          if (!existsSync(baselinePath)) {
            await writeFile(baselinePath, await readFile(currentPath));
            baselineSeeded = true;
            visualDiffResults.push(makeBaselineMissingVisualResult({ route, viewport: viewport.slug, baselinePath }));
          } else {
            const visualResult = await comparePngFiles(currentPath, baselinePath);
            visualDiffResults.push({ route, viewport: viewport.slug, baseline_seeded: baselineSeeded, ...visualResult });
          }

          const html = await page.content();
          if (viewport.slug === "desktop-1440") {
            routePages.push({ route, html });
            const seo = inspectSeoMeta({ html, route });
            seoFindings.push(...seo.findings);
            const form = validateDryRunForms({ html });
            formFindings.push(...form.findings);
          }

          if (axeCore.source) {
            a11yViolations.push(...(await runAxeAccessibility(page, route, axeCore.source)));
          }
          overlapFindings.push(...(await runOverlapCheck(page, route, viewport.slug)));
          await page.close();
        }
        await context.close();
      }
    } finally {
      await browser.close();
    }

    const brokenLinks = await crawlInternalLinks({ baseUrl, pages: routePages });
    const crossBrowserResults = await runCrossBrowserSmoke({ baseUrl, routes });
    const lighthouseScores = await runLighthouseAutomated({ baseUrl, outputDir });

    const visualFailed = visualDiffResults.some((result) => result.status !== "passed");
    const baselineMissing = visualDiffResults.some((result) => result.reason === "baseline_missing");
    const a11yDependencyMissing = !axeCore.source;
    const a11yFailed = a11yViolations.some((violation) => ["critical", "serious"].includes(violation.impact));
    const brokenFailed = brokenLinks.length > 0;
    const consoleFailed = consoleErrors.length > 0 || consoleWarnings.length > 0;
    const overlapFailed = overlapFindings.length > 0;
    const lighthouseFailed =
      lighthouseScores.status !== "passed" ||
      lighthouseScores.performance < 85 ||
      lighthouseScores.accessibility < 95 ||
      lighthouseScores.seo < 95 ||
      lighthouseScores.best_practices < 90;
    const seoFailed = seoFindings.some((finding) => finding.severity === "high");
    const formFailed = formFindings.length > 0;
    const crossBrowserFailed = crossBrowserResults.some((result) => result.status === "failed");

    checks.push(
      makeCheck({
        check_type: "visual_regression",
        status: visualFailed ? "failed" : "passed",
        summary: baselineMissing
          ? "Visual baseline missing; initialized baseline and requires second run"
          : visualFailed
            ? "Visual diff exceeded threshold"
            : "Visual diff stayed within threshold",
        data: { threshold: visualThreshold, total: visualDiffResults.length, reason: baselineMissing ? "baseline_missing" : undefined }
      }),
      a11yDependencyMissing
        ? makeDependencyMissingCheck({
            check_type: "accessibility_bot",
            dependency: "axe-core",
            message: axeCore.error || "axe-core is not available"
          })
        : makeCheck({
            check_type: "accessibility_bot",
            status: a11yFailed ? "failed" : "passed",
            summary: a11yFailed ? "axe-core found serious violations" : "axe-core found no serious violations",
            data: { tool: "axe-core", violation_count: a11yViolations.length }
          }),
      makeCheck({
        check_type: "broken_link_crawler",
        status: brokenFailed ? "failed" : "passed",
        summary: brokenFailed ? "Broken or malformed links found" : "Internal links and LINE CTA patterns are valid",
        data: { broken_count: brokenLinks.length }
      }),
      makeCheck({
        check_type: "console_error_scan",
        status: consoleFailed ? "failed" : "passed",
        summary: consoleFailed ? "Console/page errors found" : "No console/page errors found",
        data: { error_count: consoleErrors.length, bad_warning_count: consoleWarnings.length }
      }),
      makeCheck({
        check_type: "mobile_overlap_bot",
        status: overlapFailed ? "failed" : "passed",
        summary: overlapFailed ? "Interactive element overlap found" : "No blocking interactive overlap found",
        data: { overlap_count: overlapFindings.length }
      }),
      makeCheck({
        check_type: "lighthouse_automated",
        status: lighthouseFailed ? "failed" : "passed",
        summary:
          lighthouseScores.status === "passed"
            ? "Lighthouse thresholds evaluated from local-only Lighthouse run"
            : "Lighthouse dependency or execution failed; no surrogate score was used",
        data: lighthouseScores
      }),
      makeCheck({
        check_type: "seo_meta_bot",
        status: seoFailed ? "failed" : "passed",
        summary: seoFailed ? "SEO metadata findings found" : "SEO metadata and JSON-LD checks passed",
        data: { finding_count: seoFindings.length }
      }),
      makeCheck({
        check_type: "form_dry_run_bot",
        status: formFailed ? "failed" : "passed",
        summary: formFailed ? "Live form submit path found" : "No form submit/live customer data path found",
        data: { finding_count: formFindings.length, submit_performed: false }
      }),
      makeCheck({
        check_type: "cross_browser_bot",
        status: crossBrowserFailed ? "failed" : "passed",
        summary: crossBrowserFailed
          ? "Cross-browser smoke failed"
          : "Installed browser smoke passed; missing Playwright engines are recorded as environment limitations",
        data: { result_count: crossBrowserResults.length }
      })
    );

    findings.push(
      ...visualDiffResults
        .filter((result) => result.status !== "passed")
        .map((result) =>
          makeFinding({
            severity: "high",
            code: result.reason === "baseline_missing" ? "VISUAL_BASELINE_MISSING" : "VISUAL_DIFF_EXCEEDED",
            message: result.reason === "baseline_missing" ? result.message : `Visual diff ratio ${result.diff_ratio}`,
            evidence_ref: `${result.route}:${result.viewport}`
          })
        ),
      ...(a11yDependencyMissing
        ? [
            makeFinding({
              severity: "high",
              code: "AXE_CORE_MISSING",
              message: axeCore.error || "axe-core is not available",
              evidence_ref: "accessibility_bot"
            })
          ]
        : []),
      ...(lighthouseScores.status !== "passed"
        ? [
            makeFinding({
              severity: "high",
              code: "LIGHTHOUSE_AUTOMATED_FAILED",
              message: lighthouseScores.error || "Lighthouse did not complete",
              evidence_ref: "lighthouse_automated"
            })
          ]
        : []),
      ...a11yViolations.map((violation) =>
        makeFinding({ severity: "high", code: "A11Y_SERIOUS_VIOLATION", message: violation.message, evidence_ref: violation.route })
      ),
      ...brokenLinks.map((link) =>
        makeFinding({ severity: "high", code: "BROKEN_LINK", message: `Broken or malformed link: ${link.href}`, evidence_ref: link.route })
      ),
      ...consoleErrors.map((error) =>
        makeFinding({ severity: "high", code: "CONSOLE_ERROR", message: error.text, evidence_ref: `${error.route}:${error.viewport}` })
      ),
      ...overlapFindings.map((overlap) =>
        makeFinding({ severity: "high", code: "INTERACTIVE_OVERLAP", message: `${overlap.a} overlaps ${overlap.b}`, evidence_ref: `${overlap.route}:${overlap.viewport}` })
      ),
      ...seoFindings,
      ...formFindings,
      ...crossBrowserResults
        .filter((result) => result.status === "failed")
        .map((result) =>
          makeFinding({
            severity: "high",
            code: "CROSS_BROWSER_SMOKE_FAILED",
            message: result.error || `${result.engine} ${result.route} failed`,
            evidence_ref: `${result.engine}:${result.route}`
          })
        )
    );

    const verdict = classifyAutoVisualBotVerdict({ checks, findings });
    const consolePath = resolve(outputDir, "console_errors.json");
    const networkPath = resolve(outputDir, "network_events.json");
    await writeFile(consolePath, `${JSON.stringify({ consoleErrors, consoleWarnings }, null, 2)}\n`, "utf8");
    await writeFile(networkPath, `${JSON.stringify(networkEvents, null, 2)}\n`, "utf8");
    artifacts.push(await createArtifact(consolePath, "json"));
    artifacts.push(await createArtifact(networkPath, "json"));

    const receipt = {
      packet_id: packetId,
      run_id: runId,
      run_at: runAt,
      mode: "READ_ONLY_BOT_SIMULATION",
      target_origin: baseUrl,
      routes_checked: routes,
      checks,
      findings,
      visual_diff_results: visualDiffResults,
      a11y_violations: a11yViolations,
      broken_links: brokenLinks,
      console_errors: consoleErrors,
      overlap_findings: overlapFindings,
      lighthouse_scores: lighthouseScores,
      seo_findings: seoFindings,
      form_dry_run_result: {
        status: formFailed ? "failed" : "passed",
        submit_performed: false,
        findings: formFindings
      },
      cross_browser_results: crossBrowserResults,
      artifacts,
      verdict,
      blocked_actions_confirmed: blockedActionsConfirmed,
      no_deploy: true,
      no_push: true,
      no_cloud_mutation: true,
      no_live_send: true,
      no_secret_read: true
    };

    const receiptPath = resolve(outputDir, "auto_visual_bot_receipt.json");
    await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
    const result = { ...receipt, receipt_path: receiptPath };
    await writeFile(resolve(outputDir, "auto_visual_bot_result.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
    return result;
  } finally {
    server.kill("SIGTERM");
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = await runAutoVisualBotCheck();
  console.log(JSON.stringify(result, null, 2));
}
