import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const dist = resolve(root, "dist");

await rm(dist, { force: true, recursive: true });
await mkdir(dist, { recursive: true });
await cp(resolve(root, "src"), dist, { recursive: true });
await cp(resolve(root, "public"), dist, { recursive: true });

console.log(`sirinx-site built at ${dist}`);
