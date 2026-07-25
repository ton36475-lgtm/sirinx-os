import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';

function checkSemanticHtml(content) {
  const semanticTags = [
    'header', 'nav', 'main', 'article', 'section', 'aside',
    'footer', 'figure', 'figcaption', 'mark', 'time',
  ];
  const results = {};
  for (const tag of semanticTags) {
    const regex = new RegExp(`<${tag}[\\s>]`, 'gi');
    results[tag] = (content.match(regex) || []).length;
  }
  const totalSemantic = Object.values(results).reduce((a, b) => a + b, 0);
  return { tags: results, totalSemantic };
}

function checkAltText(content) {
  const imgTags = content.match(/<img[\s>]/gi) || [];
  const withAlt = content.match(/<img[^>]*\salt\s*=\s*["']/gi) || [];
  const ariaLabels = content.match(/aria-label\s*=\s*["'][^"']*["']/gi) || [];
  return {
    totalImages: imgTags.length,
    withAltText: withAlt.length,
    missingAlt: Math.max(0, imgTags.length - withAlt.length),
    ariaLabels: ariaLabels.length,
  };
}

function checkHeadingOrder(content) {
  const h1s = (content.match(/<h1[\s>]/gi) || []).length;
  const h2s = (content.match(/<h2[\s>]/gi) || []).length;
  const h3s = (content.match(/<h3[\s>]/gi) || []).length;
  const h4s = (content.match(/<h4[\s>]/gi) || []).length;
  const h5s = (content.match(/<h5[\s>]/gi) || []).length;
  const h6s = (content.match(/<h6[\s>]/gi) || []).length;

  return { h1: h1s, h2: h2s, h3: h3s, h4: h4s, h5: h5s, h6: h6s };
}

function checkContrastRatio(content) {
  const colorDeclarations = content.match(/color\s*:\s*#[0-9a-fA-F]{3,8}/gi) || [];
  const bgDeclarations = content.match(/background(?:-color)?\s*:\s*#[0-9a-fA-F]{3,8}/gi) || [];
  return {
    colorDeclarations: colorDeclarations.length,
    bgDeclarations: bgDeclarations.length,
  };
}

function checkKeyboardSupport(content) {
  const tabindex = (content.match(/tabindex\s*=/gi) || []).length;
  const role = (content.match(/role\s*=\s*["'][^"']*["']/gi) || []).length;
  const ariaControls = (content.match(/aria-controls\s*=/gi) || []).length;
  const onClick = (content.match(/onclick\s*=/gi) || []).length;
  const handlers = (content.match(/on(?:key|mouse|click|change|focus|blur)\s*=/gi) || []).length;

  return {
    tabindex,
    roleAttributes: role,
    ariaControls,
    onClickHandlers: onClick,
    totalEventHandlers: handlers,
  };
}

function checkPerfIndicators(content) {
  const largeAssets = (content.match(/\.(png|jpg|jpeg|gif|webp)(["'?])/gi) || []).length;
  const webpCount = (content.match(/\.webp(["'?])/gi) || []).length;
  const lazyLoading = (content.match(/loading\s*=\s*["']lazy["']/gi) || []).length;
  const externalCss = (content.match(/<link[^>]*\.css/g) || []).length;
  const externalJs = (content.match(/<script[^>]*src/g) || []).length;
  const inlineJs = (content.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || []).length;
  const fontPreloads = (content.match(/rel\s*=\s*["']preload["']/gi) || []).length;
  const asyncDefer = (content.match(/async|defer/gi) || []).length;

  return {
    imageCount: largeAssets,
    webpImages: webpCount,
    lazyLoaded: lazyLoading,
    externalCssFiles: externalCss,
    externalJsFiles: externalJs,
    inlineScripts: inlineJs,
    fontPreloads,
    asyncDeferAttributes: asyncDefer,
  };
}

function checkViewportMeta(content) {
  const viewport = content.match(/<meta[^>]*name\s*=\s*["']viewport["']/i);
  const description = content.match(/<meta[^>]*name\s*=\s*["']description["']/i);
  return {
    hasViewport: !!viewport,
    hasDescription: !!description,
  };
}

async function collectHtmlContent(target, filePath) {
  if (filePath) {
    await access(filePath);
    return readFile(filePath, 'utf-8');
  }

  const root = process.env.SIRINX_PROJECT_ROOT || '/Users/sirinx/sirinx-os';
  const targetPath = join(root, 'apps', target);
  let content = '';
  const { readdir } = await import('node:fs/promises');

  try {
    await access(targetPath);
    const files = await readdir(targetPath, { recursive: true });
    const htmlFiles = files.filter(f =>
      f.endsWith('.html') || f.endsWith('.tsx') || f.endsWith('.jsx')
    );
    for (const f of htmlFiles.slice(0, 10)) {
      content += await readFile(join(targetPath, f), 'utf-8') + '\n';
    }
  } catch {}

  return content || '<!-- no source found -->';
}

export async function auditComponent({ target, content, filePath }) {
  const htmlContent = content || await collectHtmlContent(target, filePath);

  const semantic = checkSemanticHtml(htmlContent);
  const altText = checkAltText(htmlContent);
  const headings = checkHeadingOrder(htmlContent);
  const contrast = checkContrastRatio(htmlContent);
  const keyboard = checkKeyboardSupport(htmlContent);
  const perf = checkPerfIndicators(htmlContent);
  const meta = checkViewportMeta(htmlContent);

  let a11yScore = 10;
  let perfScore = 10;
  const a11yIssues = [];
  const perfIssues = [];

  if (!meta.hasViewport) { a11yScore -= 2; a11yIssues.push('Missing viewport meta tag'); }
  if (!meta.hasDescription) { a11yScore -= 1; a11yIssues.push('Missing meta description'); }
  if (semantic.totalSemantic < 3) { a11yScore -= 2; a11yIssues.push('Low semantic HTML usage'); }
  if (altText.missingAlt > 0) { a11yScore -= 2; a11yIssues.push(`${altText.missingAlt} images missing alt text`); }
  if (headings.h1 === 0) { a11yScore -= 1; a11yIssues.push('No H1 heading'); }
  if (headings.h1 > 1) { a11yScore -= 1; a11yIssues.push(`${headings.h1} H1 headings (should be 1)`); }
  if (keyboard.onClickHandlers > 0 && keyboard.tabindex === 0) {
    a11yScore -= 1;
    a11yIssues.push('onClick handlers without keyboard support');
  }

  if (perf.imageCount > 0 && perf.webpImages / perf.imageCount < 0.5) {
    perfScore -= 2;
    perfIssues.push(`Only ${perf.webpImages}/${perf.imageCount} images use WebP`);
  }
  if (perf.lazyLoaded === 0 && perf.imageCount > 3) {
    perfScore -= 1;
    perfIssues.push('No lazy loading on images');
  }
  if (perf.externalCssFiles > 3) { perfScore -= 1; perfIssues.push(`Reduce CSS files: ${perf.externalCssFiles}`); }
  if (perf.externalJsFiles > 10) { perfScore -= 2; perfIssues.push(`Reduce JS files: ${perf.externalJsFiles} (consider bundling)`); }
  if (perf.fontPreloads === 0 && perf.externalCssFiles > 0) { perfScore -= 1; perfIssues.push('Add font preload hints'); }
  if (perf.asyncDeferAttributes < perf.externalJsFiles) {
    perfScore -= 1;
    perfIssues.push(`${perf.externalJsFiles - perf.asyncDeferAttributes} scripts missing async/defer`);
  }

  a11yScore = Math.max(0, Math.round(a11yScore));
  perfScore = Math.max(0, Math.round(perfScore));
  const totalScore = Math.round((a11yScore * 0.6) + (perfScore * 0.4));
  const passed = a11yScore >= 6 && perfScore >= 6;

  return {
    mode: 'audit',
    target: target || filePath,
    score: totalScore,
    a11yScore,
    perfScore,
    passed,
    grade: totalScore >= 9 ? 'A' : totalScore >= 7 ? 'B' : totalScore >= 5 ? 'C' : 'D',
    metrics: {
      semanticHtml: semantic.totalSemantic,
      semanticTags: semantic.tags,
      imagesWithAlt: altText.withAltText,
      imagesMissingAlt: altText.missingAlt,
      totalImages: altText.totalImages,
      ariaLabels: altText.ariaLabels,
      headingStructure: headings,
      roleAttributes: keyboard.roleAttributes,
      tabindexUsage: keyboard.tabindex,
      lazyLoaded: perf.lazyLoaded,
      webpUsage: perf.webpImages,
      totalImagesPerf: perf.imageCount,
      asyncDefer: perf.asyncDeferAttributes,
      viewport: meta.hasViewport,
      description: meta.hasDescription,
    },
    a11yIssues,
    perfIssues,
    recommendations: [
      ...a11yIssues,
      ...perfIssues,
      ...(!meta.hasViewport ? ['เพิ่ม <meta name="viewport">'] : []),
      ...(altText.missingAlt > 0 ? [`เพิ่ม alt text ให้ ${altText.missingAlt} รูปภาพ`] : []),
      ...(headings.h1 === 0 ? ['เพิ่ม H1 heading หลัก'] : []),
      ...(headings.h1 > 1 ? ['ใช้ H1 เพียง 1 ครั้งต่อหน้า'] : []),
      ...(perf.webpImages < perf.imageCount ? ['แปลงภาพเป็น WebP เพื่อลดขนาด'] : []),
      ...(perf.lazyLoaded === 0 && perf.imageCount > 3 ? ['เพิ่ม loading="lazy" ให้ images'] : []),
      ...(perf.asyncDeferAttributes < perf.externalJsFiles ? ['เพิ่ม async/defer ให้ external scripts'] : []),
    ],
    designPrinciples: ['Accessibility First', 'Performance by Default', 'Inclusive Design'],
  };
}
