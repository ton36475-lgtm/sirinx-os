/**
 * Lane Registry: maps agents to allowed filesystem scopes.
 * Enforces the A2A2A rule that cross-lane writes require Hermes routing.
 */

export interface Lane {
  id: string;
  owner: string;
  allowedPaths: string[];
  forbiddenPaths: string[];
}

export const LANES: Record<string, Lane> = {
  ghostclaw_core: {
    id: "ghostclaw_core",
    owner: "hermes-commander",
    allowedPaths: ["GHOSTCLAW/**"],
    forbiddenPaths: [".env", ".env.*", ".git/**"],
  },
  services: {
    id: "services",
    owner: "codex-captain",
    allowedPaths: ["services/**"],
    forbiddenPaths: [".env", ".env.*"],
  },
  packages: {
    id: "packages",
    owner: "codex-captain",
    allowedPaths: ["packages/**"],
    forbiddenPaths: [".env", ".env.*"],
  },
  apps: {
    id: "apps",
    owner: "codex-captain",
    allowedPaths: ["apps/**"],
    forbiddenPaths: [".env", ".env.*"],
  },
  tests: {
    id: "tests",
    owner: "kob-validator",
    allowedPaths: ["tests/**"],
    forbiddenPaths: [],
  },
  docs: {
    id: "docs",
    owner: "scribe",
    allowedPaths: ["docs/**", "GHOSTCLAW/**/*.md"],
    forbiddenPaths: ["**/*.env*"],
  },
};

export function matchGlob(path: string, pattern: string): boolean {
  const regex = new RegExp(
    "^" + pattern.replace(/\*\*/g, "<<DOUBLESTAR>>").replace(/\*/g, "[^/]*").replace(/<<DOUBLESTAR>>/g, ".*") + "$"
  );
  return regex.test(path);
}

export function laneForPath(path: string): Lane | null {
  for (const lane of Object.values(LANES)) {
    if (lane.allowedPaths.some((pattern) => matchGlob(path, pattern))) {
      return lane;
    }
  }
  return null;
}

export function isPathInLane(path: string, laneId: string): boolean {
  const lane = LANES[laneId];
  if (!lane) return false;
  if (lane.forbiddenPaths.some((pattern) => matchGlob(path, pattern))) return false;
  return lane.allowedPaths.some((pattern) => matchGlob(path, pattern));
}
