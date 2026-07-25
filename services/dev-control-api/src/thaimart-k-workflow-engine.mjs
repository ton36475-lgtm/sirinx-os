// services/dev-control-api/src/thaimart-k-workflow-engine.mjs
// GhostClaw OS - ThaiMart K01-K15 Workflow Engine
// State machine + human approval gates

const WORKFLOW_STATES = {
  INTAKE: 'intake',
  CONTEXT_LOCKED: 'context_locked',
  PLANNED: 'planned',
  DRAFTED: 'drafted',
  CHANNEL_ADAPTED: 'channel_adapted',
  QA1_REVIEW: 'qa1_review',
  QA2_REVIEW: 'qa2_review',
  WAITING_APPROVAL: 'waiting_approval',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  READY_TO_APPLY: 'ready_to_apply',
  APPLIED: 'applied',
  FAILED: 'failed',
  MONITORING: 'monitoring',
  REPORTED: 'reported',
  ARCHIVED: 'archived'
};

const APPROVAL_GATES = {
  LISTING_PUBLISH: { reviewers: ['admin', 'brand_owner'], required: true },
  PRICE_STOCK: { reviewers: ['admin', 'owner'], required: true },
  CHAT_SEND: { reviewers: ['admin', 'brand_owner'], required: true },
  ORDER_STATUS: { reviewers: ['warehouse_operator'], required: true }
};

export function getKWorkflowEngineStatus() {
  return {
    title: "ThaiMart K01-K15 Workflow Engine",
    version: "1.0",
    states: Object.keys(WORKFLOW_STATES),
    approvalGates: APPROVAL_GATES,
    connectorStatus: { thaimart: 'disabled_pending_contract' },
    activeProjects: 0,
    pendingApprovals: 0
  };
}

export function createWorkflow(project) {
  return {
    projectId: project.id,
    projectType: project.type,
    state: WORKFLOW_STATES.INTAKE,
    contextPack: null,
    deliverables: [],
    approvals: {},
    createdAt: new Date().toISOString()
  };
}

export function advanceWorkflow(workflow, event) {
  const transitions = {
    [WORKFLOW_STATES.INTAKE]: [WORKFLOW_STATES.CONTEXT_LOCKED],
    [WORKFLOW_STATES.CONTEXT_LOCKED]: [WORKFLOW_STATES.PLANNED],
    [WORKFLOW_STATES.PLANNED]: [WORKFLOW_STATES.DRAFTED],
    [WORKFLOW_STATES.DRAFTED]: [WORKFLOW_STATES.CHANNEL_ADAPTED],
    [WORKFLOW_STATES.CHANNEL_ADAPTED]: [WORKFLOW_STATES.QA1_REVIEW],
    [WORKFLOW_STATES.QA1_REVIEW]: [WORKFLOW_STATES.QA2_REVIEW, workflow.state], // fail -> stay
    [WORKFLOW_STATES.QA2_REVIEW]: [WORKFLOW_STATES.WAITING_APPROVAL],
    [WORKFLOW_STATES.WAITING_APPROVAL]: [WORKFLOW_STATES.REJECTED, WORKFLOW_STATES.READY_TO_APPLY],
    [WORKFLOW_STATES.READY_TO_APPLY]: [WORKFLOW_STATES.APPLIED, WORKFLOW_STATES.FAILED],
    [WORKFLOW_STATES.APPLIED]: [WORKFLOW_STATES.MONITORING],
    [WORKFLOW_STATES.MONITORING]: [WORKFLOW_STATES.REPORTED],
    [WORKFLOW_STATES.REPORTED]: [WORKFLOW_STATES.ARCHIVED]
  };

  const nextStates = transitions[workflow.state] || [];
  if (event === 'approve' && workflow.state === WORKFLOW_STATES.WAITING_APPROVAL) {
    return { ...workflow, state: WORKFLOW_STATES.READY_TO_APPLY };
  }
  if (event === 'reject' && workflow.state === WORKFLOW_STATES.WAITING_APPROVAL) {
    return { ...workflow, state: WORKFLOW_STATES.REJECTED };
  }
  
  return workflow;
}