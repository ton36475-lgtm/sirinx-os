#!/usr/bin/env node

import { runGithubToptrendResearch } from "./github-toptrend-worker.mjs";

const result = runGithubToptrendResearch();
console.log(JSON.stringify(result, null, 2));
