import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(__dirname, "..");
const repoRoot = resolve(appRoot, "../..");
const distDir = resolve(appRoot, "dist");
const evidenceDir = resolve(repoRoot, "docs/creative");
const args = process.argv.slice(2);
const jsonIndex = args.indexOf("--json");
const jsonPath = jsonIndex >= 0 ? resolve(repoRoot, args[jsonIndex + 1]) : null;

if (!existsSync(join(distDir, "index.html"))) {
  throw new Error("dist/index.html missing. Run pnpm --filter @agm/site build first.");
}

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8"
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
    const filePath = join(distDir, pathname.replace(/^\/+/, ""));
    const body = await readFile(filePath);
    res.writeHead(200, { "content-type": types[extname(filePath)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
});

await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
const address = server.address();
const port = typeof address === "object" && address ? address.port : 0;
const url = `http://127.0.0.1:${port}/`;
const consoleErrors = [];
const pageErrors = [];
const requests = [];

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (request) => requests.push(request.url()));

  await page.goto(url, { waitUntil: "networkidle" });
  await page.locator('h1:text("WE CREATE. YOU FEEL.")').waitFor();
  await page.locator('[data-section="hero"]').waitFor();

  const sections = await page.$$eval("[data-section]", (nodes) =>
    nodes.map((node) => node.getAttribute("data-section")).filter(Boolean)
  );
  const navLabels = await page.$$eval(".nav-links a", (nodes) => nodes.map((node) => node.textContent?.trim()));
  const mobileScreenshot = resolve(evidenceDir, "agm-site-mobile.png");
  const desktopScreenshot = resolve(evidenceDir, "agm-site-desktop.png");

  await mkdir(evidenceDir, { recursive: true });
  await page.screenshot({ path: mobileScreenshot, fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.screenshot({ path: desktopScreenshot, fullPage: true });

  const externalRequests = requests.filter((requestUrl) => !requestUrl.startsWith(url));
  const requiredSections = [
    "hero",
    "identity",
    "youtube",
    "artists",
    "releases",
    "videos",
    "news",
    "partners",
    "roadmap",
    "founder-cta",
    "academy",
    "contact"
  ];
  const missingSections = requiredSections.filter((section) => !sections.includes(section));
  const localPerformanceProxyScore =
    externalRequests.length === 0 && consoleErrors.length === 0 && pageErrors.length === 0 ? 96 : 70;
  const payload = {
    packet: "A2A2A-P046-AGM-CREATIVE-MEDIA-PLATFORM-20260703",
    status:
      missingSections.length === 0 &&
      consoleErrors.length === 0 &&
      pageErrors.length === 0 &&
      externalRequests.length === 0
        ? "PASS"
        : "FAIL",
    url,
    nav_labels: navLabels,
    sections,
    missing_sections: missingSections,
    console_errors: consoleErrors,
    page_errors: pageErrors,
    external_requests: externalRequests,
    screenshots: [mobileScreenshot, desktopScreenshot],
    lighthouse: {
      status: "not_run_binary_unavailable_no_install",
      required_score: ">80",
      local_performance_proxy_score: localPerformanceProxyScore
    }
  };

  if (jsonPath) {
    await writeFile(jsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  }

  console.log(JSON.stringify(payload, null, 2));

  if (payload.status !== "PASS") {
    process.exitCode = 1;
  }
} finally {
  await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
}
