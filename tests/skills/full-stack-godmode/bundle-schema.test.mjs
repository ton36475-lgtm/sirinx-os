import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  BUNDLE_PATH,
  SKILL_NAMES,
  parseRestrictedBundleYaml,
} from "./test-helpers.mjs";

test("full-stack-godmode bundle conforms to the Hermes bundle schema", () => {
  const raw = fs.readFileSync(BUNDLE_PATH, "utf8");
  assert.equal(raw.includes("\t"), false, "bundle YAML must not contain tabs");

  const bundle = parseRestrictedBundleYaml(raw);
  assert.deepEqual(bundle.keys, ["name", "description", "skills", "instruction"]);
  assert.equal(bundle.name, "full-stack-godmode");
  assert.ok(bundle.description.length >= 40);
  assert.deepEqual(bundle.skills, SKILL_NAMES);
  assert.equal(new Set(bundle.skills).size, bundle.skills.length);
  assert.ok(bundle.instruction.length >= 500);
});

test("bundle instruction is rigor-oriented and fail-closed", () => {
  const bundle = parseRestrictedBundleYaml(fs.readFileSync(BUNDLE_PATH, "utf8"));
  assert.match(bundle.instruction, /Godmode means rigor, not expanded authority\./);
  assert.match(bundle.instruction, /Do not load or reference any red-team or jailbreak godmode skill/);
  assert.match(bundle.instruction, /Never read or expose secret material/);
  assert.match(bundle.instruction, /task_id, action, target, scope, exact_operation, approved_by, approved_at,/);
  assert.match(bundle.instruction, /and expires_at/);
  assert.match(bundle.instruction, /sender-side submission is not execution proof/);
  assert.match(bundle.instruction, /preview or push is not production deploy/);
  assert.match(bundle.instruction, /every required row\s+is VERIFIED/);
});
