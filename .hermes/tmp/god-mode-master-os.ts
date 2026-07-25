export type GodModeLayerStatus = "unknown" | "blocked" | "planned" | "active";
export type GodModeTaskStatus = "blocked" | "r0-gate" | "todo";
export type GodModePriority = "P0" | "P1" | "P2" | "P3" | "P4";
export type GodModeLayerId = "L0" | "L1" | "L2" | "L3" | "L4" | "L5";

export type GodModeLayer = {
  id: GodModeLayerId;
  name: string;
  color: string;
  status: GodModeLayerStatus;
  icon: string;
  components: Array<{
    name: string;
    detail: string;
  }>;
};

export type GodModeTask = {
  id: string;
  p: GodModePriority;
  title: string;
  cmd: string;
  status: GodModeTaskStatus;
  agent: string;
  layer: GodModeLayerId;
};

export type GodModeQueueSummary = {
  total: number;
  blocked: number;
  r0Gated: number;
};

export const GOD_MODE_LAYERS: GodModeLayer[] = [
  {
    id: "L0",
    name: "Hardware Foundation",
    color: "#7c3aed",
    status: "unknown",
    icon: "HW",
    components: [
      {
        name: "sirinx-control - Mac Mini M2",
        detail:
          "LiteLLM :4000 - Qwen3-35B :8080 - MySQL :3310 - Redis - n8n :5678 - Ollama :11434",
      },
      {
        name: "sirinx-worker-gpu - Windows PC",
        detail: "GPU inference worker - deepseek / heavy batch jobs",
      },
    ],
  },
  {
    id: "L1",
    name: "GhostClaws Core",
    color: "#ec4899",
    status: "blocked",
    icon: "GC",
    components: [
      {
        name: "LANE_HERMES_COMMANDER_A2A2A",
        detail: "89-file multi-agent orchestration scaffold",
      },
      {
        name: "A2A2A Active Worker Bridge",
        detail: "Node.js ESM dispatcher/worker - R0 gate: git push v0.1.0 pending",
      },
      {
        name: "Night Watch",
        detail: "BLOCKED - ERR_PNPM_ABORTED_REMOVE_MODULES_DIR - stale: 2026-06-27 03:49",
      },
      {
        name: "Security Hardening",
        detail: "Agent Lethal Trifecta audit - network egress allowlist - command broker policies",
      },
    ],
  },
  {
    id: "L2",
    name: "LatentMAS Transport",
    color: "#f59e0b",
    status: "planned",
    icon: "KV",
    components: [
      {
        name: "KV Latent Memory Bus",
        detail: "Replace text hop with hidden_states + past_key_values - target token reduction and speedup require benchmark proof",
      },
      {
        name: "Alignment Matrix Wa",
        detail: "Ridge-regression pseudo-inverse - Wa = (1/beta) * inv(Wout.T @ Wout + lambdaI) @ Wout.T @ Win",
      },
      {
        name: "Sequential Pipeline",
        detail: "Planner -> Critic -> Refiner -> Solver - decode text only at final agent",
      },
      {
        name: "Latent Steps",
        detail: "m = 0 / 10 / 20 / 40 / 80 - benchmark before claiming plateau behavior",
      },
      {
        name: "Backbone",
        detail: "Qwen3 local endpoint + Llama3 candidate path - verify model compatibility before transport work",
      },
    ],
  },
  {
    id: "L3",
    name: "Oracle Memory + Identity",
    color: "#10b981",
    status: "planned",
    icon: "MEM",
    components: [
      {
        name: "Psi Vault - MySQL :3310",
        detail: "Soft delete only - Nothing is Deleted principle - inbox / memory / retrospectives / trace / handoff",
      },
      {
        name: "Semantic Search",
        detail: "SQLite FTS5 + LanceDB hybrid - indexed target requires local proof - audit log on every AI search",
      },
      {
        name: "MCP Tools (23)",
        detail: "oracle_search - oracle_reflect - oracle_learn - oracle_handoff - oracle_inbox - oracle_trace - oracle_thread - oracle_schedule",
      },
      {
        name: "Identity Routing",
        detail: "21-agent SIRINX map - named agents are routing primitives, not anonymous worker IDs",
      },
      {
        name: "5 Principles + Rule 6",
        detail: "Nothing is Deleted - Patterns > Intentions - External Brain - Curiosity Creates - Form & Formless - Transparency",
      },
    ],
  },
  {
    id: "L4",
    name: "KOB CLI Skills Layer",
    color: "#3b82f6",
    status: "active",
    icon: "KOB",
    components: [
      {
        name: "5-Phase Rollout",
        detail: "P1 kobdemy -> P2 -> P3 -> P4 -> P5 GhostClaws",
      },
      {
        name: "13 Custom Skill Gaps",
        detail: "From SIRINX_AGM_KOB_SKILLS_MASTERPLAN.md - mapped to 3-phase AGM timeline",
      },
      {
        name: "Cross-agent Portability",
        detail: "Claude Code - Codex - Cursor - OpenCode - Gemini CLI - agent-agnostic workflow",
      },
      {
        name: "UiPath AgentHack Track 2",
        detail: "Open item - needs timeline",
      },
    ],
  },
  {
    id: "L5",
    name: "SIRINX Business Intelligence",
    color: "#f97316",
    status: "active",
    icon: "BI",
    components: [
      {
        name: "Solar Tariffs (hardcoded)",
        detail: "Peak 4.18 / Off-peak 2.65 / VSPP 2.20 THB/kWh - Phitsanulok 65000 - 600/99 Midtrapab Rd.",
      },
      {
        name: "150% Tax Shield Product Suite",
        detail: "Smart Solar - Solar Carport - EV Charging - BESS - AI Agentforce - Robotics",
      },
      {
        name: "Zero CapEx / PPA",
        detail: "Targets: industrial factories - hotels - hospitals - commercial buildings",
      },
      {
        name: "AGM Galaxy",
        detail: "Alpha Gene Record Media - YouTube: @alphagenerecordmedia - parallel creative venture",
      },
    ],
  },
];

export const GOD_MODE_QUEUE: GodModeTask[] = [
  {
    id: "P0-1",
    p: "P0",
    title: "Fix Night Watch pnpm",
    cmd: "Manual remediation draft only: rm -rf node_modules && pnpm install --frozen-lockfile && pnpm night-watch",
    status: "blocked",
    agent: "Claude Code",
    layer: "L1",
  },
  {
    id: "P0-2",
    p: "P0",
    title: "Hermes Stack Health Check",
    cmd: "curl :4000/health && curl :5678/healthz && curl :8080/v1/models && redis-cli ping",
    status: "blocked",
    agent: "Claude Code",
    layer: "L0",
  },
  {
    id: "P1-1",
    p: "P1",
    title: "Test Qwen3 hidden_states access",
    cmd: "python3 -c \"from transformers import AutoModelForCausalLM; m=AutoModelForCausalLM.from_pretrained('Qwen/Qwen3-4B-Instruct'); print(m.config)\"",
    status: "todo",
    agent: "Claude Code",
    layer: "L2",
  },
  {
    id: "P1-2",
    p: "P1",
    title: "Psi Vault schema - MySQL :3310",
    cmd: "CREATE TABLE oracle_memory (id BIGINT AUTO_INCREMENT, agent_name VARCHAR(64), session_id VARCHAR(128), content TEXT, embedding BLOB, is_deleted BOOL DEFAULT 0 ...)",
    status: "todo",
    agent: "Claude Code",
    layer: "L3",
  },
  {
    id: "P1-3",
    p: "P1",
    title: "Unblock A2A2A Worker Bridge R0",
    cmd: "git push Agent Bridge v0.1.0 - HUMAN APPROVAL REQUIRED",
    status: "r0-gate",
    agent: "Pitoon",
    layer: "L1",
  },
  {
    id: "P2-1",
    p: "P2",
    title: "LatentMAS: Wa alignment matrix",
    cmd: "python3 latent_backend/alignment.py --model Qwen/Qwen3-4B --cache-wa True",
    status: "todo",
    agent: "Claude Code",
    layer: "L2",
  },
  {
    id: "P2-2",
    p: "P2",
    title: "Wire Oracle MCP to GhostClaws n8n",
    cmd: "n8n webhook /oracle/search -> MCP adapter -> oracle_search tool",
    status: "todo",
    agent: "Claude Code",
    layer: "L3",
  },
  {
    id: "P2-3",
    p: "P2",
    title: "KOB CLI P1 kobdemy launch",
    cmd: "kob init kobdemy && kob skill add recap rrr trace learn forward",
    status: "todo",
    agent: "Claude Code",
    layer: "L4",
  },
  {
    id: "P3-1",
    p: "P3",
    title: "LatentMAS sequential prototype",
    cmd: "cargo run -p katgpt-orchestrator -- bench --model Qwen/Qwen3-4B --mode latentmas --latent-steps 40 --agents planner,critic,refiner,solver",
    status: "todo",
    agent: "Claude Code",
    layer: "L2",
  },
  {
    id: "P3-2",
    p: "P3",
    title: "Rust orchestrator scaffold",
    cmd: "cargo new katgpt-latentmas && mkdir -p crates/katgpt-orchestrator/src crates/latent-protocol/src python/latent_backend",
    status: "todo",
    agent: "Claude Code",
    layer: "L2",
  },
  {
    id: "P3-3",
    p: "P3",
    title: "GhostClaws Mission Control deploy",
    cmd: "R0 gate - production deploy requires Pitoon approval",
    status: "r0-gate",
    agent: "Pitoon",
    layer: "L1",
  },
  {
    id: "P4-1",
    p: "P4",
    title: "21-agent identity routing wire-up",
    cmd: "Full SIRINX agent map -> LiteLLM routing -> model score table",
    status: "todo",
    agent: "Multi-agent",
    layer: "L3",
  },
  {
    id: "P4-2",
    p: "P4",
    title: "Federation: M2 + GPU worker",
    cmd: "maw federation HMAC-SHA256 - config sirinx-control peer sirinx-worker-gpu",
    status: "todo",
    agent: "Multi-agent",
    layer: "L0",
  },
  {
    id: "P4-3",
    p: "P4",
    title: "AGM Galaxy creative agent pipeline",
    cmd: "AGM agent + YouTube workflow + @alphagenerecordmedia automation",
    status: "todo",
    agent: "Claude Code",
    layer: "L5",
  },
];

export const GOD_MODE_R0_GATES = [
  "git push - Agent Bridge v0.1.0",
  "GitHub Release publish",
  "GhostClaws Mission Control production deploy",
  "Hermes Kanban first real run",
  "osmGemma LaunchAgent load",
] as const;

export const GOD_MODE_SECURITY_FLAGS = [
  { label: "Robin HOLD", detail: "dark-web OSINT prohibited" },
  { label: "MiniMax API BLOCKED", detail: "China National Intelligence Law 2017" },
  { label: "APPROVE_ injection defense", detail: "hashtag injection blocked in pipeline" },
  { label: "No auto-publish/deploy/push", detail: "all 5 R0 gates require human approval" },
] as const;

export const GOD_MODE_MODEL_ROUTING = [
  { score: "1-4", model: "deepseek-v4-flash", color: "#6366f1" },
  { score: "5-7", model: "qwen3.6-plus", color: "#3b82f6" },
  { score: "8-10", model: "Qwen3-Max / claude-sonnet", color: "#ec4899" },
  { score: "audit", model: "gemini-2.5-pro", color: "#10b981" },
] as const;

export const GOD_MODE_AGENTS = [
  {
    tier: "L1 - CEO",
    color: "#f59e0b",
    list: ["Pitoon Yingyosruangrong (Human Owner / SIRINX)"],
  },
  {
    tier: "L2 - Directors",
    color: "#ec4899",
    list: ["Strategy Director", "Operations Director", "Creative Director"],
  },
  {
    tier: "L3 - Departmental (15)",
    color: "#3b82f6",
    list: [
      "Hermes (comms/router)",
      "Solar BI Agent",
      "Tax Shield Agent",
      "EV/BESS Agent",
      "PPA/Zero CapEx Agent",
      "Hotel Sector Agent",
      "Hospital Sector Agent",
      "Factory Sector Agent",
      "AGM Galaxy Agent",
      "Legal/Compliance Agent",
      "Finance/ROI Agent",
      "Marketing Agent",
      "R&D/AI Agent",
      "HR Agent",
      "Customer Success Agent",
    ],
  },
  {
    tier: "L4 - Cross-cutting (3)",
    color: "#10b981",
    list: ["Security Auditor", "Night Watch Monitor", "Memory / Psi Vault Keeper"],
  },
] as const;

export const GOD_MODE_INFRA_ENDPOINTS = [
  { name: "LiteLLM", port: ":4000" },
  { name: "Qwen3-35B", port: ":8080" },
  { name: "MySQL", port: ":3310" },
  { name: "n8n", port: ":5678" },
  { name: "Ollama", port: ":11434" },
  { name: "Redis", port: ":6379" },
] as const;

export const GOD_MODE_SOLAR_TARIFFS = [
  { label: "Peak", value: "4.18 THB/kWh", color: "#ef4444" },
  { label: "Off-peak", value: "2.65 THB/kWh", color: "#3b82f6" },
  { label: "VSPP", value: "2.20 THB/kWh", color: "#10b981" },
] as const;

export const GOD_MODE_PRIORITY_COLORS: Record<GodModePriority, string> = {
  P0: "#ef4444",
  P1: "#f97316",
  P2: "#f59e0b",
  P3: "#3b82f6",
  P4: "#7c3aed",
};

export const GOD_MODE_STATUS_COLORS: Record<GodModeLayerStatus | GodModeTaskStatus, string> = {
  active: "#10b981",
  blocked: "#ef4444",
  planned: "#3b82f6",
  "r0-gate": "#f59e0b",
  todo: "#475569",
  unknown: "#475569",
};

export function getGodModeLayer(id: GodModeLayerId): GodModeLayer | undefined {
  return GOD_MODE_LAYERS.find((layer) => layer.id === id);
}

export function getGodModeQueueSummary(queue: GodModeTask[] = GOD_MODE_QUEUE): GodModeQueueSummary {
  return {
    total: queue.length,
    blocked: queue.filter((task) => task.status === "blocked").length,
    r0Gated: queue.filter((task) => task.status === "r0-gate").length,
  };
}
