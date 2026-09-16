import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  CONFIG_FREE_MODE,
  DEFAULT_GATEWAY_URL,
  DEFAULT_SITEMAP_URL,
  buildSnapshot
} from "./hermes-night-watch-config-free.mjs";
import { requestText } from "./hermes-night-watch-config-free.mjs";

const repoRoot = new URL("..", import.meta.url).pathname;
const source = readFileSync(join(repoRoot, "scripts", "hermes-night-watch-config-free.mjs"), "utf8");

function makeGitRepo(root, name) {
  const path = join(root, name);
  mkdirSync(path, { recursive: true });
  execFileSync("git", ["init", "--quiet"], { cwd: path, stdio: "ignore" });
  return path;
}

function manifest(root, prefix = "") {
  return readdirSync(root, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => {
      const relative = join(prefix, entry.name);
      const path = join(root, entry.name);
      if (entry.isDirectory()) return [`dir:${relative}`, ...manifest(path, relative)];
      const info = statSync(path);
      return [`file:${relative}:${info.size}:${readFileSync(path).toString("base64")}`];
    });
}

function healthyRequest(url) {
  if (url === DEFAULT_SITEMAP_URL) {
    return Promise.resolve({
      status: 200,
      body: "<loc>https://www.sirinx.co/</loc><loc>https://www.sirinx.co/solar-carport/phitsanulok</loc>",
      error: null
    });
  }
  if (url === DEFAULT_GATEWAY_URL) {
    return Promise.resolve({ status: 200, body: JSON.stringify({ status: "ok", platform: "hermes-agent" }), error: null });
  }
  return Promise.resolve({ status: 200, body: "", error: null });
}

for (const forbidden of [
  "node:fs",
  "dotenv",
  "auth.json",
  "config.yaml",
  "writeFile",
  "appendFile",
  "mkdir",
  "mkdtemp",
  "pnpm",
  "hermes-desktop",
  "curl",
  "launchctl",
  "shell: true"
]) {
  assert.equal(source.includes(forbidden), false, `config-free snapshot must not contain ${forbidden}`);
}
assert.doesNotMatch(source, /(?:^|[/'"])\.env(?:[/'"]|$)/m, "config-free snapshot must not reference an env-file path");
assert.doesNotMatch(source, /(?:^|[/'"])\.hermes(?:[/'"]|$)/m, "config-free snapshot must not reference a Hermes-state path");
assert.match(source, /execFileSync\(\s*"git"/);
assert.match(source, /GIT_OPTIONAL_LOCKS/);
assert.match(source, /GIT_CONFIG_GLOBAL/);

{
  const server = createServer((request, response) => {
    if (request.url === "/redirect") {
      response.writeHead(308, { location: "/healthy" });
      response.end();
      return;
    }
    response.writeHead(200);
    response.end("ok");
  });
  await new Promise((resolveServer) => server.listen(0, "127.0.0.1", resolveServer));
  const address = server.address();
  assert.equal(typeof address, "object");
  const response = await requestText(`http://127.0.0.1:${address.port}/redirect`, { maxRedirects: 1 });
  await new Promise((resolveClose) => server.close(resolveClose));
  assert.equal(response.status, 200);
  assert.equal(response.body, "ok");
}

{
  const tempRoot = mkdtempSync(join(tmpdir(), "sirinx-night-watch-config-free-"));
  const root = makeGitRepo(tempRoot, "sirinx-os");
  const publicRepo = makeGitRepo(tempRoot, "public-site");
  const before = manifest(tempRoot);

  const result = await buildSnapshot({
    root,
    publicRepo,
    request: healthyRequest,
    observedAt: "2026-07-17T16:00:00.000Z"
  });

  assert.equal(result.mode, CONFIG_FREE_MODE);
  assert.equal(result.reportWritten, false);
  assert.equal(result.finalStatus, "OK");
  assert.equal(result.needsHumanApproval, false);
  assert.equal(result.checks.localStack.status, "healthy");
  assert.equal(result.checks.hermesDesktop.status, "healthy");
  assert.equal(result.checks.hermesGateway.status, "healthy");
  assert.equal(result.checks.publicWebsite.status, "healthy");
  assert.equal(result.checks.sitemap.status, "healthy");
  assert.equal(result.checks.provinceRouteCount.status, "healthy");
  assert.equal(result.checks.gitDirtyStates.status, "healthy");
  assert.deepEqual(manifest(tempRoot), before, "the snapshot must not write to inspected repositories");
}

{
  const warningRequest = async (url) => {
    if (url === DEFAULT_SITEMAP_URL) return { status: 200, body: "<loc>https://www.sirinx.co/</loc>", error: null };
    if (url === DEFAULT_GATEWAY_URL) return { status: 200, body: "{}", error: null };
    if (url.includes("8720") || url.includes("9119") || url.includes("assessment")) {
      return { status: 503, body: "", error: null };
    }
    return { status: 200, body: "", error: null };
  };
  const dirtyGit = (repoPath) => ({
    status: "warn",
    dirtyFiles: repoPath.includes("public") ? 2 : 1,
    diagnosis: "dirty or untracked path(s)"
  });

  const result = await buildSnapshot({
    root: "/tmp/sirinx-os",
    publicRepo: "/tmp/public-site",
    request: warningRequest,
    gitStatus: dirtyGit,
    observedAt: "2026-07-17T16:00:00.000Z"
  });

  assert.equal(result.finalStatus, "WARN");
  assert.equal(result.needsHumanApproval, true);
  assert.equal(result.reportWritten, false);
  assert.equal(result.checks.localStack.status, "warn");
  assert.equal(result.checks.hermesDesktop.status, "warn");
  assert.equal(result.checks.hermesGateway.status, "unverifiable");
  assert.equal(result.checks.publicWebsite.status, "warn");
  assert.equal(result.checks.sitemap.status, "healthy");
  assert.equal(result.checks.provinceRouteCount.status, "warn");
  assert.equal(result.checks.gitDirtyStates.status, "warn");
  assert.match(result.diagnoses.join("\n"), /solar-intelligence/);
  assert.match(result.diagnoses.join("\n"), /Hermes Gateway/);
  assert.match(result.diagnoses.join("\n"), /Province route count/);
}

{
  const tempRoot = mkdtempSync(join(tmpdir(), "sirinx-night-watch-config-free-dirty-"));
  const root = makeGitRepo(tempRoot, "sirinx-os");
  const publicRepo = makeGitRepo(tempRoot, "public-site");
  writeFileSync(join(root, "untracked.txt"), "dirty\n");

  const result = await buildSnapshot({ root, publicRepo, request: healthyRequest });

  assert.equal(result.finalStatus, "WARN");
  assert.equal(result.checks.gitDirtyStates.sirinxOs.status, "warn");
  assert.equal(result.checks.gitDirtyStates.sirinxOs.dirtyFiles, 1);
  assert.equal(result.checks.gitDirtyStates.publicWebsite.status, "healthy");
}

console.log("hermes-night-watch-config-free tests passed");
