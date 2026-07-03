import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const siteDir = resolve(root, process.env.SIRINX_SITE_DIR || "src");
const host = process.env.SIRINX_SITE_HOST || "127.0.0.1";
const port = Number(process.env.SIRINX_SITE_PORT || 8730);
const floatingContactPartialPath = resolve(root, "src", "_partials", "floating-contact.html");
const appScriptTag = '<script type="module" src="/app.js"></script>';

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
  ["", "text/plain; charset=utf-8"]
]);

async function resolveAsset(urlPath) {
  const cleanPath = normalize(decodeURIComponent(urlPath.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
  const relativePath = cleanPath === "/" ? "index.html" : cleanPath.replace(/^[/\\]/, "");
  const assetPath = join(siteDir, relativePath);
  const assetStat = await stat(assetPath).catch(() => null);

  if (assetStat?.isDirectory()) {
    return join(assetPath, "index.html");
  }

  if (!assetStat && !extname(assetPath)) {
    return join(assetPath, "index.html");
  }

  return assetPath;
}

export function renderHtmlForLocalPreview({ html, floatingContactPartial }) {
  if (!floatingContactPartial || html.includes('id="floating-contact-cluster"')) {
    return html;
  }

  if (html.includes(appScriptTag)) {
    return html.replace(appScriptTag, `${floatingContactPartial}\n\n    ${appScriptTag}`);
  }

  return html.replace("</body>", `${floatingContactPartial}\n  </body>`);
}

async function readFloatingContactPartial() {
  return readFile(floatingContactPartialPath, "utf8").catch(() => "");
}

export const server = createServer(async (request, response) => {
  if (!request.url || request.method !== "GET") {
    response.writeHead(405, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "method_not_allowed" }));
    return;
  }

  const assetPath = await resolveAsset(request.url);

  try {
    const assetStat = await stat(assetPath);
    if (!assetStat.isFile()) {
      response.writeHead(404, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "not_found" }));
      return;
    }

    const contentType = contentTypes.get(extname(assetPath)) || "application/octet-stream";
    if (extname(assetPath) === ".html") {
      const html = await readFile(assetPath, "utf8");
      const floatingContactPartial = await readFloatingContactPartial();
      response.writeHead(200, {
        "content-type": contentType,
        "cache-control": "no-store"
      });
      response.end(renderHtmlForLocalPreview({ html, floatingContactPartial }));
      return;
    }

    response.writeHead(200, {
      "content-type": contentType,
      "cache-control": "no-store"
    });
    createReadStream(assetPath).pipe(response);
  } catch {
    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "not_found" }));
  }
});

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  server.listen(port, host, () => {
    console.log(`sirinx.co local preview listening on http://${host}:${port}`);
  });
}
