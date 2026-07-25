import { mkdir, copyFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(__dirname, "..");
const srcDir = resolve(appRoot, "src");
const distDir = resolve(appRoot, "dist");

await mkdir(distDir, { recursive: true });

for (const file of ["index.html", "styles.css", "app.js"]) {
  await copyFile(resolve(srcDir, file), resolve(distDir, file));
}

console.log(
  JSON.stringify(
    {
      status: "built",
      app: "@agm/site",
      files: ["dist/index.html", "dist/styles.css", "dist/app.js"]
    },
    null,
    2
  )
);
