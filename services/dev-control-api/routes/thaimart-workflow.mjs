// services/dev-control-api/routes/thaimart-workflow.mjs
// ThaiMart K01-K15 Workflow Routes

export async function handleThaimartWorkflowRoutes(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  
  // GET /api/thaimart/workflow/status
  if (request.method === 'GET' && url.pathname === '/api/thaimart/workflow/status') {
    const { getKWorkflowEngineStatus } = await import('../src/thaimart-k-workflow-engine.mjs');
    return { status: 'workflow_engine_ready', ...getKWorkflowEngineStatus() };
  }
  
  // POST /api/thaimart/workflow/create
  if (request.method === 'POST' && url.pathname === '/api/thaimart/workflow/create') {
    const { createWorkflow } = await import('../src/thaimart-k-workflow-engine.mjs');
    let body = {};
    try { body = await readRequestBody(request); } catch {}
    return { status: 'workflow_created', workflow: createWorkflow(body) };
  }
  
  // POST /api/thaimart/workflow/advance
  if (request.method === 'POST' && url.pathname === '/api/thaimart/workflow/advance') {
    const { advanceWorkflow } = await import('../src/thaimart-k-workflow-engine.mjs');
    let body = {};
    try { body = await readRequestBody(request); } catch {}
    const result = advanceWorkflow(body.workflow || {}, body.event || 'advance');
    return { status: 'workflow_advanced', workflow: result };
  }
  
  return null;
}

async function readRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}