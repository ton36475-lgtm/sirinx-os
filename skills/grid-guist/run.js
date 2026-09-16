#!/usr/bin/env node
import { analyzeComponent } from './analyzer.js';
import { reviewComponent } from './reviewer.js';
import { auditComponent } from './auditor.js';

const MODES = {
  redesign: { fn: analyzeComponent, label: 'Swiss Design Analysis' },
  review: { fn: reviewComponent, label: 'Minimalism Code Review' },
  audit: { fn: auditComponent, label: 'Perf + A11y Audit' },
};

export async function runGridGuist({ mode, target, content, filePath } = {}) {
  const resolvedMode = mode || 'redesign';
  const config = MODES[resolvedMode];

  if (!config) {
    return {
      status: 'error',
      message: `Unknown mode: ${resolvedMode}. Use: redesign, review, audit`,
    };
  }

  try {
    const result = await config.fn({ target: target || 'dashboard', content, filePath });
    return {
      status: 'complete',
      engine: 'gridguist-v1',
      mode: resolvedMode,
      label: config.label,
      ...result,
    };
  } catch (err) {
    return {
      status: 'error',
      mode: resolvedMode,
      message: err.message,
    };
  }
}

export async function runFullAudit({ target, content, filePath } = {}) {
  const [design, codeReview, perf] = await Promise.all([
    analyzeComponent({ target, content, filePath }),
    reviewComponent({ target, content, filePath }),
    auditComponent({ target, content, filePath }),
  ]);

  const avgScore = Math.round(
    (design.score + codeReview.score + perf.score) / 3
  );

  return {
    status: 'complete',
    engine: 'gridguist-v1',
    mode: 'full-audit',
    target: target || 'dashboard',
    overallScore: avgScore,
    overallGrade: avgScore >= 9 ? 'A' : avgScore >= 7 ? 'B' : avgScore >= 5 ? 'C' : 'D',
    modules: {
      design,
      codeReview,
      perfAudit: perf,
    },
    summary: [
      `Swiss Design: ${design.score}/10 (${design.grade}) — ${design.passed ? 'PASS' : 'NEEDS WORK'}`,
      `Minimalism: ${codeReview.score}/10 (${codeReview.grade}) — ${codeReview.passed ? 'PASS' : 'NEEDS WORK'}`,
      `Perf + A11y: ${perf.score}/10 (${perf.grade}) — ${perf.passed ? 'PASS' : 'NEEDS WORK'}`,
    ],
  };
}

async function main() {
  const args = process.argv.slice(2);
  const opts = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--mode') opts.mode = args[i + 1];
    if (args[i] === '--target') opts.target = args[i + 1];
    if (args[i] === '--file') opts.filePath = args[i + 1];
    if (args[i] === '--full') opts.full = true;
  }

  const result = opts.full
    ? await runFullAudit(opts)
    : await runGridGuist(opts);

  console.log(JSON.stringify(result, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
