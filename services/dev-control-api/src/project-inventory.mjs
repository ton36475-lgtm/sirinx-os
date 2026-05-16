import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const githubAuditRoot = "/Users/sirinx/restore-sources/github-audit";

const repositories = [
  {
    name: "sirinx",
    remote: "https://github.com/ton36475-lgtm/sirinx",
    localPath: "/Users/sirinx/restore-sources/ton36475-lgtm-sirinx",
    role: "public-company-website-source",
    deployFit: "locked-main",
    recommendation: "Keep as the source of truth for www.sirinx.co. Do not mix internal apps into this surface."
  },
  {
    name: "sirinx-os",
    remote: "local",
    localPath: "/Users/sirinx/sirinx-os",
    role: "website-management-hq",
    deployFit: "internal-subdomain",
    recommendation: "Use for local HQ, read-only website status, Obsidian, Hermes, and release gates."
  },
  {
    name: "hermes-agent",
    remote: "https://github.com/NousResearch/hermes-agent",
    localPath: "/Users/sirinx/.hermes/hermes-agent",
    role: "local-agent-runtime-and-messaging-gateway",
    deployFit: "local-host-control-plane",
    recommendation: "Use as the local agent runtime, dashboard, and messaging gateway. Keep credentials in Hermes secret storage and do not expose the dashboard publicly."
  },
  {
    name: "sirinx-solar-energy",
    remote: "https://github.com/ton36475-lgtm/sirinx-solar-energy",
    localPath: `${githubAuditRoot}/sirinx-solar-energy`,
    role: "admin-customer-contractor-suite",
    deployFit: "subdomain-candidate",
    recommendation: "Split into admin/customer/contractor/API subdomains only after secret cleanup and build verification."
  },
  {
    name: "oz-corp-omega-dual-node",
    remote: "https://github.com/ton36475-lgtm/oz-corp-omega-dual-node",
    localPath: "/Users/sirinx/OZ-CORP-MONOREPO",
    role: "legacy-warroom-and-agent-scaffold",
    deployFit: "internal-only",
    recommendation: "Keep away from public homepage. Use as internal agent/ops reference after dirty worktree review."
  },
  {
    name: "openclaw-worker",
    remote: "git@github.com:ton36475-lgtm/sirinx-unified-os.git",
    localPath: "/Users/sirinx/OZ-CORP/services/openclaw-worker",
    role: "legacy-worker-reference",
    deployFit: "internal-reference-only",
    recommendation: "Use as a reference for worker behavior only after dirty worktree review. Do not connect to public routes without a new security review."
  },
  {
    name: "thClaws",
    remote: "https://github.com/thClaws/thClaws",
    localPath: "/Users/sirinx/thClaws",
    role: "agent-tooling-reference",
    deployFit: "local-reference-only",
    recommendation: "Keep as local tooling/reference. Do not merge into SIRINX production surfaces without scoped review."
  },
  {
    name: "automation-dashboard",
    remote: "https://github.com/ton36475-lgtm/automation-dashboard",
    localPath: `${githubAuditRoot}/automation-dashboard`,
    role: "automation-ui",
    deployFit: "subdomain-candidate",
    recommendation: "Candidate for automation.sirinx.co after auth and backend boundary review."
  },
  {
    name: "automation-system-backend",
    remote: "https://github.com/ton36475-lgtm/automation-system-backend",
    localPath: `${githubAuditRoot}/automation-system-backend`,
    role: "automation-api-and-dashboard-backend",
    deployFit: "backend-candidate",
    recommendation: "Candidate for automation-api.sirinx.co after database, Redis, webhook, and auth hardening."
  },
  {
    name: "automated-marketing-agency",
    remote: "https://github.com/ton36475-lgtm/automated-marketing-agency",
    localPath: `${githubAuditRoot}/automated-marketing-agency`,
    role: "marketing-ops",
    deployFit: "internal-subdomain",
    recommendation: "Candidate for marketing.sirinx.co after tenant/auth and webhook egress review."
  },
  {
    name: "sirinx-co",
    remote: "https://github.com/ton36475-lgtm/sirinx-co",
    localPath: `${githubAuditRoot}/sirinx-co`,
    role: "old-placeholder-homepage",
    deployFit: "do-not-use-main",
    recommendation: "Archive or keep as historical reference. Do not restore to www.sirinx.co."
  },
  {
    name: "oz_mobile_app",
    remote: "https://github.com/ton36475-lgtm/oz_mobile_app",
    localPath: `${githubAuditRoot}/oz_mobile_app`,
    role: "mobile-and-worker-experiment",
    deployFit: "not-web-subdomain-first",
    recommendation: "Use only after mobile/backend scope is separated from SIRINX public website operations."
  },
  {
    name: "automation-mobile-app",
    remote: "https://github.com/ton36475-lgtm/automation-mobile-app",
    localPath: `${githubAuditRoot}/automation-mobile-app`,
    role: "mobile-automation-app",
    deployFit: "not-web-subdomain-first",
    recommendation: "Do not route to production subdomain until Expo/web build target is verified."
  },
  {
    name: "ghost-claw-os",
    remote: "https://github.com/ton36475-lgtm/ghost-claw-os",
    localPath: `${githubAuditRoot}/ghost-claw-os`,
    role: "mobile-os-experiment",
    deployFit: "not-web-subdomain-first",
    recommendation: "Large mobile app clone; keep out of website deployment path."
  },
  {
    name: "chokma-growth-os",
    remote: "https://github.com/ton36475-lgtm/chokma-growth-os",
    localPath: `${githubAuditRoot}/chokma-growth-os`,
    role: "separate-brand-growth-site",
    deployFit: "separate-domain",
    recommendation: "Keep outside sirinx.co unless explicitly approved as a partner/demo surface."
  }
];

const subdomainPlan = [
  {
    host: "www.sirinx.co",
    role: "public company website",
    source: "/Users/sirinx/restore-sources/ton36475-lgtm-sirinx",
    desiredState: "locked",
    action: "do-not-touch"
  },
  {
    host: "sirinx.co",
    role: "apex redirect",
    source: "/Users/sirinx/sirinx-os/infra/cloudflare/main-router",
    desiredState: "301-to-www",
    action: "monitor-only"
  },
  {
    host: "dev.sirinx.co",
    role: "developer command center",
    source: "/Users/sirinx/sirinx-os/apps/dev-dashboard",
    desiredState: "Cloudflare Access gated",
    action: "prepare-after-approval"
  },
  {
    host: "hq.sirinx.co",
    role: "Hermes/SIRINX HQ",
    source: "/Users/sirinx/sirinx-os",
    desiredState: "internal-only or Access gated",
    action: "prepare-after-approval"
  },
  {
    host: "admin.sirinx.co",
    role: "solar admin/core dashboard",
    source: `${githubAuditRoot}/sirinx-solar-energy/sirinx-app`,
    desiredState: "private admin app",
    action: "verify-build-first"
  },
  {
    host: "customer.sirinx.co",
    role: "customer portal",
    source: `${githubAuditRoot}/sirinx-solar-energy/sirinx-customer`,
    desiredState: "authenticated customer app",
    action: "verify-build-first"
  },
  {
    host: "contractor.sirinx.co",
    role: "contractor portal",
    source: `${githubAuditRoot}/sirinx-solar-energy/sirinx-contractor`,
    desiredState: "authenticated contractor app",
    action: "verify-build-first"
  },
  {
    host: "api.sirinx.co",
    role: "API proxy",
    source: `${githubAuditRoot}/sirinx-solar-energy/cloudflare/worker-api-proxy`,
    desiredState: "Worker route after .com to .co rewrite",
    action: "blocked-until-config-review"
  },
  {
    host: "cdn.sirinx.co",
    role: "image optimizer",
    source: `${githubAuditRoot}/sirinx-solar-energy/cloudflare/worker-image-optimizer`,
    desiredState: "Worker route after .com to .co rewrite",
    action: "blocked-until-config-review"
  },
  {
    host: "automation.sirinx.co",
    role: "automation dashboard",
    source: `${githubAuditRoot}/automation-dashboard`,
    desiredState: "Access gated internal app",
    action: "verify-build-first"
  },
  {
    host: "marketing.sirinx.co",
    role: "marketing operations",
    source: `${githubAuditRoot}/automated-marketing-agency`,
    desiredState: "Access gated internal app",
    action: "verify-build-first"
  }
];

const integrationGates = [
  {
    channel: "Codex Mobile",
    currentSource: "Codex App host on Mac mini, Codex CLI, local projects, plugins, MCP, browser, and Computer Use configuration",
    status: "host-ready-manual-qr-required",
    reason: "Codex App and CLI are installed and the Mac is configured to stay awake on AC power. Pairing still requires the user to scan the Codex mobile QR and confirm the same ChatGPT account/workspace on the phone."
  },
  {
    channel: "Hermes Gateway",
    currentSource: "Hermes dashboard and messaging gateway on this Mac mini",
    status: "local-running-approval-gated",
    reason: "Hermes dashboard and gateway are running locally. Production messaging must remain blocked until channel secrets, allowed users, and approval gates are reviewed."
  },
  {
    channel: "Telegram",
    currentSource: "Hermes gateway and sirinx-solar-energy scripts",
    status: "gateway-connected-send-target-invalid",
    reason: "Hermes gateway reports Telegram connected, but the configured home target is not deliverable and channel discovery is empty. Rotate/confirm the bot token, start or add the bot to the intended chat, then set a valid home channel."
  },
  {
    channel: "LINE OA",
    currentSource: "SIRINX docs and data models only",
    status: "not-configured",
    reason: "No production-safe LINE adapter or channel credential was found in this flow. Keep LINE sends disabled until channel secret, webhook verification, and approval gates exist."
  },
  {
    channel: "GitHub",
    currentSource: "gh auth and shallow audit clones",
    status: "public-website-pr-open",
    reason: "Public website ahead commits were pushed to codex/public-website-production-ready-20260517 and draft PR #1 was opened against main."
  },
  {
    channel: "Cloudflare",
    currentSource: "Wrangler cached binary and existing OAuth session",
    status: "main-router-deployed-smoke-passed",
    reason: "sirinx-main-router was deployed to sirinx.co routes and the production lead handler passed a controlled POST smoke test against D1."
  },
  {
    channel: "Supabase",
    currentSource: "app dependencies and future app configs",
    status: "not-connected-for-this-flow",
    reason: "Do not connect database-backed subdomains until schemas, env names, and RLS policy are reviewed."
  }
];

const blockers = [
  {
    id: "telegram-token-rotation",
    severity: "critical",
    area: "Telegram",
    summary: "Hardcoded Telegram bot-token patterns were found in the sirinx-solar-energy audit copy.",
    requiredAction: "Revoke/rotate affected bot token, remove literals from source history, and use secret storage only."
  },
  {
    id: "cloudflare-domain-rewrite",
    severity: "high",
    area: "Cloudflare",
    summary: "Several legacy Cloudflare configs point at sirinx.com, while production target is sirinx.co. Cleanup scope is documented in SIRINX_CLOUDFLARE_DOMAIN_CONFIG_CLEANUP_PLAN.md.",
    requiredAction: "Rewrite only the selected deployment source after route review; do not deploy legacy workers over www.sirinx.co."
  },
  {
    id: "main-site-protection",
    severity: "high",
    area: "Public website",
    summary: "www.sirinx.co is live and must stay isolated from internal apps.",
    requiredAction: "Deploy new surfaces only to subdomains and keep apex redirect/main router unchanged unless explicitly approved."
  },
  {
    id: "lead-capture-backend-monitoring",
    severity: "medium",
    area: "Public website",
    summary: "Cloudflare main-router lead handler is deployed and a controlled production POST smoke test created D1 lead ec8dd128-a57c-4d6d-b0f8-4b91c1b94c2b.",
    requiredAction: "Monitor real contact submissions and keep the public website contact fallback until production traffic has been observed."
  },
  {
    id: "oz-monorepo-dirty",
    severity: "medium",
    area: "Repo hygiene",
    summary: "OZ-CORP-MONOREPO has existing uncommitted changes and untracked files.",
    requiredAction: "Checkpoint or isolate before using it as any deployment source."
  },
  {
    id: "env-files-present",
    severity: "medium",
    area: "Secrets",
    summary: "Some local repos contain .env files or examples. Values were not read.",
    requiredAction: "Review secret handling manually before any external service connection."
  }
];

async function checkHttp(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1800);

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
      branch: branch.stdout.trim() || "unknown",
      commit: commit.stdout.trim(),
      dirty: Boolean(status.stdout.trim())
    };
  } catch (error) {
    return {
      branch: "unknown",
      commit: "",
      dirty: false,
      error: error.code || "git_unavailable"
    };
  }
}

export async function getProjectInventory() {
  const [subdomainStatus, repoState] = await Promise.all([
    Promise.all(subdomainPlan.map((entry) => checkHttp(`https://${entry.host}`))),
    Promise.all(
      repositories.map(async (repo) => ({
        ...repo,
        git: await gitSummary(repo.localPath)
      }))
    )
  ]);

  const subdomains = subdomainPlan.map((entry) => ({
    ...entry,
    current: subdomainStatus.find((status) => status.url === `https://${entry.host}`) || null
  }));

  const readySubdomains = subdomains.filter((entry) => entry.current?.online).length;
  const blockedSubdomains = subdomains.filter((entry) => entry.action.startsWith("blocked")).length;
  const dirtyRepos = repoState.filter((repo) => repo.git?.dirty).length;

  return {
    title: "SIRINX project and subdomain inventory",
    mode: "read-only",
    mainWebsiteProtected: true,
    externalWrites: false,
    summary: {
      repositories: repoState.length,
      subdomains: subdomains.length,
      readySubdomains,
      blockedSubdomains,
      integrationGates: integrationGates.length,
      blockers: blockers.length,
      dirtyRepos
    },
    repositories: repoState,
    subdomains,
    integrationGates,
    blockers,
    nextActions: [
      "Run pnpm night-watch before unattended periods so Hermes/Codex records current status into Obsidian.",
      "Review /api/lead-health. Production main-router is deployed and the handler is observed on safe GET probes.",
      "Monitor production lead D1 rows after real traffic; controlled smoke lead id ec8dd128-a57c-4d6d-b0f8-4b91c1b94c2b can be archived later.",
      "Open Codex App on the Mac, use Set up Codex mobile or Settings > Connections, scan the QR from ChatGPT mobile, and confirm the same workspace.",
      "Use /Users/sirinx/sirinx-os/docs/knowledge/MAC_MINI_CODEX_HERMES_CONTROL_PLANE.md as the mobile operating runbook.",
      "Keep www.sirinx.co contact fallback as live mitigation until production lead POST is verified.",
      "Monitor the 77 province SEO routes and sitemap without changing www.sirinx.co unless a deploy is approved.",
      "Fix Telegram target setup: rotate/confirm token, start or add the bot to the intended chat, then update the Hermes home channel.",
      "Review and merge public website PR #1 when ready; branch codex/public-website-production-ready-20260517 is pushed.",
      "Choose first subdomain candidate: dev.sirinx.co, admin.sirinx.co, customer.sirinx.co, or contractor.sirinx.co.",
      "Run build checks for the selected subdomain source without modifying www.sirinx.co.",
      "Prepare Cloudflare Access/DNS/Pages plan for review before any external write.",
      "Keep www.sirinx.co and sirinx.co router unchanged unless explicitly approved."
    ],
    updatedAt: new Date().toISOString()
  };
}
