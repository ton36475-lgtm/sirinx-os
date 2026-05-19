import { access, readFile } from "node:fs/promises";

const requiredFiles = [
  "AGENTS.md",
  "PROJECT_STATE.md",
  "NEXT_ACTIONS.md",
  "RULES_FOR_CODEX.md",
  "MCP_MAP.md",
  "SKILLS_REGISTRY.md",
  "TOOLS_REGISTRY.md",
  "services/hermes-api/README.md",
  "packages/policy-core/README.md",
  "packages/async-core/README.md",
  "vault/README.md",
  "vault/evidence/README.md",
  "vault/logs/.gitignore",
  "vault/logs/README.md"
];

const requiredPhrases = new Map([
  ["PROJECT_STATE.md", ["External writes remain blocked by default.", "Stop Rules"]],
  ["NEXT_ACTIONS.md", ["strict ordered queue", "Approval-Gated"]],
  ["RULES_FOR_CODEX.md", ["AGENTS.md", "Do not read `.env` values."]],
  ["MCP_MAP.md", ["no secrets", "External Write Policy"]],
  ["SKILLS_REGISTRY.md", ["path-backed", "does not authorize external writes"]],
  ["TOOLS_REGISTRY.md", ["External writes require exact target approval", "Blocked Until Evidence"]]
]);

const forbiddenPatterns = [
  /externalWrites\s*=\s*true/i,
  /PAID_API_ENABLED\s*=\s*true/i,
  /deploy without.*approval/i,
  /send.*without.*approval/i
];

async function assertExists(file) {
  try {
    await access(file);
  } catch {
    throw new Error(`Missing required operating file: ${file}`);
  }
}

async function main() {
  for (const file of requiredFiles) {
    await assertExists(file);
  }

  for (const [file, phrases] of requiredPhrases) {
    const text = await readFile(file, "utf8");
    for (const phrase of phrases) {
      if (!text.includes(phrase)) {
        throw new Error(`${file} is missing required phrase: ${phrase}`);
      }
    }
    for (const pattern of forbiddenPatterns) {
      if (pattern.test(text)) {
        throw new Error(`${file} contains forbidden operating claim: ${pattern}`);
      }
    }
  }

  console.log(`operating file check passed: ${requiredFiles.length} files`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
