import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

test("private dashboard exposes one dominant evidence-first attention region", () => {
  assert.match(html, /class="attention-rail"/);
  assert.match(html, /Now \/ Needs Attention/);
  assert.match(html, />Observed</);
  assert.match(html, />Unverified</);
  assert.match(html, />Blocked</);
  assert.match(html, /private surface only/);
});

test("attention region is responsive and status is not color-only", () => {
  assert.match(css, /\.attention-rail\s*\{/);
  assert.match(css, /\.attention-evidence li\s*\{/);
  assert.match(css, /@media \(max-width: 860px\)/);
  assert.match(css, /grid-template-columns: 100px minmax\(0, 1fr\)/);
  assert.match(css, /@media \(max-width: 520px\)/);
  assert.match(css, /\.attention-evidence li\s*\{[\s\S]*grid-template-columns: 1fr/);
  assert.match(html, /Targeted dispatcher gates contained/);
  assert.match(html, /secret access is hard-denied/);
  assert.match(html, /Runtime activation/);
  assert.match(html, /External effects/);
});
