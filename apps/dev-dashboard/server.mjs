import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("./src/", import.meta.url));
const host = process.env.DEV_DASHBOARD_HOST || "127.0.0.1";
const port = Number(process.env.DEV_DASHBOARD_PORT || 8710);

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"]
]);

function resolveAsset(urlPath) {
  const cleanPath = normalize(decodeURIComponent(urlPath.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
  const relativePath = cleanPath === "/" ? "index.html" : cleanPath.replace(/^[/\\]/, "");
  return join(root, relativePath);
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
  console.log(`SIRINX dev dashboard listening on http://${host}:${port}`);
});
