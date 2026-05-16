import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const restoreRoot = "/Users/sirinx/restore-sources/ton36475-lgtm-sirinx";
const docsRoot = "/Users/sirinx/sirinx-os";

const publicRoutes = [
  "https://www.sirinx.co/",
  "https://www.sirinx.co/assessment",
  "https://www.sirinx.co/pricing",
  "https://www.sirinx.co/projects",
  "https://www.sirinx.co/solar-carport/phitsanulok",
  "https://www.sirinx.co/sitemap.xml",
  "https://sirinx.co/"
];

const knownPreviewDeployments = [
  "https://40065338.sirinx-co.pages.dev",
  "https://625a64af.sirinx-co.pages.dev",
  "https://4840209e.sirinx-co.pages.dev",
  "https://0c586301.sirinx-co.pages.dev",
  "https://3952deb7.sirinx-co.pages.dev",
  "https://8a643ab0.sirinx-co.pages.dev"
];

async function checkHttp(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2200);

  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "manual",
      signal: controller.signal
    });

    return {
      url,
      online: response.status >= 200 && response.status < 400,
      status: response.status,
      location: response.headers.get("location") || ""
    };
  } catch (error) {
    return {
      url,
      online: false,
      status: null,
      error: error.name === "AbortError" ? "timeout" : "unreachable"
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function gitSummary(root) {
  try {
    const [commit, branch, status] = await Promise.all([
      execFileAsync("git", ["-C", root, "log", "-1", "--oneline"], {
        timeout: 1500,
        maxBuffer: 64 * 1024
      }),
      execFileAsync("git", ["-C", root, "branch", "--show-current"], {
        timeout: 1500,
        maxBuffer: 64 * 1024
      }),
      execFileAsync("git", ["-C", root, "status", "--short"], {
        timeout: 1500,
        maxBuffer: 64 * 1024
      })
    ]);

    return {
      root,
      branch: branch.stdout.trim() || "unknown",
      commit: commit.stdout.trim(),
      dirty: Boolean(status.stdout.trim())
    };
  } catch (error) {
    return {
      root,
      branch: "unknown",
      commit: "",
      dirty: false,
      error: error.code || "git_unavailable"
    };
  }
}

export async function getPublicWebsiteStatus() {
  const [routes, previews, restoreRepo, docsRepo] = await Promise.all([
    Promise.all(publicRoutes.map(checkHttp)),
    Promise.all(knownPreviewDeployments.map(checkHttp)),
    gitSummary(restoreRoot),
    gitSummary(docsRoot)
  ]);

  const primary = routes.find((route) => route.url === "https://www.sirinx.co/");
  const allPrimaryRoutesOnline = routes
    .filter((route) => route.url !== "https://sirinx.co/")
    .every((route) => route.online);

  return {
    name: "SIRINX public website",
    domain: "https://www.sirinx.co",
    project: "sirinx-co",
    provider: "Cloudflare Pages",
    sourceRepo: restoreRoot,
    docsRepo: docsRoot,
    status: primary?.online && allPrimaryRoutesOnline ? "live" : "check",
    primary,
    routes,
    previews,
    repos: {
      restore: restoreRepo,
      docs: docsRepo
    },
    management: {
      safeMode: true,
      externalWrites: false,
      requiresApprovalForDeploy: true,
      nextActions: [
        "Contact form email/LINE fallback is live; keep it active until production lead POST is verified.",
        "Local main-router lead handler is ready and covered by tests. Deploy only after explicit Cloudflare approval and D1 binding review.",
        "Use GET /api/lead-health in Command Center to confirm local readiness and no-write production probe state.",
        "Keep 77 province SEO pages and sitemap monitored.",
        "Confirm apex sirinx.co routing remains 301 to www.",
        "Decide production analytics architecture.",
        "Push restore-source commits after approval."
      ]
    },
    updatedAt: new Date().toISOString()
  };
}
