import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../..");
const requiredText = [
  "เฮียซูมซาลาเปา",
  "ข้าวหมูแดงลุงแบงค์ เตาถ่าน",
  "ตามเมียสั่ง",
  "tree_sale_yangna"
];
const blockedPromptPatterns = [
  /fake chat UI/i,
  /private system screenshot/i,
  /internal dashboard/i,
  /cyberpunk/i,
  /cartoon/i,
  /anime/i,
  /API key/i,
  /database/i,
  /CRM/i,
  /token/i,
  /secret/i
];

async function readJson(path) {
  return JSON.parse(await readFile(resolve(repoRoot, path), "utf8"));
}

export async function validateLocalBusinessPack() {
  const templates = await readJson("prompts/local-business/templates.json");
  const locks = await readJson("packages/asset-registry/local-business/text-locks.json");
  const failures = [];

  if (templates.mode !== "public_marketing_only") failures.push("templates_mode_not_public_marketing_only");
  if (templates.projects.length !== 4) failures.push("templates_project_count_not_4");
  if (locks.projects.length !== 4) failures.push("locks_project_count_not_4");

  for (const text of requiredText) {
    const lock = locks.projects.find((project) => project.required_text === text);
    if (!lock) failures.push(`missing_text_lock_${text}`);
    const template = templates.projects.find((project) => project.locked_text === text);
    if (!template) failures.push(`missing_template_${text}`);
    if (template && (!template.poster_prompt.includes(text) || !template.social_prompt.includes(text))) {
      failures.push(`template_missing_locked_text_${text}`);
    }
  }

  const promptSurface = templates.projects.map((project) => `${project.poster_prompt}\n${project.social_prompt}`).join("\n");
  for (const pattern of blockedPromptPatterns) {
    if (pattern.test(promptSurface)) failures.push(`blocked_prompt_pattern_${pattern.source}`);
  }
  if (!templates.global_negative_prompt.includes("no fake chat UI")) failures.push("missing_fake_chat_negative_prompt");
  if (!templates.usage_gate.includes("no_paid_generation")) failures.push("missing_no_paid_generation_gate");

  return {
    packet: "A2A2A-P055-LOCAL-BUSINESS-PROMO-PACK-20260703",
    status: failures.length === 0 ? "PASS" : "FAIL",
    project_count: templates.projects.length,
    required_text: requiredText,
    failures
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const jsonIndex = args.indexOf("--json");
  const jsonPath = jsonIndex >= 0 ? resolve(repoRoot, args[jsonIndex + 1]) : null;
  const payload = await validateLocalBusinessPack();
  if (jsonPath) await writeFile(jsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(JSON.stringify(payload, null, 2));
  if (payload.failures.length > 0) process.exit(1);
}
