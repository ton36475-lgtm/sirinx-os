import { readFile, access } from 'node:fs/promises';
import { join, extname } from 'node:path';

const CSS_GRID_PATTERNS = [
  /display\s*:\s*grid/i,
  /display\s*:\s*inline-grid/i,
  /grid-template-columns/i,
  /grid-template-rows/i,
  /grid-template-areas/i,
  /grid-column/i,
  /grid-row/i,
  /grid-area/i,
  /grid-gap|gap\s*:/i,
];

const FLEXBOX_PATTERNS = [
  /display\s*:\s*flex/i,
  /display\s*:\s*inline-flex/i,
  /flex-direction/i,
  /flex-wrap/i,
  /justify-content/i,
  /align-items/i,
  /flex\s*:/i,
];

const TYPOGRAPHY_PATTERNS = [
  /font-size\s*:/i,
  /line-height\s*:/i,
  /font-family\s*:/i,
  /font-weight\s*:/i,
  /letter-spacing\s*:/i,
  /text-transform\s*:/i,
];

const SPACING_PATTERNS = [
  /margin\s*:/i,
  /padding\s*:/i,
  /margin-top\s*:/i,
  /margin-bottom\s*:/i,
  /padding-top\s*:/i,
  /padding-bottom\s*:/i,
];

const COLOR_PATTERNS = [
  /color\s*:/i,
  /background-color\s*:/i,
  /background\s*:/i,
  /border-color\s*:/i,
  /--[\w-]+\s*:/g,
];

const ALIGNMENT_PATTERNS = [
  /text-align\s*:/i,
  /vertical-align\s*:/i,
  /align-self\s*:/i,
  /justify-self\s*:/i,
  /place-items\s*:/i,
  /place-content\s*:/i,
];

function countMatches(content, patterns) {
  return patterns.reduce((sum, p) => {
    const matches = content.match(p);
    return sum + (matches ? matches.length : 0);
  }, 0);
}

function extractColorCount(content) {
  const colorValues = new Set();
  const hexPattern = /#([0-9a-fA-F]{3,8})\b/g;
  let m;
  while ((m = hexPattern.exec(content)) !== null) {
    colorValues.add(m[0].toLowerCase());
  }
  const rgbPattern = /rgba?\s*\([^)]+\)/g;
  while ((m = rgbPattern.exec(content)) !== null) {
    colorValues.add(m[0]);
  }
  return colorValues.size;
}

function extractCssVarCount(content) {
  const vars = new Set();
  const pattern = /--[\w-]+/g;
  let m;
  while ((m = pattern.exec(content)) !== null) {
    vars.add(m[0]);
  }
  return vars.size;
}

function extractFontFamilies(content) {
  const families = new Set();
  const pattern = /font-family\s*:\s*([^;{}]+)/gi;
  let m;
  while ((m = pattern.exec(content)) !== null) {
    const parts = m[1].split(',').map(s => s.replace(/["']/g, '').trim());
    parts.forEach(p => { if (p) families.add(p); });
  }
  return families.size;
}

function checkGridSystemScore(gridCount, flexCount, totalCssSize) {
  if (gridCount >= 3) return 10;
  if (gridCount >= 1) return 7;
  if (flexCount >= 5) return 6;
  if (totalCssSize > 0) return 4;
  return 0;
}

function checkTypographyScore(typoCount, fontFamilies) {
  if (typoCount >= 8 && fontFamilies <= 3) return 10;
  if (typoCount >= 5 && fontFamilies <= 4) return 8;
  if (typoCount >= 3) return 6;
  if (typoCount > 0) return 4;
  return 0;
}

function checkSpacingScore(spacingCount) {
  if (spacingCount >= 10) return 10;
  if (spacingCount >= 6) return 8;
  if (spacingCount >= 3) return 6;
  if (spacingCount > 0) return 4;
  return 0;
}

function checkColorScore(colorCount, uniqueColors) {
  if (uniqueColors <= 5 && colorCount >= 5) return 10;
  if (uniqueColors <= 8 && colorCount >= 3) return 8;
  if (uniqueColors <= 12) return 6;
  if (uniqueColors <= 20) return 4;
  return 2;
}

function checkAlignmentScore(alignCount) {
  if (alignCount >= 6) return 10;
  if (alignCount >= 4) return 8;
  if (alignCount >= 2) return 6;
  if (alignCount > 0) return 4;
  return 0;
}

export async function analyzeComponent({ target, content, filePath }) {
  if (!content && filePath) {
    await access(filePath);
    content = await readFile(filePath, 'utf-8');
  }

  if (!content) {
    const mockPath = join(process.env.SIRINX_PROJECT_ROOT || '/Users/sirinx/sirinx-os', 'apps', target, 'src');
    try {
      content = '';
      const { readdir } = await import('node:fs/promises');
      const files = await readdir(mockPath).catch(() => []);
      for (const f of files) {
        if (f.endsWith('.css') || f.endsWith('.scss') || f.endsWith('.module.css')) {
          content += await readFile(join(mockPath, f), 'utf-8') + '\n';
        }
      }
    } catch {
      content = '/* no source found */';
    }
  }

  const totalSize = content.length;
  const gridCount = countMatches(content, CSS_GRID_PATTERNS);
  const flexCount = countMatches(content, FLEXBOX_PATTERNS);
  const typoCount = countMatches(content, TYPOGRAPHY_PATTERNS);
  const spacingCount = countMatches(content, SPACING_PATTERNS);
  const colorCount = countMatches(content, COLOR_PATTERNS);
  const alignCount = countMatches(content, ALIGNMENT_PATTERNS);
  const uniqueColors = extractColorCount(content);
  const cssVarCount = extractCssVarCount(content);
  const fontFamilies = extractFontFamilies(content);

  const gridScore = checkGridSystemScore(gridCount, flexCount, totalSize);
  const typographyScore = checkTypographyScore(typoCount, fontFamilies);
  const spacingScore = checkSpacingScore(spacingCount);
  const colorScore = checkColorScore(colorCount, uniqueColors);
  const alignmentScore = checkAlignmentScore(alignCount);

  const totalScore = Math.round(
    (gridScore * 0.30) +
    (typographyScore * 0.25) +
    (spacingScore * 0.20) +
    (colorScore * 0.15) +
    (alignmentScore * 0.10)
  );

  const recommendations = [];
  if (gridScore < 7) recommendations.push('ใช้ CSS Grid layout แทน Flexbox สำหรับโครงสร้างหลัก');
  if (gridCount === 0 && flexCount === 0) recommendations.push('เพิ่มระบบ Layout (CSS Grid หรือ Flexbox)');
  if (typographyScore < 7) recommendations.push('กำหนด Typography Scale ที่ชัดเจน: font-size, line-height, font-family');
  if (fontFamilies > 3) recommendations.push(`ลดจำนวน Font families (${fontFamilies} → ≤3)`);
  if (spacingScore < 7) recommendations.push('ใช้ระบบ Spacing ที่สม่ำเสมอ (margin/padding scale)');
  if (uniqueColors > 8) recommendations.push(`ลดจำนวนสีที่ใช้ (${uniqueColors} สี → ≤8)`);
  if (cssVarCount < 3 && colorCount > 0) recommendations.push('ใช้ CSS Custom Properties (--var) เพื่อจัดการธีม');
  if (alignmentScore < 7) recommendations.push('เพิ่มระบบ Alignment: text-align, align-items, justify-content');

  const passed = totalScore >= 7;

  return {
    mode: 'redesign',
    target,
    score: totalScore,
    passed,
    grade: totalScore >= 9 ? 'A' : totalScore >= 7 ? 'B' : totalScore >= 5 ? 'C' : 'D',
    metrics: {
      cssSize: totalSize,
      gridUsage: gridCount,
      flexboxUsage: flexCount,
      typographyRules: typoCount,
      spacingRules: spacingCount,
      colorDeclarations: colorCount,
      uniqueColors,
      cssVariables: cssVarCount,
      fontFamilies,
      alignmentRules: alignCount,
    },
    subscores: {
      grid: gridScore,
      typography: typographyScore,
      spacing: spacingScore,
      color: colorScore,
      alignment: alignmentScore,
    },
    recommendations,
    designPrinciples: ['Swiss Design', 'Editorial Grid', 'Technical Minimalism'],
  };
}
