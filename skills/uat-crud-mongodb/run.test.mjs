import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { UAT_CRUD_MONGODB_SECURITY_RULE_IDS } from "../../packages/policy-core/src/index.mjs";
import { discoverProject, uatCrudMongoSecurityRules } from "./run.mjs";

let tempRoot;

afterEach(async () => {
  if (tempRoot) {
    await rm(tempRoot, { recursive: true, force: true });
    tempRoot = undefined;
  }
});

async function makeProject(files = {}) {
  tempRoot = await mkdtemp(path.join(tmpdir(), "sirinx-uat-crud-mongodb-"));
  await writeFile(
    path.join(tempRoot, "package.json"),
    JSON.stringify(
      {
        name: "sample-crud-app",
        type: "module",
        scripts: { test: "vitest run" },
        dependencies: files.dependencies || {}
      },
      null,
      2
    ),
    "utf8"
  );

  for (const [relativePath, content] of Object.entries(files.extra || {})) {
    const fullPath = path.join(tempRoot, relativePath);
    await import("node:fs/promises").then((fs) => fs.mkdir(path.dirname(fullPath), { recursive: true }));
    await writeFile(fullPath, content, "utf8");
  }

  return tempRoot;
}

describe("uat-crud-mongodb skill runner", () => {
  it("uses Codex-discoverable skill frontmatter", async () => {
    const skillText = await readFile(path.join(import.meta.dirname, "SKILL.md"), "utf8");
    const frontmatter = skillText.match(/^---\n(?<body>[\s\S]*?)\n---/u)?.groups?.body || "";

    expect(frontmatter).toContain("name: uat-crud-mongodb");
    expect(frontmatter).toMatch(/^description: Use when /m);
    expect(frontmatter).not.toMatch(/^id:|^version:|^category:|^tags:/m);
  });

  it("runs dry-run discovery without inspecting real .env files", async () => {
    const realMongoUri = "mongo" + "db://real-secret-host/prod";
    const exampleMongoUri = "mongo" + "db://localhost:27017/synthetic";
    const projectRoot = await makeProject({
      extra: {
        ".env": `MONGODB_URI=${realMongoUri}`,
        ".env.example": `MONGODB_URI=${exampleMongoUri}`,
        "src/routes/users.ts": "export const route = '/users';"
      }
    });

    const report = discoverProject(projectRoot);

    expect(report.mode).toBe("dry-run-discovery-only");
    expect(report.mongoSignals.realEnvInspected).toBe(false);
    expect(report.mongoSignals.envExampleMentionsMongo).toBe(true);
    expect(JSON.stringify(report)).not.toContain("real-secret-host");
    expect(report.security.policy.writeDecision.decision).toBe("approval_required");
    expect(report.security.policy.installDecision.decision).toBe("approval_required");
    expect(report.security.policy.tunnelDecision.decision).toBe("approval_required");
  });

  it("publishes strict local security rules", () => {
    expect(uatCrudMongoSecurityRules).toEqual(UAT_CRUD_MONGODB_SECURITY_RULE_IDS);
    expect(uatCrudMongoSecurityRules).toEqual(
      expect.arrayContaining([
        "dry-run-discovery-only",
        "no-real-env-read",
        "no-mongodb-connect",
        "no-database-write",
        "synthetic-data-only",
        "no-package-install",
        "no-public-tunnel",
        "no-provider-call",
        "no-customer-data"
      ])
    );
  });
});
