/**
 * GHOSTCLAW_LOOP_ENGINEERING - UI Component Stubs
 * Dashboard Components for GhostClaw Blueprint
 */

// AgentCard.tsx - Shows agent status in grid
export interface AgentCardProps {
  agentId: string;
  name: string;
  role: 'planner' | 'frontend' | 'backend' | 'browser' | 'devops' | 'reviewer';
  status: 'active' | 'idle' | 'error' | 'completed';
  progress?: number;
  currentTask?: string;
}

// ApprovalQueuePanel.tsx - Queue management UI
export interface ApprovalQueueItem {
  id: string;
  agentId: string;
  proposedReply: string;
  riskScore: number;
  status: 'pending' | 'approved' | 'rejected' | 'blocked';
  createdAt: string;
}

// MultiAgentMonitor.tsx - Live monitor for all agents
export interface AgentMonitorProps {
  agents: Array<{
    id: string;
    name: string;
    role: string;
    status: string;
    lastHeartbeat: string;
  }>;
}

// APIStatusPanel.tsx - API wiring display
export interface APIStatusProps {
  endpoints: Array<{
    path: string;
    method: string;
    status: number;
    latencyMs: number;
  }>;
}