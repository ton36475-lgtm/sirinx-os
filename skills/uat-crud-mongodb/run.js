#!/usr/bin/env node
// ESM wrapper kept for operators who run the historical .js entrypoint.

export { discoverProject, main, uatCrudMongoSecurityRules } from "./run.mjs";

import { pathToFileURL } from "node:url";
import { main } from "./run.mjs";

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main();
}
