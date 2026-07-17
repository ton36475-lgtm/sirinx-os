// integrations/omniroute-connector/index.mjs
// OmniRoute — Free AI Gateway (250+ providers, 90+ free tiers)
// https://github.com/diegosouzapw/OmniRoute
// MIT License · npm: omniroute v3.8.48

import { existsSync, realpathSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const CMUX_SHIM_PART = 'cmux-cli-shims';

function containsCmuxShim(candidate) {
  return candidate.split(sep).includes(CMUX_SHIM_PART);
}

export function getOmniRouteCandidates({
  homeDir = homedir(),
  pathValue = process.env.PATH ?? '',
  repoBinary = resolve(MODULE_DIR, '../omniroute/bin/omniroute.mjs')
} = {}) {
  const pathCandidates = pathValue
    .split(delimiter)
    .filter(Boolean)
    .filter((directory) => !containsCmuxShim(directory))
    .map((directory) => join(directory, 'omniroute'));

  return [...new Set([
    join(homeDir, '.local', 'bin', 'omniroute'),
    ...pathCandidates,
    repoBinary
  ])];
}

export function resolveOmniRouteBinary({ candidates } = {}) {
  const inspectedCandidates = candidates ?? getOmniRouteCandidates();

  for (const candidate of inspectedCandidates) {
    if (!candidate || containsCmuxShim(candidate) || !existsSync(candidate)) {
      continue;
    }

    try {
      const resolvedCandidate = realpathSync(candidate);
      if (containsCmuxShim(resolvedCandidate) || !statSync(resolvedCandidate).isFile()) {
        continue;
      }
      return resolvedCandidate;
    } catch {
      // Broken links and unreadable paths are unavailable, not executable fallbacks.
    }
  }

  return null;
}

export function getOmniRouteStatus(options = {}) {
  const binaryPath = resolveOmniRouteBinary(options);

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
    installation: {
      installed: binaryPath !== null,
      state: binaryPath === null ? 'not-installed' : 'local-artifact-found',
      binaryPath
    },
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
      step1: 'Detect a local launcher or repo artifact without executing it',
      step2: 'Require an exact execution gate before starting local proxy :8787',
      step3: 'Point GhostClaw agents to OmniRoute endpoint',
      step4: 'Configure free-tier providers first',
      step5: 'Enable RTK+Caveman compression'
    },
    runCommand: null
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

export async function runOmniRouteCommand(args = [], options = {}) {
  const status = getOmniRouteStatus(options);
  const installed = status.installation.installed;

  return {
    commandPreview: ['omniroute', ...args],
    status: installed ? 'blocked-execution-gate' : 'not-installed',
    installed,
    binaryPath: status.installation.binaryPath,
    executionAllowed: false,
    note: installed
      ? 'Local artifact detected; execution remains blocked pending an exact approval gate'
      : 'No usable local OmniRoute artifact detected; install is not authorized by this status check'
  };
}
