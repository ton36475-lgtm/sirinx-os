import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(__dirname, "..");
const repoRoot = resolve(appRoot, "../..");
const args = process.argv.slice(2);
const jsonIndex = args.indexOf("--json");
const jsonPath = jsonIndex >= 0 ? resolve(repoRoot, args[jsonIndex + 1]) : null;

const sourceHtml = await readFile(resolve(appRoot, "src/index.html"), "utf8");
const sourceCss = await readFile(resolve(appRoot, "src/styles.css"), "utf8");
const distHtmlPath = resolve(appRoot, "dist/index.html");
const distHtml = existsSync(distHtmlPath) ? await readFile(distHtmlPath, "utf8") : "";
const combined = `${sourceHtml}\n${sourceCss}\n${distHtml}`;

const requiredNav = ["HOME", "ARTISTS", "MUSIC", "VIDEOS", "NEWS", "ABOUT", "CONTACT"];
const requiredSections = [
  "hero",
  "identity",
  "youtube",
  "artists",
  "releases",
  "videos",
  "news",
  "partners",
  "roadmap",
  "founder-cta",
  "academy",
  "contact"
];
const forbiddenPatterns = [
  /รับประกัน/i,
  /รวยทันที/i,
  /กำไรแน่นอน/i,
  /ไม่มีความเสี่ยง/i,
  /ปลอดภัย 100%/i,
  /guaranteed/i,
  /best in thailand/i,
  /\b#1\b/i,
  /api[_-]?key/i,
  /\.env/i,
  /private key/i,
  /customer data/i,
  /\/api\//i,
  /database/i
];

const failures = [];

for (const label of requiredNav) {
  if (!sourceHtml.includes(`>${label}<`)) {
    failures.push(`missing_nav_${label}`);
  }
}

for (const section of requiredSections) {
  if (!sourceHtml.includes(`data-section="${section}"`)) {
    failures.push(`missing_section_${section}`);
  }
}

for (const pattern of forbiddenPatterns) {
  if (pattern.test(combined)) {
    failures.push(`forbidden_pattern_${pattern.source}`);
  }
}

const checks = {
  hero_phrase: sourceHtml.includes("WE CREATE. YOU FEEL."),
  language_toggle: sourceHtml.includes("TH/EN") && sourceCss.includes('body[data-lang="th"]'),
  hamburger: sourceHtml.includes("menu-button") && sourceCss.includes(".menu-button"),
  mobile_first_css: sourceCss.includes("@media (min-width: 760px)") && sourceCss.includes("min-width: 320px"),
  visual_core: sourceHtml.includes("3D abstract AGM arrow core visual") && sourceCss.includes(".core-scene"),
  public_safe_copy: failures.length === 0
};

for (const [key, passed] of Object.entries(checks)) {
  if (!passed) failures.push(`failed_${key}`);
}

const payload = {
  packet: "A2A2A-P046-AGM-CREATIVE-MEDIA-PLATFORM-20260703",
  status: failures.length === 0 ? "PASS" : "FAIL",
  app: "@agm/site",
  required_nav: requiredNav,
  required_sections: requiredSections,
  checks,
  failures
};

if (jsonPath) {
  await writeFile(jsonPath, `${JSON.stringify(payload, null, 2)}\n`);
}

console.log(JSON.stringify(payload, null, 2));

if (failures.length > 0) {
  process.exit(1);
}
