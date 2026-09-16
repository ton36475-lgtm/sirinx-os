import { runGridGuist, runFullAudit } from '../../../skills/grid-guist/run.js';

function formatResult(result) {
  if (result.status === 'error') {
    return `GridGuist Error: ${result.message}`;
  }

  if (result.mode === 'full-audit') {
    return [
      `GridGuist Full Audit — ${result.target}`,
      `Overall: ${result.overallScore}/10 (${result.overallGrade})`,
      '',
      ...result.summary,
      '',
      'Details: /gridguist --mode redesign --target <component>',
    ].join('\n');
  }

  const lines = [
    `GridGuist ${result.label} — ${result.target}`,
    `Score: ${result.score}/10 (${result.grade})`,
    `Status: ${result.passed ? 'PASS' : 'NEEDS WORK'}`,
  ];

  if (result.metrics) {
    lines.push('');
    lines.push('Metrics:');
    for (const [key, val] of Object.entries(result.metrics)) {
      if (typeof val === 'number' || typeof val === 'string') {
        lines.push(`  ${key}: ${val}`);
      }
    }
  }

  if (result.recommendations && result.recommendations.length > 0) {
    lines.push('');
    lines.push('Recommendations:');
    result.recommendations.slice(0, 5).forEach(r => lines.push(`  → ${r}`));
  }

  return lines.join('\n');
}

export function getGridGuistTelegramHandler() {
  return {
    id: 'gridguist',
    textCommands: ['/gridguist', '/ui'],
    description: 'GridGuist Design Agent — UI/Design review with Swiss Design principles',
    handler: 'gridguist_redesign',
    owner: 'Hermes',
    actionClass: 'dry_run_preview',
    requiresExactGate: false,
  };
}

export async function handleGridGuistTelegramCommand(input = {}) {
  const mode = input.mode || 'redesign';
  const target = input.target || 'dashboard';
  const full = input.full === true;

  const result = full
    ? await runFullAudit({ target })
    : await runGridGuist({ mode, target });

  return {
    status: 'gridguist-ready',
    command: `/gridguist --mode ${mode} --target ${target}`,
    result,
    formatted: formatResult(result),
    telegramSendAllowed: false,
    requiresHumanApproval: false,
  };
}

export function integrateGridGuistWithWebsiteWork() {
  return {
    websiteTasks: ['redesign', 'review', 'audit'],
    designPrinciples: ['Swiss Design', 'Editorial Grid', 'Technical Minimalism'],
    autoInvoke: false,
  };
}
