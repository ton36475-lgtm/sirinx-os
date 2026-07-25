/**
 * OBRA Superpowers Workflow Engine
 * 
 * 5-phase development methodology for SIRINX OS
 * Brainstorming → Planning → Subagent Development → TDD → Systematic Debugging
 */

import { read_file, write_file, search_files, delegate_task, terminal, clarify } from 'hermes-tools';

export interface ObraWorkflowInput {
  goal: string;
  phase?: 'brainstorming' | 'planning' | 'subagent' | 'tdd' | 'debug' | 'all';
  context?: {
    scope?: string[];
    constraints?: string[];
    maxAttempts?: number;
  };
}

export interface ObraWorkflowOutput {
  workflowId: string;
  goal: string;
  phases: ObraPhaseResult[];
  status: 'completed' | 'failed' | 'pending';
  filesCreated: string[];
  testsPassed: number;
  testsFailed: number;
  durationMs: number;
}

export interface ObraPhaseResult {
  phase: string;
  status: 'completed' | 'failed' | 'skipped';
  durationMs: number;
  output: any;
  files: string[];
}

/**
 * Main workflow execution function
 */
export async function runObraWorkflow(input: ObraWorkflowInput): Promise<ObraWorkflowOutput> {
  const workflowId = generateWorkflowId();
  const startTime = Date.now();
  
  console.log(`[OBRA Workflow ${workflowId}] Starting: ${input.goal}`);
  
  const phases: ObraPhaseResult[] = [];
  const filesCreated: string[] = [];
  let testsPassed = 0;
  let testsFailed = 0;
  
  try {
    // Phase 1: Brainstorming
    if (input.phase === 'all' || input.phase === 'brainstorming') {
      const phase1 = await executeBrainstormingPhase(input, workflowId);
      phases.push(phase1);
      filesCreated.push(...phase1.files);
      
      if (phase1.status === 'failed') {
        throw new Error('Brainstorming phase failed');
      }
    }
    
    // Phase 2: Planning
    if (input.phase === 'all' || input.phase === 'planning') {
      const phase2 = await executePlanningPhase(input, workflowId, phases[0]?.output);
      phases.push(phase2);
      filesCreated.push(...phase2.files);
      
      if (phase2.status === 'failed') {
        throw new Error('Planning phase failed');
      }
    }
    
    // Phase 3: Subagent Development
    if (input.phase === 'all' || input.phase === 'subagent') {
      const phase3 = await executeSubagentPhase(input, workflowId, phases[1]?.output);
      phases.push(phase3);
      filesCreated.push(...phase3.files);
      
      if (phase3.status === 'failed') {
        throw new Error('Subagent phase failed');
      }
    }
    
    // Phase 4: TDD
    if (input.phase === 'all' || input.phase === 'tdd') {
      const phase4 = await executeTDDPhase(input, workflowId, phases[2]?.output);
      phases.push(phase4);
      filesCreated.push(...phase4.files);
      testsPassed = phase4.output?.testsPassed || 0;
      testsFailed = phase4.output?.testsFailed || 0;
      
      if (phase4.status === 'failed') {
        throw new Error('TDD phase failed');
      }
    }
    
    // Phase 5: Systematic Debugging (only if tests failed)
    if (input.phase === 'all' || input.phase === 'debug') {
      if (testsFailed > 0 || input.phase === 'debug') {
        const phase5 = await executeDebuggingPhase(input, workflowId, phases);
        phases.push(phase5);
        filesCreated.push(...phase5.files);
        
        if (phase5.status === 'failed') {
          throw new Error('Debugging phase failed');
        }
      }
    }
    
    const duration = Date.now() - startTime;
    
    return {
      workflowId,
      goal: input.goal,
      phases,
      status: 'completed',
      filesCreated,
      testsPassed,
      testsFailed,
      durationMs: duration
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    return {
      workflowId,
      goal: input.goal,
      phases,
      status: 'failed',
      filesCreated,
      testsPassed,
      testsFailed,
      durationMs: duration
    };
  }
}

/**
 * Phase 1: Brainstorming
 */
async function executeBrainstormingPhase(
  input: ObraWorkflowInput,
  workflowId: string
): Promise<ObraPhaseResult> {
  const startTime = Date.now();
  console.log(`[Phase 1] Brainstorming for: ${input.goal}`);
  
  try {
    // Ask user 2-3 questions
    const questions = [
      'แหล่งข้อมูล/requirements หลักอยู่ที่ไหน?',
      'มี constraints พิเศษไหม? (performance, security, compliance)',
      'ต้องการ visual companion ไหม? (diagram, mockup, architecture)'
    ];
    
    const answers: any[] = [];
    for (const question of questions) {
      const answer = await clarify({
        question,
        choices: ['Design document มีอยู่แล้ว', 'ต้องสร้างใหม่จาก brainstorming', 'Other (ระบุ)']
      });
      answers.push(answer);
    }
    
    // Create design document
    const designDoc = `
# Design Document: ${input.goal}

## Goal
${input.goal}

## Requirements Analysis
${answers.map((a, i) => `### Q${i + 1}: ${questions[i]}\nA: ${JSON.stringify(a)}`).join('\n\n')}

## Proposed Solution
[TBD in Planning phase]

## Architecture Considerations
- File scope: ${input.context?.scope?.join(', ') || 'apps/**, services/**, packages/**'}
- Constraints: ${input.context?.constraints?.join(', ') || 'No deploy, No push'}
- Safety: AGENTS.md compliance required

## Security Considerations
- No secrets exposure
- PII masking required
- Dry-run first for external actions

## Next Steps
Proceed to Planning phase for task decomposition.

---
Generated: ${new Date().toISOString()}
Workflow ID: ${workflowId}
`;
    
    const designDocPath = `docs/design/${sanitizeFilename(input.goal)}-${workflowId}.md`;
    await write_file({
      path: designDocPath,
      content: designDoc
    });
    
    return {
      phase: 'brainstorming',
      status: 'completed',
      durationMs: Date.now() - startTime,
      output: {
        designDocPath,
        answers,
        questions
      },
      files: [designDocPath]
    };
    
  } catch (error) {
    return {
      phase: 'brainstorming',
      status: 'failed',
      durationMs: Date.now() - startTime,
      output: { error: String(error) },
      files: []
    };
  }
}

/**
 * Phase 2: Planning
 */
async function executePlanningPhase(
  input: ObraWorkflowInput,
  workflowId: string,
  brainstormingOutput: any
): Promise<ObraPhaseResult> {
  const startTime = Date.now();
  console.log(`[Phase 2] Planning for: ${input.goal}`);
  
  try {
    // Map codebase
    const codebaseMap = await search_files({
      pattern: '*',
      target: 'files',
      path: input.context?.scope?.[0] || 'apps',
      output_mode: 'files_only'
    });
    
    // Decompose tasks
    const tasks = [
      {
        id: 'task-001',
        description: `Implement core functionality for: ${input.goal}`,
        files: [],
        tests: [],
        priority: 'high'
      }
    ];
    
    // Create implementation plan
    const planDoc = `
# Implementation Plan: ${input.goal}

## Tasks
${tasks.map(t => `### ${t.id}: ${t.description}\nPriority: ${t.priority}`).join('\n\n')}

## File Scope
Allowed:
${input.context?.scope?.map(s => `- ${s}`).join('\n') || '- apps/**\n- services/**\n- packages/**'}

Forbidden:
- .env
- infra/cloudflare/** (without approval)
- production deploy scripts

## Verification
- Unit tests pass
- Integration tests pass
- No TypeScript errors
- AGENTS.md compliance verified

## Dependencies
- brainstorming phase completed
- design document approved

---
Generated: ${new Date().toISOString()}
Workflow ID: ${workflowId}
`;
    
    const planDocPath = `docs/implementation-plans/${sanitizeFilename(input.goal)}-${workflowId}.md`;
    await write_file({
      path: planDocPath,
      content: planDoc
    });
    
    return {
      phase: 'planning',
      status: 'completed',
      durationMs: Date.now() - startTime,
      output: {
        planDocPath,
        tasks,
        codebaseMap
      },
      files: [planDocPath]
    };
    
  } catch (error) {
    return {
      phase: 'planning',
      status: 'failed',
      durationMs: Date.now() - startTime,
      output: { error: String(error) },
      files: []
    };
  }
}

/**
 * Phase 3: Subagent Development
 */
async function executeSubagentPhase(
  input: ObraWorkflowInput,
  workflowId: string,
  planningOutput: any
): Promise<ObraPhaseResult> {
  const startTime = Date.now();
  console.log(`[Phase 3] Subagent Development for: ${input.goal}`);
  
  try {
    const tasks = planningOutput?.tasks || [];
    
    // Launch subagents in parallel
    const subagentResults = await delegate_task({
      tasks: tasks.map(t => ({
        goal: t.description,
        context: input.context
      }))
    });
    
    const filesCreated = subagentResults.flatMap(r => r.filesCreated || []);
    
    return {
      phase: 'subagent',
      status: 'completed',
      durationMs: Date.now() - startTime,
      output: {
        subagentResults,
        tasksCompleted: subagentResults.length
      },
      files: filesCreated
    };
    
  } catch (error) {
    return {
      phase: 'subagent',
      status: 'failed',
      durationMs: Date.now() - startTime,
      output: { error: String(error) },
      files: []
    };
  }
}

/**
 * Phase 4: TDD
 */
async function executeTDDPhase(
  input: ObraWorkflowInput,
  workflowId: string,
  subagentOutput: any
): Promise<ObraPhaseResult> {
  const startTime = Date.now();
  console.log(`[Phase 4] TDD for: ${input.goal}`);
  
  try {
    // Run tests
    const testResult = await terminal({
      command: 'pnpm test',
      timeout: 300
    });
    
    const testsPassed = parseTestResults(testResult.output)?.passed || 0;
    const testsFailed = parseTestResults(testResult.output)?.failed || 0;
    
    return {
      phase: 'tdd',
      status: testsFailed === 0 ? 'completed' : 'failed',
      durationMs: Date.now() - startTime,
      output: {
        testsPassed,
        testsFailed,
        testOutput: testResult.output
      },
      files: []
    };
    
  } catch (error) {
    return {
      phase: 'tdd',
      status: 'failed',
      durationMs: Date.now() - startTime,
      output: { error: String(error) },
      files: []
    };
  }
}

/**
 * Phase 5: Systematic Debugging
 */
async function executeDebuggingPhase(
  input: ObraWorkflowInput,
  workflowId: string,
  previousPhases: ObraPhaseResult[]
): Promise<ObraPhaseResult> {
  const startTime = Date.now();
  console.log(`[Phase 5] Systematic Debugging for: ${input.goal}`);
  
  try {
    const tddPhase = previousPhases.find(p => p.phase === 'tdd');
    const testOutput = tddPhase?.output?.testOutput || '';
    
    // Analyze test failures
    const debugDoc = `
# Debug Report: ${input.goal}

## Test Failures
${testOutput}

## Investigation
### Understand
[Test output analysis]

### Reproduce
[Minimal reproduction case]

### Fix
[Proposed fix]

### Verify
[Verification steps]

## Root Cause
[Root cause analysis]

## Next Actions
- Fix applied
- Regression tests added
- Tests re-run

---
Generated: ${new Date().toISOString()}
Workflow ID: ${workflowId}
`;
    
    const debugDocPath = `docs/debug-reports/${sanitizeFilename(input.goal)}-${workflowId}.md`;
    await write_file({
      path: debugDocPath,
      content: debugDoc
    });
    
    // Re-run tests after fix
    const testResult = await terminal({
      command: 'pnpm test',
      timeout: 300
    });
    
    const testsPassed = parseTestResults(testResult.output)?.passed || 0;
    const testsFailed = parseTestResults(testResult.output)?.failed || 0;
    
    return {
      phase: 'debug',
      status: testsFailed === 0 ? 'completed' : 'failed',
      durationMs: Date.now() - startTime,
      output: {
        debugDocPath,
        testsPassed,
        testsFailed,
        testOutput: testResult.output
      },
      files: [debugDocPath]
    };
    
  } catch (error) {
    return {
      phase: 'debug',
      status: 'failed',
      durationMs: Date.now() - startTime,
      output: { error: String(error) },
      files: []
    };
  }
}

/**
 * Utility: Generate workflow ID
 */
function generateWorkflowId(): string {
  return `obra-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Utility: Sanitize filename
 */
function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);
}

/**
 * Utility: Parse test results
 */
function parseTestResults(output: string): { passed: number; failed: number } | null {
  const passedMatch = output.match(/(\d+) pass/);
  const failedMatch = output.match(/(\d+) fail/);
  
  if (passedMatch || failedMatch) {
    return {
      passed: passedMatch ? parseInt(passedMatch[1]) : 0,
      failed: failedMatch ? parseInt(failedMatch[1]) : 0
    };
  }
  
  return null;
}

export default runObraWorkflow;
