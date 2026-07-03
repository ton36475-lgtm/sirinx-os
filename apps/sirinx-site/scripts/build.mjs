import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const dist = resolve(root, "dist");
const partials = resolve(root, "src", "_partials");
const floatingContactPartial = resolve(partials, "floating-contact.html");
const appScriptTag = '    <script type="module" src="/app.js"></script>';

await rm(dist, { force: true, recursive: true });
await mkdir(dist, { recursive: true });
await cp(resolve(root, "src"), dist, {
  recursive: true,
  filter: (source) => !source.includes(".bak.") && !source.startsWith(partials)
});
await cp(resolve(root, "public"), dist, { recursive: true });

async function walkHtml(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const filePath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkHtml(filePath)));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(filePath);
    }
  }

  return files;
}

async function injectFloatingContactCluster() {
  const partialStat = await stat(floatingContactPartial).catch(() => null);
  if (!partialStat?.isFile()) {
    throw new Error(`Missing floating contact partial: ${floatingContactPartial}`);
  }

  const partial = await readFile(floatingContactPartial, "utf8");
  const htmlFiles = await walkHtml(dist);

  await Promise.all(
    htmlFiles.map(async (file) => {
      const content = await readFile(file, "utf8");
      if (content.includes('id="floating-contact-cluster"')) {
        return;
      }

      const injected = content.includes(appScriptTag)
        ? content.replace(appScriptTag, `${partial}\n\n${appScriptTag}`)
        : content.replace("</body>", `${partial}\n  </body>`);

      await writeFile(file, injected, "utf8");
    })
  );
}

await injectFloatingContactCluster();

console.log(`sirinx-site built at ${dist}`);
