// Local-only UAT CRUD + MongoDB discovery.
// This script never reads real .env files, never connects to MongoDB, never
// starts servers, and never installs or launches browser automation.

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  UAT_CRUD_MONGODB_SECURITY_RULE_IDS,
  evaluatePolicy,
  summarizePolicyDecision
} from "../../packages/policy-core/src/index.mjs";

const DEFAULT_SCAN_DIRS = [
  "routes",
  "src/routes",
  "app/routes",
  "pages/api",
  "api",
  "server",
  "src/server",
  "models",
  "src/models",
  "schemas",
  "src/schemas"
];

const IGNORED_DIRS = new Set([".git", ".next", "dist", "build", "coverage", "node_modules"]);
const SOURCE_FILE_PATTERN = /\.(cjs|mjs|js|ts|tsx)$/;

export const uatCrudMongoSecurityRules = UAT_CRUD_MONGODB_SECURITY_RULE_IDS;

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    project: ".",
    json: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--project" || arg === "-p") {
      options.project = argv[index + 1] || ".";
      index += 1;
    } else if (arg === "--json") {
      options.json = true;
    }
  }

  return options;
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function fileExists(filePath) {
  return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
}

function directoryExists(filePath) {
  return fs.existsSync(filePath) && fs.statSync(filePath).isDirectory();
}

function walkFiles(root, relativeDir, pattern, maxDepth = 5) {
  const start = path.join(root, relativeDir);
  const files = [];

  if (!directoryExists(start)) {
    return files;
  }

  function walk(current, depth) {
    if (depth > maxDepth) {
      return;
    }

    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (IGNORED_DIRS.has(entry.name)) {
        continue;
      }

      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath, depth + 1);
      } else if (entry.isFile() && pattern.test(entry.name)) {
        files.push(path.relative(root, fullPath).replace(/\\/g, "/"));
      }
    }
  }

  walk(start, 0);
  return files;
}

function discoverMongoSignals(root, packageJson) {
  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };
  const packageSignals = ["mongodb", "mongoose"].filter((name) => dependencies[name]);
  const envExamplePath = path.join(root, ".env.example");
  const envExampleMentionsMongo = fileExists(envExamplePath)
    ? /MONGODB|MONGO_URI|DATABASE_URL/i.test(fs.readFileSync(envExamplePath, "utf8"))
    : false;

  return {
    packageSignals,
    envExampleMentionsMongo,
    realEnvInspected: false
  };
}

function buildPolicySnapshot(root) {
  const discoveryDecision = summarizePolicyDecision(
    evaluatePolicy({
      id: "uat-crud-mongodb-discovery",
      type: "local-review",
      target: root,
      paths: [root, "package.json", ".env.example"],
      readOnly: true
    })
  );
  const writeDecision = summarizePolicyDecision(
    evaluatePolicy({
      id: "uat-crud-mongodb-write",
      type: "mongodb-crud-uat",
      target: "mongodb:local-synthetic-uat",
      databaseWrite: true
    })
  );
  const installDecision = summarizePolicyDecision(
    evaluatePolicy({
      id: "uat-crud-mongodb-install",
      type: "dependency-install",
      target: "workspace:dev-dependencies",
      dependencyInstall: true
    })
  );
  const tunnelDecision = summarizePolicyDecision(
    evaluatePolicy({
      id: "uat-crud-mongodb-public-tunnel",
      type: "public-tunnel",
      target: "tunnel:localhost-uat",
      publicTunnel: true
    })
  );

  return {
    discoveryDecision,
    writeDecision,
    installDecision,
    tunnelDecision,
    requiredApprovalPhrase: "APPROVE_LOCAL_UAT_CRUD_MONGODB_<target>_<date>"
  };
}

export function discoverProject(projectPath = ".") {
  const root = path.resolve(projectPath);
  const packageJsonPath = path.join(root, "package.json");

  if (!directoryExists(root)) {
    throw new Error(`Project directory not found: ${root}`);
  }

  if (!fileExists(packageJsonPath)) {
    throw new Error(`package.json not found: ${packageJsonPath}`);
  }

  const packageJson = readJsonFile(packageJsonPath);
  const routeFiles = DEFAULT_SCAN_DIRS.flatMap((dir) => walkFiles(root, dir, SOURCE_FILE_PATTERN));
  const crudFiles = routeFiles.filter((file) => /(crud|route|router|controller|model|schema|api)/i.test(file));
  const mongoSignals = discoverMongoSignals(root, packageJson);

  return {
    skill: "uat-crud-mongodb",
    mode: "dry-run-discovery-only",
    projectRoot: root,
    package: {
      name: packageJson.name || null,
      type: packageJson.type || "commonjs",
      hasDevScript: Boolean(packageJson.scripts?.dev),
      hasTestScript: Boolean(packageJson.scripts?.test)
    },
    mongoSignals,
    routes: routeFiles,
    crudCandidates: crudFiles,
    security: {
      rules: uatCrudMongoSecurityRules,
      policy: buildPolicySnapshot(root),
      blockedByDefault: [
        "read-real-env",
        "connect-mongodb",
        "create-update-delete-database-records",
        "use-production-or-customer-data",
        "install-packages",
        "start-public-tunnel",
        "call-providers",
        "send-customer-messages"
      ]
    }
  };
}

function printTextReport(report) {
  console.log(`# ${report.skill}`);
  console.log(`mode: ${report.mode}`);
  console.log(`project: ${report.projectRoot}`);
  console.log(`package: ${report.package.name || "unknown"}`);
  console.log(`mongodb package signals: ${report.mongoSignals.packageSignals.join(", ") || "none"}`);
  console.log(`mongodb in .env.example: ${report.mongoSignals.envExampleMentionsMongo}`);
  console.log(`real .env inspected: ${report.mongoSignals.realEnvInspected}`);
  console.log(`routes found: ${report.routes.length}`);
  console.log(`crud candidates found: ${report.crudCandidates.length}`);
  console.log(`default write decision: ${report.security.policy.writeDecision.decision}`);
  console.log(`required approval: ${report.security.policy.requiredApprovalPhrase}`);
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const report = discoverProject(options.project);

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printTextReport(report);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main();
}
