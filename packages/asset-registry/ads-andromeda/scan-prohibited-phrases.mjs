import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..", "..");
const lockPath = resolve(here, "text-locks.json");
const templatesPath = resolve(repoRoot, "prompts", "ads-andromeda", "templates.json");

function countByCategory(templates) {
  return templates.reduce((acc, template) => {
    acc[template.category] = (acc[template.category] || 0) + 1;
    return acc;
  }, {});
}

function renderTemplate(template, sampleData, thaiTextLockBlock) {
  return template.prompt.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, key) => {
    if (key === "thai_text_lock_block") return thaiTextLockBlock;
    return sampleData[key] ?? "";
  });
}

function isNegatedVisualPattern(text, index) {
  const prefix = text.slice(Math.max(0, index - 32), index).toLowerCase();
  return /\b(no|avoid|without|do not|never)\b.{0,24}$/.test(prefix) || /ห้าม.{0,24}$/.test(prefix);
}

export function validateAssetFactoryData({ locks, templatePack }) {
  const errors = [];
  const warnings = [];
  const templates = templatePack.templates || [];
  const sampleData = templatePack.sample_data || {};
  const thaiTextLockBlock = locks.canonical_text_lock.join("\n");
  const categoryCounts = countByCategory(templates);
  const requiredCounts = {
    poster: 3,
    cover: 3,
    video_storyboard: 3
  };
  const renderedTemplates = templates.map((template) => ({
    id: template.id,
    category: template.category,
    rendered: renderTemplate(template, sampleData, thaiTextLockBlock)
  }));

  for (const [category, expected] of Object.entries(requiredCounts)) {
    if (categoryCounts[category] !== expected) {
      errors.push({
        type: "category_count",
        category,
        expected,
        actual: categoryCounts[category] || 0
      });
    }
  }

  for (const template of renderedTemplates) {
    if (/\{\{[a-zA-Z0-9_]+\}\}/.test(template.rendered)) {
      errors.push({ type: "unresolved_placeholder", template_id: template.id });
    }

    for (const line of locks.canonical_text_lock) {
      if (!template.rendered.includes(line)) {
        errors.push({ type: "missing_text_lock", template_id: template.id, text: line });
      }
    }

    for (const phrase of locks.prohibited_phrases) {
      if (template.rendered.includes(phrase)) {
        errors.push({ type: "prohibited_phrase", template_id: template.id, phrase });
      }
    }

    for (const typo of locks.forbidden_typos) {
      if (template.rendered.includes(typo)) {
        errors.push({ type: "forbidden_typo", template_id: template.id, typo });
      }
    }

    for (const pattern of locks.blocked_visual_patterns) {
      let searchFrom = 0;
      const lowered = template.rendered.toLowerCase();
      const needle = pattern.toLowerCase();
      while (true) {
        const index = lowered.indexOf(needle, searchFrom);
        if (index === -1) break;
        if (!isNegatedVisualPattern(lowered, index)) {
          errors.push({ type: "blocked_visual_pattern", template_id: template.id, pattern });
        }
        searchFrom = index + needle.length;
      }
    }
  }

  if (templates.length !== 9) {
    warnings.push({ type: "template_total", expected: 9, actual: templates.length });
  }

  return {
    status: errors.length === 0 ? "PASS" : "FAIL",
    template_count: templates.length,
    category_counts: categoryCounts,
    rendered_template_count: renderedTemplates.length,
    text_lock_line_count: locks.canonical_text_lock.length,
    errors,
    warnings
  };
}

export async function validateAssetFactory() {
  const [locks, templatePack] = await Promise.all([
    readFile(lockPath, "utf8").then(JSON.parse),
    readFile(templatesPath, "utf8").then(JSON.parse)
  ]);
  return validateAssetFactoryData({ locks, templatePack });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const report = await validateAssetFactory();
  console.log(JSON.stringify(report, null, 2));
  if (report.status !== "PASS") {
    process.exitCode = 1;
  }
}
