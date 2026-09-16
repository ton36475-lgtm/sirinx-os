import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(here, "..");
const repoRoot = resolve(siteRoot, "..", "..");

const repository = "ton36475-lgtm/sirinx-os";
const branch = "staging/godmode-master-os-v2";
const githubIndexPath = "apps/sirinx-site/src/index.html";
const localHomePath = "apps/sirinx-site/src/index.html";
const localLinePath = "apps/sirinx-site/src/line/index.html";
const reportPath = "docs/website/SIRINX_WEBSITE_GITHUB_LIVE_LOCAL_AUTOMATED_RECHECK_2026-07-03.md";
const packetPath = "_A2A_QUEUE/outbox/packet_065_sirinx_website_github_live_local_recheck_automation.json";

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

function sha256(value) {
  return createHash("sha256").update(value || "").digest("hex");
}

function extractTitle(html) {
  return html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() || "";
}

function containsSolarSignal(html) {
  return /Solar|โซล|Rooftop|Carport|BESS|EV Charger/i.test(html);
}

function containsLineSignal(html) {
  return /LINE|lin\.ee|304zrttj|S97R6nj/i.test(html);
}

function containsLineRouteLink(html) {
  return /href=["']\/line["']/.test(html);
}

function containsQrUrl(html) {
  return /qr-official\.line\.me\/gs\/M_304zrttj_GW\.png/.test(html);
}

function containsSolarContactRoute(html) {
  return /href=["']\/contact\?interest=solar-carport["']/.test(html);
}

function summarizeHtml(html) {
  return {
    bytes: Buffer.byteLength(html || ""),
    sha256: sha256((html || "").replace(/\r\n/g, "\n").trim()),
    title: extractTitle(html || ""),
    has_solar: containsSolarSignal(html || ""),
    has_line_signal: containsLineSignal(html || ""),
    has_line_route_link: containsLineRouteLink(html || ""),
    has_qr_url: containsQrUrl(html || ""),
    has_solar_contact_route: containsSolarContactRoute(html || ""),
    has_old_controlled_ai_title: /Controlled AI Operations|controlled AI operations/i.test(html || "")
  };
}

function tableCell(value) {
  return String(value ?? "-")
    .replace(/\r?\n/g, " ")
    .replace(/\|/g, "\\|")
    .trim();
}

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

async function git(args) {
  const { stdout } = await execFileAsync("git", args, { cwd: repoRoot });
  return stdout.trim();
}

async function collectGitMetadata() {
  const [localHead, remoteLine, statusShort, diffNameStatus] = await Promise.all([
    git(["rev-parse", "HEAD"]).catch((error) => `error:${error.message}`),
    git(["ls-remote", "--heads", "origin", branch]).catch((error) => `error:${error.message}`),
    git([
      "status",
      "--short",
      "--branch",
      "--",
      "apps/sirinx-site",
      "docs/website",
      "_A2A_QUEUE/outbox/packet_064_sirinx_website_github_connector_recheck.json",
      "_A2A_QUEUE/outbox/packet_065_sirinx_website_github_live_local_recheck_automation.json"
    ]).catch((error) => `error:${error.message}`),
    git(["diff", "--name-status", `origin/${branch}`, "--", "apps/sirinx-site"]).catch((error) => `error:${error.message}`)
  ]);
  const remoteBranchSha = remoteLine.startsWith("error:") ? "" : remoteLine.split(/\s+/)[0] || "";

  return {
    local_head_sha: localHead,
    remote_branch_sha: remoteBranchSha,
    branch_found: Boolean(remoteBranchSha),
    status_short: statusShort,
    website_diff_name_status: diffNameStatus
  };
}

async function fetchGithubBranchIndex() {
  const encodedPath = githubIndexPath.split("/").map(encodeURIComponent).join("/");
  const url = `https://api.github.com/repos/${repository}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "sirinx-local-review"
    }
  });

  if (!response.ok) {
    const fallback = await git(["show", `origin/${branch}:${githubIndexPath}`]);
    return {
      method: "github_contents_api_failed_git_show_fallback",
      url,
      status: response.status,
      blob_sha: "",
      content: fallback
    };
  }

  const payload = await response.json();
  return {
    method: "github_contents_api",
    url,
    status: response.status,
    blob_sha: payload.sha || "",
    content: Buffer.from(String(payload.content || "").replace(/\n/g, ""), "base64").toString("utf8")
  };
}

async function fetchHtml(url) {
  const response = await fetch(url, { redirect: "follow" });
  const html = await response.text();

  return {
    url: response.url,
    status: response.status,
    html
  };
}

export function createGithubLiveLocalRecheckPacket({
  createdAt,
  githubRead,
  gitMetadata,
  liveHome,
  liveLine,
  localHomeHtml,
  localLineHtml
}) {
  const githubBranchIndex = summarizeHtml(githubRead.content);
  const liveHomeSummary = summarizeHtml(liveHome.html);
  const liveLineSummary = summarizeHtml(liveLine.html);
  const localHomeSummary = summarizeHtml(localHomeHtml);
  const localLineSummary = summarizeHtml(localLineHtml);
  const localReviewTargetConfirmed =
    githubBranchIndex.has_old_controlled_ai_title &&
    !githubBranchIndex.has_line_route_link &&
    !githubBranchIndex.has_qr_url &&
    liveHomeSummary.has_solar &&
    localHomeSummary.has_solar &&
    localHomeSummary.has_line_route_link &&
    localLineSummary.has_qr_url;
  const status = localReviewTargetConfirmed
    ? "GITHUB_LIVE_LOCAL_RECHECK_READY_LOCAL_REVIEW_TARGET_CONFIRMED"
    : "GITHUB_LIVE_LOCAL_RECHECK_REQUIRES_ATTENTION";

  return {
    packet_id: "packet_065_sirinx_website_github_live_local_recheck_automation",
    created_at: createdAt,
    lane: "codex_builder",
    mode: "local_only_read_only_github_live_local_recheck_no_push_no_deploy",
    scope: "apps/sirinx-site",
    status,
    repository,
    branch,
    github_read: {
      read_only: true,
      method: githubRead.method,
      status: githubRead.status,
      fetched_file: githubIndexPath,
      fetched_blob_sha: githubRead.blob_sha,
      mutation_performed: false
    },
    git_metadata: gitMetadata,
    source_comparison: {
      github_branch_index: githubBranchIndex,
      live_home: {
        url: liveHome.url,
        status: liveHome.status,
        ...liveHomeSummary
      },
      live_line: {
        url: liveLine.url,
        status: liveLine.status,
        ...liveLineSummary
      },
      local_home: localHomeSummary,
      local_line: localLineSummary
    },
    decision: {
      review_target: "local_working_copy",
      copy_github_index_to_local: false,
      reason: localReviewTargetConfirmed
        ? "GitHub branch index is older than the Solar/LINE local review target and would roll back the website upgrade."
        : "Source comparison requires human review before deciding any source sync.",
      completion_claim_allowed: false,
      deploy_gate: "BLOCKED_FOR_DEPLOY",
      push_gate: "BLOCKED_UNTIL_EXPLICIT_PUSH_APPROVAL"
    },
    closed_gates: Object.fromEntries(closedGates.map((gate) => [gate, "blocked"])),
    report: reportPath,
    next_safe_action:
      "Human reviewer opens local preview and review board, scans the LINE QR on a real device, confirms existing bot/contact behavior, then grants exact deploy approval only if accepted."
  };
}

function renderReport(packet) {
  const comparisonRows = [
    ["GitHub branch index", packet.source_comparison.github_branch_index],
    ["Live homepage", packet.source_comparison.live_home],
    ["Live /line", packet.source_comparison.live_line],
    ["Local homepage", packet.source_comparison.local_home],
    ["Local /line", packet.source_comparison.local_line]
  ]
    .map(
      ([label, item]) =>
        `| ${tableCell(label)} | ${tableCell(item.status || "-")} | ${tableCell(item.title || "-")} | ${item.has_solar ? "yes" : "no"} | ${item.has_line_route_link ? "yes" : "no"} | ${item.has_qr_url ? "yes" : "no"} |`
    )
    .join("\n");

  return `# SIRINX Website GitHub Live Local Automated Recheck

Status: ${packet.status}
Date: ${packet.created_at}
Scope: \`${packet.scope}\`
Mode: ${packet.mode}
Repository: \`${packet.repository}\`
Branch: \`${packet.branch}\`
Deploy: not run
Push: not run
Production mutation: none

## Purpose

This packet is the rerunnable local automation version of the GitHub/live/local source comparison. It reads GitHub and live website sources in read-only mode, compares them to the local review target, and records whether the local website should remain the review target.

## Source Comparison

| Source | HTTP/status | Title | Solar signal | /line link | QR URL |
| --- | --- | --- | --- | --- | --- |
${comparisonRows}

## Decision

- Review target: \`${packet.decision.review_target}\`
- Copy GitHub index to local: ${packet.decision.copy_github_index_to_local ? "yes" : "no"}
- Reason: ${packet.decision.reason}
- Completion claim allowed: ${packet.decision.completion_claim_allowed ? "yes" : "no"}
- Deploy gate: \`${packet.decision.deploy_gate}\`
- Push gate: \`${packet.decision.push_gate}\`

## Git Metadata

- Local HEAD: \`${packet.git_metadata.local_head_sha}\`
- Remote branch SHA: \`${packet.git_metadata.remote_branch_sha || "not found"}\`
- Branch found: ${packet.git_metadata.branch_found ? "yes" : "no"}

## Closed Gates

${Object.entries(packet.closed_gates).map(([gate, state]) => `- ${gate}: ${state}`).join("\n")}

## Next Safe Action

${packet.next_safe_action}

This automated recheck does not push, does not deploy, does not open a public tunnel, does not activate LINE webhook, does not connect production analytics, and does not store customer data.
`;
}

export async function writeGithubLiveLocalRecheck() {
  const [githubRead, gitMetadata, liveHome, liveLine, localHomeHtml, localLineHtml] = await Promise.all([
    fetchGithubBranchIndex(),
    collectGitMetadata(),
    fetchHtml("https://www.sirinx.co/"),
    fetchHtml("https://www.sirinx.co/line"),
    readFile(resolve(repoRoot, localHomePath), "utf8"),
    readFile(resolve(repoRoot, localLinePath), "utf8")
  ]);
  const packet = createGithubLiveLocalRecheckPacket({
    createdAt: nowBangkok(),
    githubRead,
    gitMetadata,
    liveHome,
    liveLine,
    localHomeHtml,
    localLineHtml
  });

  await mkdir(resolve(repoRoot, dirname(reportPath)), { recursive: true });
  await mkdir(resolve(repoRoot, dirname(packetPath)), { recursive: true });
  await writeFile(resolve(repoRoot, reportPath), renderReport(packet), "utf8");
  await writeFile(resolve(repoRoot, packetPath), `${JSON.stringify(packet, null, 2)}\n`, "utf8");
  return packet;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const packet = await writeGithubLiveLocalRecheck();
  console.log(JSON.stringify(packet, null, 2));
}
