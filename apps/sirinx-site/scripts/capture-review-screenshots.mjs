import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { chromium } from "@playwright/test";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const repoRoot = resolve(root, "..", "..");
const defaultPort = Number(process.env.SIRINX_SITE_REVIEW_PORT || 18731);
const defaultOutputDir =
  process.env.SIRINX_SITE_REVIEW_SCREENSHOT_DIR || `/tmp/sirinx-site-review-screenshots-${Date.now()}`;

export const reviewTargets = [
  { slug: "home", path: "/" },
  { slug: "line", path: "/line/" },
  { slug: "contact", path: "/contact/" },
  { slug: "projects", path: "/projects/" },
  { slug: "trust-center", path: "/trust-center/" },
  { slug: "quote", path: "/quote/" },
  { slug: "roi-calculator", path: "/roi-calculator/" }
];

export const reviewViewports = [
  { slug: "desktop", width: 1440, height: 1100 },
  { slug: "mobile", width: 390, height: 1200, isMobile: true }
];

export function createScreenshotManifest({ outputDir, baseUrl, screenshots }) {
  return {
    created_at: new Date().toISOString(),
    mode: "local_only_visual_review_evidence",
    base_url: baseUrl,
    output_dir: outputDir,
    routes: reviewTargets.map((target) => target.path),
    viewports: reviewViewports.map(({ slug, width, height }) => ({ slug, width, height })),
    screenshots
  };
}

function startServer({ port }) {
  const child = spawn(process.execPath, ["server.mjs"], {
    cwd: root,
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
      // Keep polling until the server is ready or the deadline expires.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }

  throw new Error(`Local preview server did not become ready at ${baseUrl}`);
}

export async function captureReviewScreenshots({ outputDir = defaultOutputDir, port = defaultPort } = {}) {
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = startServer({ port });
  const screenshots = [];

  try {
    await waitForServer(baseUrl);
    await mkdir(outputDir, { recursive: true });

    const browser = await chromium.launch({ headless: true });
    try {
      for (const viewport of reviewViewports) {
        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
          isMobile: Boolean(viewport.isMobile)
        });
        const page = await context.newPage();

        for (const target of reviewTargets) {
          await page.goto(`${baseUrl}${target.path}`, { waitUntil: "networkidle" });
          const screenshotPath = resolve(outputDir, `${target.slug}-${viewport.slug}.png`);
          await page.screenshot({ path: screenshotPath, fullPage: true });
          screenshots.push({
            route: target.path,
            viewport: viewport.slug,
            path: screenshotPath
          });
        }

        await context.close();
      }
    } finally {
      await browser.close();
    }

    const manifest = createScreenshotManifest({ outputDir, baseUrl, screenshots });
    const manifestPath = resolve(outputDir, "manifest.json");
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
    return { ...manifest, manifest_path: manifestPath };
  } finally {
    server.kill("SIGTERM");
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const manifest = await captureReviewScreenshots();
  await writeFile(
    resolve(repoRoot, "_A2A_QUEUE", "outbox", "packet_058_sirinx_website_review_screenshot_evidence.json"),
    JSON.stringify(
      {
        packet_id: "packet_058_sirinx_website_review_screenshot_evidence",
        created_at: new Date().toISOString(),
        status: "verified_locally",
        mode: "local_only_visual_review_evidence",
        screenshot_manifest: manifest.manifest_path,
        screenshot_output_dir: manifest.output_dir,
        screenshot_count: manifest.screenshots.length,
        routes: manifest.routes,
        viewports: manifest.viewports,
        closed_gates: [
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
        ],
        next_safe_action:
          "Human review the screenshot manifest and local website, scan LINE QR on a real device, and manually confirm existing bot/inquiry behavior before any explicit staging, push, or deploy gate."
      },
      null,
      2
    ),
    "utf8"
  );
  console.log(JSON.stringify(manifest, null, 2));
}
