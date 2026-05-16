import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const siteDir = resolve(root, process.env.SIRINX_SITE_DIR || "src");
const host = process.env.SIRINX_SITE_HOST || "127.0.0.1";
const port = Number(process.env.SIRINX_SITE_PORT || 8730);

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
  ["", "text/plain; charset=utf-8"]
]);

function resolveAsset(urlPath) {
  const cleanPath = normalize(decodeURIComponent(urlPath.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
  const relativePath = cleanPath === "/" ? "index.html" : cleanPath.replace(/^[/\\]/, "");
  return join(siteDir, relativePath);
}

const server = createServer(async (request, response) => {
  if (!request.url || request.method !== "GET") {
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
    createReadStream(assetPath).pipe(response);
  } catch {
    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "not_found" }));
  }
});

server.listen(port, host, () => {
  console.log(`sirinx.co local preview listening on http://${host}:${port}`);
});
