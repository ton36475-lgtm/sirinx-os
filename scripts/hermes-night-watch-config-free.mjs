import http from "node:http";
import https from "node:https";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);

export const CONFIG_FREE_MODE = "config-free-no-write";
export const DEFAULT_ROOT = resolve(dirname(scriptPath), "..");
export const DEFAULT_PUBLIC_REPO = "/Users/sirinx/restore-sources/ton36475-lgtm-sirinx";
export const DEFAULT_GATEWAY_URL = "http://127.0.0.1:8642/health";
export const DEFAULT_SITEMAP_URL = "https://www.sirinx.co/sitemap.xml";

const REQUEST_TIMEOUT_MS = 5_000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const SAFE_GIT_ENV = Object.freeze({
  PATH: "/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin",
  GIT_OPTIONAL_LOCKS: "0",
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_TERMINAL_PROMPT: "0"
});

function usage() {
  return [
    "Usage: node scripts/hermes-night-watch-config-free.mjs [options]",
    "",
    "Options:",
    "  --root <path>          SIRINX OS checkout to inspect",
    "  --public-repo <path>   Public website checkout to inspect",
    "  --gateway-url <url>    Loopback Hermes gateway health endpoint",
    "  --help                 Show this help"
  ].join("\n");
}

function requireValue(argv, index, flag) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function loopbackUrl(value, flag) {
  const parsed = new URL(value);
  if (!new Set(["http:", "https:"]).has(parsed.protocol)) {
    throw new Error(`${flag} must use HTTP or HTTPS`);
  }
  if (!new Set(["127.0.0.1", "localhost", "::1"]).has(parsed.hostname)) {
    throw new Error(`${flag} must target a loopback host`);
  }
  return parsed.toString();
}

export function parseArguments(argv) {
  const options = {
    root: DEFAULT_ROOT,
    publicRepo: DEFAULT_PUBLIC_REPO,
    gatewayUrl: DEFAULT_GATEWAY_URL,
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    switch (flag) {
      case "--root":
        options.root = resolve(requireValue(argv, index, flag));
        index += 1;
        break;
      case "--public-repo":
        options.publicRepo = resolve(requireValue(argv, index, flag));
        index += 1;
        break;
      case "--gateway-url":
        options.gatewayUrl = loopbackUrl(requireValue(argv, index, flag), flag);
        index += 1;
        break;
      case "--help":
        options.help = true;
        break;
      default:
        throw new Error(`Unknown option: ${flag}`);
    }
  }

  return options;
}

export function requestText(
  urlString,
  { timeoutMs = REQUEST_TIMEOUT_MS, maxBytes = MAX_RESPONSE_BYTES, maxRedirects = 0, redirectCount = 0 } = {}
) {
  const target = new URL(urlString);
  const transport = target.protocol === "https:" ? https : target.protocol === "http:" ? http : null;

  if (!transport) {
    return Promise.resolve({ status: 0, body: "", error: "unsupported protocol" });
  }

  return new Promise((resolveResponse) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolveResponse(value);
    };

    const request = transport.request(
      target,
      {
        method: "GET",
        headers: {
          accept: "application/json, text/html, application/xml;q=0.9, */*;q=0.1",
          "user-agent": "sirinx-night-watch-config-free/1"
        }
      },
      (response) => {
        const redirectStatuses = new Set([301, 302, 303, 307, 308]);
        const location = response.headers.location;
        if (redirectStatuses.has(response.statusCode ?? 0) && location && redirectCount < maxRedirects) {
          try {
            const nextTarget = new URL(location, target);
            if (nextTarget.origin !== target.origin) {
              finish({ status: response.statusCode ?? 0, body: "", error: "cross-origin redirect declined" });
              response.resume();
              return;
            }
            response.resume();
            requestText(nextTarget.toString(), { timeoutMs, maxBytes, maxRedirects, redirectCount: redirectCount + 1 }).then(finish);
            return;
          } catch {
            finish({ status: response.statusCode ?? 0, body: "", error: "invalid redirect" });
            response.resume();
            return;
          }
        }

        const chunks = [];
        let received = 0;

        response.on("data", (chunk) => {
          if (settled) return;
          received += chunk.length;
          if (received > maxBytes) {
            response.destroy();
            finish({ status: 0, body: "", error: "response exceeds size limit" });
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => {
          finish({
            status: response.statusCode ?? 0,
            body: Buffer.concat(chunks).toString("utf8"),
            error: null
          });
        });
        response.on("error", () => {
          finish({ status: 0, body: "", error: "response error" });
        });
      }
    );

    request.setTimeout(timeoutMs, () => request.destroy(new Error("timeout")));
    request.on("error", () => finish({ status: 0, body: "", error: "request error" }));
    request.end();
  });
}

function httpCode(response) {
  return Number.isInteger(response.status) ? response.status : 0;
}

async function probeHttp(name, endpoint, request, requestOptions = {}) {
  const response = await request(endpoint, requestOptions);
  const code = httpCode(response);
  const healthy = code === 200;

  return {
    name,
    endpoint,
    status: healthy ? "healthy" : "warn",
    httpStatus: code,
    diagnosis: healthy ? null : `expected HTTP 200, received ${code || "no response"}`
  };
}

async function probeGateway(endpoint, request) {
  const response = await request(endpoint, { maxRedirects: 0 });
  const code = httpCode(response);

  if (code !== 200) {
    return {
      endpoint,
      status: "unverifiable",
      httpStatus: code,
      diagnosis: `default loopback health endpoint returned ${code || "no response"}; no configuration was read to discover an override`
    };
  }

  try {
    const payload = JSON.parse(response.body);
    if (payload?.status === "ok" && payload?.platform === "hermes-agent") {
      return { endpoint, status: "healthy", httpStatus: code, diagnosis: null };
    }
  } catch {
    // The default endpoint must identify itself before this probe can claim health.
  }

  return {
    endpoint,
    status: "unverifiable",
    httpStatus: code,
    diagnosis: "default loopback endpoint did not identify as Hermes Agent; no configuration was read to discover an override"
  };
}

function countOccurrences(text, marker) {
  if (!text || !marker) return 0;
  return text.split(marker).length - 1;
}

async function probeSitemap(request) {
  const response = await request(DEFAULT_SITEMAP_URL, { maxRedirects: 3 });
  const code = httpCode(response);

  if (code !== 200) {
    const diagnosis = `sitemap endpoint returned ${code || "no response"}`;
    return {
      sitemap: { status: "warn", httpStatus: code, urlCount: 0, diagnosis },
      provinceRouteCount: { status: "warn", routeCount: 0, diagnosis }
    };
  }

  const urlCount = countOccurrences(response.body, "<loc>");
  const routeCount = countOccurrences(response.body, "/solar-carport/");
  return {
    sitemap: {
      status: urlCount > 0 ? "healthy" : "warn",
      httpStatus: code,
      urlCount,
      diagnosis: urlCount > 0 ? null : "sitemap has no URL entries"
    },
    provinceRouteCount: {
      status: routeCount > 0 ? "healthy" : "warn",
      routeCount,
      diagnosis: routeCount > 0 ? null : "sitemap has no province routes"
    }
  };
}

export function gitDirtyState(repoPath) {
  try {
    const output = execFileSync(
      "git",
      [
        "--no-optional-locks",
        "-C",
        repoPath,
        "status",
        "--porcelain=v1",
        "--untracked-files=normal",
        "--ignore-submodules=none"
      ],
      { encoding: "utf8", env: SAFE_GIT_ENV, stdio: ["ignore", "pipe", "pipe"] }
    );
    const dirtyFiles = output.split(/\r?\n/).filter(Boolean).length;
    return {
      status: dirtyFiles === 0 ? "healthy" : "warn",
      dirtyFiles,
      diagnosis: dirtyFiles === 0 ? null : `${dirtyFiles} dirty or untracked path(s)`
    };
  } catch {
    return {
      status: "unverifiable",
      dirtyFiles: null,
      diagnosis: "git status could not inspect this checkout"
    };
  }
}

function aggregateStatus(items) {
  return items.every((item) => item.status === "healthy") ? "healthy" : "warn";
}

function collectDiagnoses(checks) {
  return checks.flatMap(([label, item]) => {
    if (!item.diagnosis) return [];
    return [`${label}: ${item.diagnosis}`];
  });
}

export async function buildSnapshot({
  root = DEFAULT_ROOT,
  publicRepo = DEFAULT_PUBLIC_REPO,
  gatewayUrl = DEFAULT_GATEWAY_URL,
  request = requestText,
  gitStatus = gitDirtyState,
  observedAt = new Date().toISOString()
} = {}) {
  const [api, dashboard, solar, site, desktop, gateway, sitemapResult] = await Promise.all([
    probeHttp("dev-control-api", "http://127.0.0.1:8711/health", request, { maxRedirects: 0 }),
    probeHttp("dev-dashboard", "http://127.0.0.1:8710/", request, { maxRedirects: 0 }),
    probeHttp("solar-intelligence", "http://127.0.0.1:8720/health", request, { maxRedirects: 0 }),
    probeHttp("sirinx-site", "http://127.0.0.1:8730/", request, { maxRedirects: 0 }),
    probeHttp("Hermes Desktop", "http://127.0.0.1:9119/", request, { maxRedirects: 0 }),
    probeGateway(gatewayUrl, request),
    probeSitemap(request)
  ]);
  const rootGit = await Promise.resolve(gitStatus(root));
  const publicGit = await Promise.resolve(gitStatus(publicRepo));

  const localServices = [api, dashboard, solar, site];
  const localStack = {
    status: aggregateStatus(localServices),
    services: localServices
  };
  const publicRoutes = await Promise.all([
    probeHttp("home", "https://www.sirinx.co/", request, { maxRedirects: 3 }),
    probeHttp("assessment", "https://www.sirinx.co/assessment", request, { maxRedirects: 3 }),
    probeHttp("province sample", "https://www.sirinx.co/solar-carport/phitsanulok", request, { maxRedirects: 3 })
  ]);
  const publicWebsite = {
    status: aggregateStatus(publicRoutes),
    routes: publicRoutes
  };
  const gitDirtyStates = {
    status: aggregateStatus([rootGit, publicGit]),
    sirinxOs: rootGit,
    publicWebsite: publicGit
  };

  const diagnoses = [
    ...collectDiagnoses(localServices.map((service) => [`Local stack ${service.name}`, service])),
    ...collectDiagnoses([["Hermes Desktop", desktop], ["Hermes Gateway", gateway]]),
    ...collectDiagnoses(publicRoutes.map((route) => [`Public website ${route.name}`, route])),
    ...collectDiagnoses([["Sitemap", sitemapResult.sitemap], ["Province route count", sitemapResult.provinceRouteCount]]),
    ...collectDiagnoses([["SIRINX OS git", rootGit], ["Public website git", publicGit]])
  ];
  const finalStatus = diagnoses.length === 0 ? "OK" : "WARN";

  return {
    schemaVersion: "sirinx.hermes-night-watch.config-free.v1",
    observedAt,
    mode: CONFIG_FREE_MODE,
    reportWritten: false,
    finalStatus,
    needsHumanApproval: finalStatus !== "OK",
    checks: {
      localStack,
      hermesDesktop: desktop,
      hermesGateway: gateway,
      publicWebsite,
      sitemap: sitemapResult.sitemap,
      provinceRouteCount: sitemapResult.provinceRouteCount,
      gitDirtyStates
    },
    diagnoses
  };
}

export async function main(argv = process.argv.slice(2)) {
  try {
    const options = parseArguments(argv);
    if (options.help) {
      process.stdout.write(`${usage()}\n`);
      return 0;
    }

    const snapshot = await buildSnapshot(options);
    process.stdout.write(`${JSON.stringify(snapshot, null, 2)}\n`);
    return snapshot.finalStatus === "OK" ? 0 : 1;
  } catch (error) {
    process.stdout.write(
      `${JSON.stringify(
        {
          schemaVersion: "sirinx.hermes-night-watch.config-free.v1",
          mode: CONFIG_FREE_MODE,
          reportWritten: false,
          finalStatus: "WARN",
          needsHumanApproval: true,
          diagnoses: [error instanceof Error ? error.message : "invalid invocation"]
        },
        null,
        2
      )}\n`
    );
    return 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  process.exitCode = await main();
}
