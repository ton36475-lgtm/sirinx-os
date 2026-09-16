export interface GhostClawRegistryPaths {
  agents: string;
  routes: string;
}

export interface GhostClawAgent {
  id: string;
  name: string;
  lane: string;
  mutatesFiles: boolean;
  requiresLease: boolean;
  requiresReceipt: boolean;
  defaultModelHint: string;
}

export interface GhostClawRoute {
  routeId: string;
  taskType: string;
  primaryAgent: string;
  reviewerAgent: string;
  architectAgent: string;
  validatorAgent: string;
  tier: string;
}

export interface GhostClawGuardrails {
  dryRun: boolean;
  sourceMutation: boolean;
  workerExecution: boolean;
  providerCall: boolean;
  liveSend: boolean;
  install: boolean;
  push: boolean;
  deploy: boolean;
  cloudMutation: boolean;
  secretRead: boolean;
  keyValuePrint: boolean;
}

export interface GhostClawControlPlane {
  title: string;
  status: string;
  mode: string;
  registryPaths: GhostClawRegistryPaths;
  agents: GhostClawAgent[];
  routes: GhostClawRoute[];
  summary: {
    agents: number;
    routes: number;
    mutatingAgents: string[];
    routesWithReviewers: number;
  };
  guardrails: GhostClawGuardrails;
  updatedAt: string;
}

export interface GhostClawActionClassification {
  actionTier: string;
  blocked: boolean;
  blockedReasons: string[];
  requiresExactGate: boolean;
}

export interface GhostClawFileLease {
  leaseId: string;
  taskId: string;
  status: "granted" | "denied";
  granted: boolean;
  files: string[];
  deniedFiles: string[];
  outsideAllowed: string[];
  conflictingFiles: string[];
  acquiredAt: string | null;
  expiresAt: string | null;
}

export interface GhostClawReceiptValidation {
  status: "receipt-valid" | "receipt-invalid";
  valid: boolean;
  requiredFields: string[];
  missingFields: string[];
}

export interface GhostClawDispatchPreview {
  title: string;
  status: string;
  mode: string;
  taskId: string;
  taskType: string;
  route: GhostClawRoute | null;
  agents: {
    primary: GhostClawAgent | null;
    reviewer: GhostClawAgent | null;
    validator: GhostClawAgent | null;
  };
  action: GhostClawActionClassification;
  lease: GhostClawFileLease | null;
  receipt: GhostClawReceiptValidation | null;
  reviewDispatch: {
    reviewer: string;
    mode: string;
    canMutate: boolean;
    providerCall: boolean;
  } | null;
  blockers: string[];
  guardrails: GhostClawGuardrails;
  nextSafeAction: string;
  updatedAt: string;
}

export const GHOSTCLAW_REGISTRY_PATHS: GhostClawRegistryPaths;
export const GHOSTCLAW_CONTROL_PLANE_RECEIPT_FIELDS: string[];

export function parseAgentRegistry(raw: string): GhostClawAgent[];
export function parseRouteMatrix(raw: string): GhostClawRoute[];
export function loadGhostClawControlPlane(root?: string, options?: Record<string, unknown>): Promise<GhostClawControlPlane>;
export function classifyGhostClawAction(input?: Record<string, unknown>): GhostClawActionClassification;
export function requestGhostClawFileLease(input?: Record<string, unknown>, options?: Record<string, unknown>): GhostClawFileLease;
export function validateGhostClawReceipt(receipt?: Record<string, unknown>): GhostClawReceiptValidation;
export function createGhostClawDispatchPreview(input?: Record<string, unknown>, options?: Record<string, unknown>): Promise<GhostClawDispatchPreview>;
