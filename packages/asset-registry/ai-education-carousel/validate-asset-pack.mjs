import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(new URL("../../..", import.meta.url).pathname);

export async function validateAssetPack(root = repoRoot) {
  const templatesPath = resolve(root, "prompts/ai-education-carousel/templates.json");
  const stylePath = resolve(root, "packages/asset-registry/ai-education-carousel/style-tokens.json");
  const checklistPath = resolve(root, "packages/asset-registry/ai-education-carousel/thai-typography-checklist.md");
  const docPath = resolve(root, "docs/creative/AI_EDUCATION_CAROUSEL_ASSET_PACK.md");

  const templates = JSON.parse(await readFile(templatesPath, "utf8"));
  const styleTokens = JSON.parse(await readFile(stylePath, "utf8"));
  const templateText = JSON.stringify(templates, null, 2);
  const failures = [];
  const warnings = [];

  const requiredTemplateCount = 5;
  const requiredPalette = [
    "warm_ivory",
    "deep_ink_navy",
    "cool_slate",
    "clean_cyan",
    "warm_coral",
    "muted_gold"
  ];
  const blockedVisualTerms = [
    "cyberpunk",
    "excessive glow",
    "black dominance",
    "black-dominant",
    "neon purple",
    "holographic",
    "dark futuristic"
  ];

  if (!Array.isArray(templates.templates) || templates.templates.length !== requiredTemplateCount) {
    failures.push(`expected_${requiredTemplateCount}_templates`);
  }

  for (const color of requiredPalette) {
    if (!styleTokens.palette?.[color]?.hex) {
      failures.push(`missing_palette_${color}`);
    }
  }

  for (const term of blockedVisualTerms) {
    if (templateText.toLowerCase().includes(term)) {
      failures.push(`blocked_visual_term_${term.replaceAll(" ", "_")}`);
    }
  }

  for (const [index, template] of (templates.templates ?? []).entries()) {
    const prefix = template.id ?? `template_${index + 1}`;
    if (!template.id || !template.title || !template.prompt) {
      failures.push(`${prefix}_missing_required_fields`);
    }
    if (!/[\u0E00-\u0E7F]/.test(template.thai_headline_stub ?? "")) {
      failures.push(`${prefix}_missing_thai_headline`);
    }
    if ((template.prompt ?? "").length < 180) {
      failures.push(`${prefix}_prompt_too_short`);
    }
    const tokenSurface = `${template.prompt ?? ""} ${(template.style_token_refs ?? []).join(" ")}`;
    const paletteHits = requiredPalette.filter((token) => tokenSurface.includes(token));
    if (paletteHits.length < 5) {
      failures.push(`${prefix}_insufficient_style_tokens`);
    }
    if (/\s{2,}/.test(template.thai_headline_stub ?? "")) {
      warnings.push(`${prefix}_thai_headline_double_space`);
    }
  }

  if (!styleTokens.constraints?.thai_first) failures.push("thai_first_constraint_missing");
  if (!styleTokens.constraints?.mobile_readable) failures.push("mobile_readable_constraint_missing");
  if (!styleTokens.constraints?.paid_generation_requires_gate) {
    failures.push("paid_generation_gate_constraint_missing");
  }
  if (!existsSync(checklistPath)) failures.push("missing_thai_typography_checklist");
  if (!existsSync(docPath)) failures.push("missing_color_usage_guide");

  return {
    packet: "A2A2A-P047-CREATIVE-ASSET-PIPELINE-20260703",
    status: failures.length === 0 ? "PASS" : "FAIL",
    pack_id: templates.pack_id,
    style_name: styleTokens.style_name,
    template_count: templates.templates?.length ?? 0,
    required_palette: requiredPalette,
    failures,
    warnings
  };
}

async function main() {
  const args = process.argv.slice(2);
  const jsonIndex = args.indexOf("--json");
  const jsonPath = jsonIndex >= 0 ? resolve(repoRoot, args[jsonIndex + 1]) : null;
  const payload = await validateAssetPack();

  if (jsonPath) {
    await writeFile(jsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  }

  console.log(JSON.stringify(payload, null, 2));

  if (payload.status !== "PASS") {
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
