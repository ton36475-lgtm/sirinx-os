import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';

function checkSelectorDepth(cssContent) {
  const nestedSelectors = cssContent.match(/[.#\w][^{]+\{[^}]*\}/g) || [];
  let maxDepth = 0;
  let deepSelectors = [];

  for (const block of nestedSelectors) {
    const selector = block.split('{')[0].trim();
    const combinators = (selector.match(/\s+[>+~]\s+|\s+/g) || []).length;
    if (combinators > maxDepth) {
      maxDepth = combinators;
    }
    if (combinators > 3) {
      deepSelectors.push(selector);
    }
  }

  return { maxDepth, deepSelectors };
}

function checkUnusedRules(cssContent) {
  const declarations = cssContent.match(/[a-z-]+\s*:\s*[^;{}]+;/gi) || [];
  const vendorPrefixes = declarations.filter(d =>
    /^-webkit-|-moz-|-ms-|-o-/.test(d)
  );
  const importantCount = declarations.filter(d => /!important/.test(d)).length;
  const duplicatePattern = /(\S+\s*\{[^}]*\})/g;
  const blocks = cssContent.match(duplicatePattern) || [];
  const seen = new Map();
  const duplicates = [];

  for (const block of blocks) {
    const key = block.replace(/\s+/g, ' ');
    if (seen.has(key)) {
      duplicates.push(block.split('{')[0].trim());
    }
    seen.set(key, true);
  }

  return {
    totalDeclarations: declarations.length,
    vendorPrefixCount: vendorPrefixes.length,
    importantCount,
    duplicateBlockCount: duplicates.length,
    duplicateSelectors: duplicates.slice(0, 5),
  };
}

function checkFileSize(path) {
  return { bytes: 0 };
}

function checkInlineStyles(content) {
  const inlineStyles = (content.match(/style\s*=\s*["'][^"']*["']/gi) || []).length;
  return inlineStyles;
}

function checkImportantDeclarations(cssContent) {
  return (cssContent.match(/!important/g) || []).length;
}

function checkEmptyRules(cssContent) {
  const emptyPattern = /[.#\w][^{]*\{\s*\}/g;
  return (cssContent.match(emptyPattern) || []).length;
}

async function collectCssContent(target, filePath) {
  if (filePath) {
    await access(filePath);
    return readFile(filePath, 'utf-8');
  }

  const root = process.env.SIRINX_PROJECT_ROOT || '/Users/sirinx/sirinx-os';
  const targetPaths = [
    join(root, 'apps', target),
    join(root, 'services', target),
    join(root, 'packages', target),
  ];

  let content = '';
  const { readdir } = await import('node:fs/promises');

  for (const base of targetPaths) {
    try {
      await access(base);
      const files = await readdir(base, { recursive: true });
      const cssFiles = files.filter(f =>
        f.endsWith('.css') || f.endsWith('.scss') || f.endsWith('.module.css')
      );
      for (const f of cssFiles) {
        content += await readFile(join(base, f), 'utf-8') + '\n';
      }
    } catch {}
  }

  return content || '/* no source found */';
}

export async function reviewComponent({ target, content, filePath }) {
  const cssContent = content || await collectCssContent(target, filePath);
  const { maxDepth, deepSelectors } = checkSelectorDepth(cssContent);
  const usage = checkUnusedRules(cssContent);
  const inlineStyles = checkInlineStyles(cssContent);
  const importantCount = checkImportantDeclarations(cssContent);
  const emptyRules = checkEmptyRules(cssContent);
  const totalLines = cssContent.split('\n').length;

  let score = 10;
  const issues = [];

  if (maxDepth > 3) {
    score -= 2;
    issues.push(`Nesting depth ${maxDepth} (limit 3) — ${deepSelectors.length} selectors exceed`);
  }
  if (maxDepth > 5) {
    score -= 1;
  }

  if (usage.vendorPrefixCount > 10) {
    score -= 1;
    issues.push(`Vendor prefixes: ${usage.vendorPrefixCount} (use autoprefixer instead)`);
  }

  if (usage.importantCount > 3) {
    score -= 1;
    issues.push(`!important usage: ${usage.importantCount} (specificity issue)`);
  }
  if (usage.importantCount > 10) {
    score -= 1;
  }

  if (usage.duplicateBlockCount > 2) {
    score -= 1;
    issues.push(`Duplicate CSS blocks: ${usage.duplicateBlockCount}`);
  }

  if (emptyRules > 3) {
    score -= 1;
    issues.push(`Empty CSS rules: ${emptyRules}`);
  }

  if (inlineStyles > 5) {
    score -= 1;
    issues.push(`Inline styles: ${inlineStyles} (move to CSS classes)`);
  }

  if (totalLines > 500) {
    score -= 1;
    issues.push(`File size: ${totalLines} lines (consider splitting)`);
  }

  score = Math.max(0, Math.round(score));
  const passed = score >= 6;

  return {
    mode: 'review',
    target: target || filePath,
    score,
    passed,
    grade: score >= 9 ? 'A' : score >= 7 ? 'B' : score >= 5 ? 'C' : 'D',
    metrics: {
      totalLines,
      maxSelectorDepth: maxDepth,
      deepSelectors: deepSelectors.length,
      totalDeclarations: usage.totalDeclarations,
      vendorPrefixes: usage.vendorPrefixCount,
      importantDeclarations: importantCount,
      duplicateBlocks: usage.duplicateBlockCount,
      emptyRules,
      inlineStyles,
    },
    issues,
    recommendations: [
      ...(maxDepth > 3 ? [`ลด Nesting depth จาก ${maxDepth} เหลือ ≤3`] : []),
      ...(usage.importantCount > 0 ? ['ใช้ CSS specificity แทน !important'] : []),
      ...(inlineStyles > 0 ? ['ย้าย Inline styles ไปเป็น CSS classes'] : []),
      ...(usage.duplicateBlockCount > 0 ? ['รวม CSS blocks ที่ซ้ำกัน'] : []),
      ...(emptyRules > 0 ? ['ลบ Empty CSS rules ที่ไม่ใช้งาน'] : []),
      ...(usage.vendorPrefixCount > 0 ? ['ใช้ Autoprefixer แทนการเขียน Vendor prefixes ด้วยมือ'] : []),
      score < 7 ? ['ใช้ CSS Custom Properties เพื่อลดการซ้ำซ้อน'] : [],
    ],
    designPrinciples: ['Technical Minimalism', 'Clean Code', 'DRY'],
  };
}
