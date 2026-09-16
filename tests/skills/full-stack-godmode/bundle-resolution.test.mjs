import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  BUNDLE_PATH,
  SKILL_NAMES,
  parseFrontmatter,
  parseRestrictedBundleYaml,
  skillPath,
} from "./test-helpers.mjs";

test("every bundle member resolves to a valid progressive-disclosure skill", () => {
  const bundle = parseRestrictedBundleYaml(fs.readFileSync(BUNDLE_PATH, "utf8"));

  for (const name of bundle.skills) {
    const file = skillPath(name, "SKILL.md");
    assert.equal(fs.existsSync(file), true, `${name} must resolve to SKILL.md`);
    const { fields, raw, body } = parseFrontmatter(fs.readFileSync(file, "utf8"));

    assert.equal(fields.name, name);
    assert.match(fields.description, /^Use when /);
    assert.ok(fields.description.length <= 1024);
    assert.equal(fields.version, "1.0.0");
    assert.equal(fields.author, "SIRINXDev");
    assert.equal(fields.license, "MIT");
    assert.match(raw, /^metadata:\n  hermes:\n    tags:/m);
    assert.match(raw, /^    related_skills: \[[^\]]+\]$/m);
    assert.ok(body.trim().length >= 1000);
    assert.ok(fs.existsSync(skillPath(name, "references")), `${name} needs references/`);
    assert.ok(fs.existsSync(skillPath(name, "templates")), `${name} needs templates/`);
  }
});

test("related skill references resolve within the bundle", () => {
  for (const name of SKILL_NAMES) {
    const content = fs.readFileSync(skillPath(name, "SKILL.md"), "utf8");
    const { raw } = parseFrontmatter(content);
    const match = raw.match(/^    related_skills: \[([^\]]+)\]$/m);
    assert.ok(match, `${name} must declare related_skills`);
    const related = match[1].split(",").map((value) => value.trim());
    for (const dependency of related) {
      assert.ok(SKILL_NAMES.includes(dependency), `${name} references missing ${dependency}`);
      assert.notEqual(dependency, name, `${name} must not self-reference`);
    }
  }
});

test("every bundle member has three creator-schema evals", () => {
  for (const name of SKILL_NAMES) {
    const evalPath = skillPath(name, "evals", "evals.json");
    const data = JSON.parse(fs.readFileSync(evalPath, "utf8"));
    assert.equal(data.skill_name, name);
    assert.equal(data.evals.length, 3);
    assert.equal(new Set(data.evals.map((item) => item.id)).size, 3);
    for (const item of data.evals) {
      assert.ok(Number.isInteger(item.id));
      assert.ok(item.prompt.length >= 60);
      assert.ok(item.expected_output.length >= 50);
      assert.ok(Array.isArray(item.files));
      assert.ok(Array.isArray(item.expectations) && item.expectations.length >= 3);
      assert.equal(item.expectations.every((entry) => entry.length >= 20), true);
    }
  }
});
