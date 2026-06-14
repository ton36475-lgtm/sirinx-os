export type CloudflareAgentPrototypeStatus =
  | "queued"
  | "validated"
  | "blocked"
  | "failed"
  | "done";

export type CloudflareAgentPrototypeJob = {
  job_id: string;
  correlation_id: string;
  type: "cloudflare_agent_team_local_prototype";
  status: CloudflareAgentPrototypeStatus;
  approval_required: boolean;
  requested_action: string;
  target_environment: "local-only" | "cloudflare-dev" | "cloudflare-preview";
  input_path: string;
  output_summary: string;
  log_path: string;
  created_at: string;
  cloudflareApiCall: false;
  externalWrite: false;
  secretRequired: false;
};

export type ComplianceDecision = {
  status: "allowed_local_only" | "blocked_preapproval_required" | "blocked_invalid_job";
  canProceedLocalOnly: boolean;
  canExecuteCloudMutation: false;
  blockedReasons: string[];
  approvalRequired: boolean;
  cloudflareApiCall: false;
  externalWrite: false;
  reviewedAt: string;
};

export type EvidencePacketResult = {
  status: "local_evidence_written";
  path: string;
  externalWrite: false;
  cloudflareApiCall: false;
  secretRequired: false;
  writtenAt: string;
};
