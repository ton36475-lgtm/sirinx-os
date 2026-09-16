import { mkdir, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

const repoRoot = resolve(new URL("../../../", import.meta.url).pathname);
const fixturePath = resolve(repoRoot, "apps/dev-dashboard/fixtures/control-plane-status-card-visual-smoke.html");
const screenshotPath = resolve(repoRoot, "reports/screenshots/control-plane-status-card-p109-20260705.png");
const manifestPath = resolve(repoRoot, "reports/screenshots/control-plane-status-card-p109-20260705.json");

const viewport = { width: 1280, height: 960 };
const minBytes = 20_000;

await mkdir(dirname(screenshotPath), { recursive: true });

let browser;

try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport });

  await page.route("**/*", (route) => {
    const url = route.request().url();
    if (url.startsWith("file:") || url.startsWith("data:")) {
      route.continue();
      return;
    }
    route.abort("blockedbyclient");
  });

  await page.goto(pathToFileURL(fixturePath).href, { waitUntil: "domcontentloaded" });
  const panel = page.locator(".control-plane-panel");
  await panel.waitFor({ state: "visible", timeout: 5_000 });

  const assertions = {
    title: await page.getByText("GhostClaw Control Plane").isVisible(),
    subtitle: await page.getByRole("heading", { name: "Status Read Model" }).isVisible(),
    projects: await page.getByRole("heading", { name: "Active Projects" }).isVisible(),
    guardrails: await page.getByRole("heading", { name: "Guardrails" }).isVisible(),
    localOnlyCopy: await page.getByText("no live execution").isVisible(),
    providerBlocked: await page.getByText("provider call", { exact: true }).isVisible(),
    deployBlocked: await page.getByText("deploy", { exact: true }).isVisible(),
    cloudflareBlocked: await page.getByText("cloudflare r2 mutation", { exact: true }).isVisible()
  };

  const failedAssertions = Object.entries(assertions)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);

  if (failedAssertions.length) {
    throw new Error(`visual_assertion_failed:${failedAssertions.join(",")}`);
  }

  const box = await panel.boundingBox();
  if (!box || box.width < 900 || box.height < 500) {
    throw new Error(`panel_bounds_unexpected:${JSON.stringify(box)}`);
  }

  await panel.screenshot({ path: screenshotPath });
  const screenshotStat = await stat(screenshotPath);
  if (screenshotStat.size < minBytes) {
    throw new Error(`screenshot_too_small:${screenshotStat.size}`);
  }

  const manifest = {
    status: "passed",
    packet_id: "P109_DASHBOARD_STATUS_CARD_SCREENSHOT_PROOF",
    mode: "local_file_fixture_browser_capture",
    fixture_path: fixturePath,
    screenshot_path: screenshotPath,
    screenshot_bytes: screenshotStat.size,
    viewport,
    panel_bounds: box,
    assertions,
    network_policy: "file_and_data_urls_only",
    live_actions: false,
    server_started: false,
    worker_execution: false,
    provider_call: false,
    live_telegram_send: false,
    secret_read: false,
    install: false,
    push: false,
    deploy: false,
    cloudflare_r2_mutation: false,
    database_migration: false,
    created_at: new Date().toISOString()
  };

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(manifest, null, 2));
} catch (error) {
  const manifest = {
    status: "failed",
    packet_id: "P109_DASHBOARD_STATUS_CARD_SCREENSHOT_PROOF",
    mode: "local_file_fixture_browser_capture",
    fixture_path: fixturePath,
    screenshot_path: screenshotPath,
    reason: error?.message || "unknown",
    live_actions: false,
    server_started: false,
    worker_execution: false,
    provider_call: false,
    live_telegram_send: false,
    secret_read: false,
    install: false,
    push: false,
    deploy: false,
    cloudflare_r2_mutation: false,
    database_migration: false,
    created_at: new Date().toISOString()
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.error(JSON.stringify(manifest, null, 2));
  process.exitCode = 1;
} finally {
  if (browser) {
    await browser.close();
  }
}
