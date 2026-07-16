// integrations/omniroute-connector/index.mjs
// OmniRoute — Free AI Gateway (250+ providers, 90+ free tiers)
// https://github.com/diegosouzapw/OmniRoute
// MIT License · npm: omniroute v3.8.48

import { spawn } from 'node:child_process';

export function getOmniRouteStatus() {
  return {
    name: 'omniroute',
    description: 'Free AI Gateway — 250+ providers, 90+ free, RTK+Caveman compression',
    version: '3.8.48',
    license: 'MIT',
    homepage: 'https://omniroute.online',
    github: 'https://github.com/diegosouzapw/OmniRoute',
    stars: 17698,
    installMethod: 'npm install -g omniroute',
    binary: 'omniroute',
    capabilities: {
      providers: '250+',
      freeProviders: '90+',
      compression: 'RTK + Caveman (15-95% token savings)',
      autoFallback: true,
      multimodal: true,
      mcp: true,
      a2a: true,
      desktop: true,
      pwa: true
    },
    compatibleAgents: [
      'Claude Code', 'Codex', 'Cursor', 'Cline', 'Copilot', 'Antigravity'
    ],
    gates: {
      localFirst: true,
      privateMode: true,
      dryRunDefault: true,
      externalCallGate: true  // needs approval before provider call
    },
    integrationPlan: {
      step1: 'npx omniroute --version (verify install)',
      step2: 'npx omniroute start (local proxy :8787)',
      step3: 'Point GhostClaw agents to OmniRoute endpoint',
      step4: 'Configure free-tier providers first',
      step5: 'Enable RTK+Caveman compression'
    },
    runCommand: 'npx omniroute'
  };
}

export function getOmniRouteIntegrationConfig() {
  return {
    endpoint: 'http://127.0.0.1:8787',  // default OmniRoute local
    providerStrategy: 'auto-fallback-free-first',
    compression: {
      rtk: true,
      caveman: true,
      estimatedSavings: '15-95%'
    },
    agentRouting: {
      codex: { provider: 'free-tier', model: 'auto' },
      claude: { provider: 'free-tier', model: 'auto' },
      cursor: { provider: 'free-tier', model: 'auto' },
      hermes: { provider: 'free-tier', model: 'auto' }
    },
    safetyGates: {
      noSecretInLog: true,
      localProxyOnly: true,
      failClosed: true,
      humanApprovalForPaidTier: true
    }
  };
}

export async function runOmniRouteCommand(args = []) {
  return {
    command: `omniroute ${args.join(' ')}`,
    status: 'pending-install',
    note: 'Run after npm install -g omniroute completes'
  };
}
