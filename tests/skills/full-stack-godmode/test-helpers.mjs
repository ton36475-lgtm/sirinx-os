import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

export const BUNDLE_PATH = path.join(
  REPO_ROOT,
  "configs/hermes/skill-bundles/full-stack-godmode.yaml",
);

export const SKILL_NAMES = Object.freeze([
  "repo-intake-quarantine",
  "codebase-cartographer",
  "authorized-reverse-engineering",
  "system-design-architect",
  "senior-fullstack-builder",
  "evidence-verifier",
]);

export function readText(relativePath) {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

export function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]+)$/);
  if (!match) {
    throw new Error("missing or malformed YAML frontmatter");
  }
  const fields = {};
  for (const line of match[1].split("\n")) {
    const field = line.match(/^([a-zA-Z][a-zA-Z0-9_-]*):\s*(.*)$/);
    if (field) {
      fields[field[1]] = field[2].trim().replace(/^['"]|['"]$/g, "");
    }
  }
  return { fields, raw: match[1], body: match[2] };
}

export function parseRestrictedBundleYaml(content) {
  const result = { keys: [], skills: [], instruction: "" };
  const lines = content.split(/\r?\n/);
  let section = null;
  const instruction = [];

  for (const line of lines) {
    if (line.length === 0) {
      if (section === "instruction") instruction.push("");
      continue;
    }
    const topLevel = line.match(/^([a-z_]+):(?:\s*(.*))?$/);
    if (topLevel) {
      const [, key, rawValue = ""] = topLevel;
      result.keys.push(key);
      section = key;
      if (key !== "skills" && key !== "instruction") {
        result[key] = rawValue.trim();
      }
      continue;
    }
    const listItem = line.match(/^  -\s+([a-z0-9-]+)$/);
    if (section === "skills" && listItem) {
      result.skills.push(listItem[1]);
      continue;
    }
    if (section === "instruction" && /^  /.test(line)) {
      instruction.push(line.slice(2));
      continue;
    }
    throw new Error(`unsupported bundle YAML line: ${line}`);
  }

  result.instruction = instruction.join("\n").trim();
  return result;
}

export function skillPath(name, ...parts) {
  return path.join(REPO_ROOT, "skills", name, ...parts);
}
