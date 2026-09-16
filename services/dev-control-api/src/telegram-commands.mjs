/**
 * telegram-commands.mjs - GhostClaw OS Telegram Command Handlers
 * All handlers are DRY-RUN ONLY - no external sends
 */

const DEV_API_URL = process.env.DEV_CONTROL_API_URL || 'http://localhost:8711';
const SKILLS_API_URL = process.env.SKILLS_API_URL || 'http://localhost:3800';

// ===== Command Handlers =====

async function handleGhostClawStatus(chatId, args) {
  try {
    const [health, skillsStatus, gates] = await Promise.all([
      fetch(`${DEV_API_URL}/health`).then(r => r.json()),
      fetch(`${DEV_API_URL}/api/skills/status`).then(r => r.json()),
      fetch(`${DEV_API_URL}/api/gates`).then(r => r.json())
    ]);

    return {
      chatId,
      message: `
╔════════════════════════════════════╗
║  GhostClaw OS Status               ║
╠════════════════════════════════════╣
║  API Status:     ${health.status}       ║
║  Skills API:     ${skillsStatus.skillsApiOnline ? 'ONLINE' : 'OFFLINE'}       ║
║  Dry-Run Mode:   ${health.dryRunOnly ? 'ACTIVE' : 'INACTIVE'}     ║
╚════════════════════════════════════╝

Gate Levels Active: ${gates.gates?.length || 0}
Skills Loaded: ${skillsStatus.localSkillsCount || 0}
      `.trim(),
      dryRun: true
    };
  } catch (error) {
    return { chatId, message: `❌ Error checking status: ${error.message}`, dryRun: true };
  }
}

async function handleSkillsList(chatId, args) {
  try {
    const skills = await fetch(`${SKILLS_API_URL}/api/skills/list`).then(r => r.json());

    const categories = skills.skills?.map(s => s.name).join('\n') || 'none loaded';

    return {
      chatId,
      message: `
📦 Skills Kit (${skills.total_skills} total)

${categories}

Dry-run mode: ${skills.dry_run}
      `.trim(),
      dryRun: true
    };
  } catch (error) {
    return { chatId, message: `❌ Error listing skills: ${error.message}`, dryRun: true };
  }
}

async function handleSkillsRun(chatId, args) {
  const goal = args.join(' ') || 'no goal specified';

  return {
    chatId,
    message: `
🚀 Skills Orchestration (dry-run)

Goal: ${goal}

Status: Planned
Workflow: [plan → dry-run → approve]
Next required: human approval

Type 'approve skills run' to execute.
    `.trim(),
    dryRun: true
  };
}

async function handleDeployPreview(chatId, args) {
  try {
    const readiness = await fetch(`${DEV_API_URL}/api/cloudflare-deployment-readiness`).then(r => r.json());

    return {
      chatId,
      message: `
🌐 Cloudflare Deploy Preview (dry-run)

Ready: ${readiness.ready ? '✅' : '❌'}
Blocks: ${readiness.blocks?.length || 0}
Required Actions:
${readiness.next_steps?.map(s => `  • ${s}`).join('\n') || 'none'}

Note: staging deploy requires approval
      `.trim(),
      dryRun: true
    };
  } catch (error) {
    return { chatId, message: `❌ Error checking deploy status: ${error.message}`, dryRun: true };
  }
}

// ===== Router =====

const COMMAND_HANDLERS = {
  '/ghostclaw': handleGhostClawStatus,
  '/skills': handleSkillsList,
  '/skills run': handleSkillsRun,
  '/deploy': handleDeployPreview,
  '/deploy preview': handleDeployPreview,
  '/health': async (chatId) => ({ chatId, message: '🏥 Health check ready - use /ghostclaw for detailed status', dryRun: true })
};

export function registerTelegramCommands(router) {
  for (const [cmd, handler] of Object.entries(COMMAND_HANDLERS)) {
    router.register(cmd, async (chatId, ...args) => {
      const result = await handler(chatId, args);
      // In real implementation: send to Telegram
      // For now: log dry-run
      console.log('[DRY-RUN] Would send to chat', chatId, ':', result.message);
      return result;
    });
  }
}

export { handleGhostClawStatus, handleSkillsList, handleSkillsRun, handleDeployPreview };