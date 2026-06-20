import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { createDashboardProject } from "./src/autoglow-dashboard-core.mjs";
import {
  attachSceneImage,
  createStorePaths,
  getPrimaryProject,
  initializeDatabase,
  removeSceneImage,
  upsertProject
} from "./src/autoglow-backend-store.mjs";

const root = fileURLToPath(new URL("./src/", import.meta.url));
const dataRoot = fileURLToPath(new URL("./data/", import.meta.url));
const storePaths = createStorePaths(dataRoot);
const host = process.env.AUTOGLOW_DASHBOARD_HOST || "127.0.0.1";
const port = Number(process.env.AUTOGLOW_DASHBOARD_PORT || 8730);
const seedProject = createDashboardProject();
const databaseReady = initializeDatabase(storePaths, seedProject);

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"]
]);

const uploadContentTypes = new Map([
  [".gif", "image/gif"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"]
]);

function resolveAsset(urlPath) {
  const cleanPath = normalize(decodeURIComponent(urlPath.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
  const relativePath = cleanPath === "/" ? "index.html" : cleanPath.replace(/^[/\\]/, "");
  return join(root, relativePath);
}

function resolveUpload(urlPath) {
  const cleanPath = normalize(decodeURIComponent(urlPath.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
  return join(storePaths.publicRoot, cleanPath);
}

const server = createServer(async (request, response) => {
  if (!request.url) {
    response.writeHead(405, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "method_not_allowed" }));
    return;
  }

  try {
    if (request.url.startsWith("/api/")) {
      await handleApi(request, response);
      return;
    }

    if (request.url.startsWith("/uploads/")) {
      await serveUpload(request, response);
      return;
    }
  } catch (error) {
    sendJson(response, statusForError(error), {
      error: error.message || "internal_error"
    });
    return;
  }

  if (!["GET", "HEAD"].includes(request.method || "")) {
    response.writeHead(405, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "method_not_allowed" }));
    return;
  }

  const assetPath = resolveAsset(request.url);

  try {
    const assetStat = await stat(assetPath);
    if (!assetStat.isFile()) {
      response.writeHead(404, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "not_found" }));
      return;
    }

    response.writeHead(200, {
      "content-type": contentTypes.get(extname(assetPath)) || "application/octet-stream",
      "cache-control": "no-store"
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    createReadStream(assetPath).pipe(response);
  } catch {
    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "not_found" }));
  }
});

async function handleApi(request, response) {
  await databaseReady;
  const url = new URL(request.url, `http://${request.headers.host || `${host}:${port}`}`);
  const method = request.method || "GET";

  if (url.pathname === "/api/project" && method === "GET") {
    sendJson(response, 200, await getPrimaryProject(storePaths, seedProject));
    return;
  }

  if (url.pathname === "/api/project" && method === "PUT") {
    const body = await readJsonBody(request);
    sendJson(response, 200, await upsertProject(storePaths, body.project || body));
    return;
  }

  const imageUploadMatch = url.pathname.match(/^\/api\/project\/scenes\/([^/]+)\/images$/);
  if (imageUploadMatch && method === "POST") {
    const project = await getPrimaryProject(storePaths, seedProject);
    const body = await readJsonBody(request);
    sendJson(response, 201, await attachSceneImage(storePaths, project.id, imageUploadMatch[1], body));
    return;
  }

  const imageDeleteMatch = url.pathname.match(/^\/api\/project\/scenes\/([^/]+)\/images\/([^/]+)$/);
  if (imageDeleteMatch && method === "DELETE") {
    const project = await getPrimaryProject(storePaths, seedProject);
    sendJson(response, 200, {
      project: await removeSceneImage(storePaths, project.id, imageDeleteMatch[1], imageDeleteMatch[2])
    });
    return;
  }

  sendJson(response, 404, { error: "not_found" });
}

async function serveUpload(request, response) {
  if (!["GET", "HEAD"].includes(request.method || "")) {
    sendJson(response, 405, { error: "method_not_allowed" });
    return;
  }

  const assetPath = resolveUpload(request.url || "");
  try {
    const assetStat = await stat(assetPath);
    if (!assetStat.isFile()) {
      sendJson(response, 404, { error: "not_found" });
      return;
    }

    response.writeHead(200, {
      "content-type": uploadContentTypes.get(extname(assetPath)) || "application/octet-stream",
      "cache-control": "no-store"
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    createReadStream(assetPath).pipe(response);
  } catch {
    sendJson(response, 404, { error: "not_found" });
  }
}

async function readJsonBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.byteLength;
    if (size > 10 * 1024 * 1024) {
      throw new Error("request_body_too_large");
    }
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) {
    return {};
  }
  return JSON.parse(raw);
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function statusForError(error) {
  const message = error?.message || "";
  if (message.includes("not_found")) return 404;
  if (
    message.includes("invalid_") ||
    message.includes("unsupported_") ||
    message.includes("too_large") ||
    message.includes("required") ||
    message.includes("empty_")
  ) {
    return 400;
  }
  return 500;
}

server.listen(port, host, () => {
  console.log(`AGM AUTOGLOW dashboard listening on http://${host}:${port}`);
});
