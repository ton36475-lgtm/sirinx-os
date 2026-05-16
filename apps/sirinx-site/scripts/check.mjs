import { readFile, readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const dist = resolve(root, "dist");
const requiredFiles = ["index.html", "styles.css", "app.js", "_headers", "_redirects", "robots.txt"];
const secretPattern =
  /(sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9_]{20,}|BEGIN (RSA|OPENSSH|PRIVATE) KEY|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,})|^\s*(API_KEY|PASSWORD|TOKEN|SECRET)\s*[:=]/m;

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(path)));
    } else {
      files.push(path);
    }
  }

  return files;
}

for (const file of requiredFiles) {
  const item = await stat(join(dist, file)).catch(() => null);
  if (!item?.isFile()) {
    throw new Error(`Missing build output file: ${file}`);
  }
}

const files = await walk(dist);
for (const file of files) {
  const content = await readFile(file, "utf8").catch(() => "");
  if (secretPattern.test(content)) {
    throw new Error(`Secret-like pattern found in ${file}`);
  }
}

const index = await readFile(join(dist, "index.html"), "utf8");
if (!index.includes("sirinx.co")) {
  throw new Error("index.html must reference sirinx.co");
}

console.log(`sirinx-site check passed for ${files.length} files`);
