/**
 * GhostClaw OS - Skills Stream Manager
 * Manages real-time agent communication streams
 */

// Agent roles in the system
export const AGENT_ROLES = {
  GHOSTCLAW: { name: 'ghostclaw', tier: 3, role: 'Security & Bypass' },
  NIRAN: { name: 'niran', tier: 1, role: 'Content & Narrative' },
  HERMES: { name: 'hermes', tier: 4, role: 'Governance & Audit (Master)' },
  SIRINX: { name: 'sirinx', tier: 3, role: 'Infrastructure' },
  DEEPSEEK: { name: 'deepseek', tier: 2, role: 'Analysis & Review' }
};

// Workflow definitions
export const WORKFLOWS = {
  CODE_REVIEW: {
    name: 'code-review',
    pipeline: ['deepseek', 'ghostclaw', 'hermes'],
    gates: [2, 3, 4],
    description: 'Review code changes through analysis → security → governance'
  },
  DEPLOY: {
    name: 'deploy',
    pipeline: ['deepseek', 'ghostclaw', 'sirinx', 'hermes'],
    gates: [2, 3, 4, 4],
    description: 'Deploy changes through full pipeline'
  },
  BYPASS: {
    name: 'bypass',
    pipeline: ['ghostclaw', 'sirinx'],
    gates: [1, 3],
    description: 'GhostClaw bypass through infrastructure'
  },
  CONTENT: {
    name: 'content',
    pipeline: ['niran', 'hermes'],
    gates: [1, 1],
    description: 'Content creation through narrative → governance'
  },
  SEARCH: {
    name: 'search',
    pipeline: ['hermes'],
    gates: [0],
    description: 'Simple search by Hermes'
  }
};

/**
 * Orchestrate a workflow
 */
export function orchestrateWorkflow(workflowName, context) {
  const workflow = WORKFLOWS[workflowName.toUpperCase()];
  if (!workflow) {
    return { error: `Unknown workflow: ${workflowName}` };
  }

  return {
    workflow: workflow.name,
    description: workflow.description,
    pipeline: workflow.pipeline.map((agent, i) => ({
      step: i + 1,
      agent,
      gate: workflow.gates[i],
      role: AGENT_ROLES[agent.toUpperCase()]?.role || 'unknown',
      status: 'pending'
    })),
    context,
    dry_run: true,
    created_at: new Date().toISOString()
  };
}

/**
 * Validate safety gate
 */
export function validateGate(action, gate) {
  const GATE_RULES = {
    0: { name: 'search', allowed: true, approval: false },
    1: { name: 'content', allowed: true, approval: false },
    2: { name: 'review', allowed: true, approval: false },
    3: { name: 'security', allowed: true, approval: false },
    4: { name: 'governance', allowed: false, approval: true }
  };

  const rule = GATE_RULES[gate];
  if (!rule) {
    return { allowed: false, reason: `Unknown gate level: ${gate}` };
  }

  return {
    action,
    gate,
    rule: rule.name,
    allowed: rule.allowed,
    needs_approval: rule.approval,
    dry_run: true
  };
}