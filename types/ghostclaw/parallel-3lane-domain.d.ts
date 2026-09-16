export type GhostClawLaneName =
  | "Hermes_Commander"
  | "Codex_Builder"
  | "OpenCode_Reviewer"
  | "Validator_Worker";

export type GhostClawLaneType = "control" | "build" | "review" | "validation";

export type GhostClawPacketLayer =
  | "backend_domain_schema"
  | "backend_service_logic"
  | "api_contract_freeze"
  | "api_route_handler"
  | "api_client_wiring"
  | "frontend_state_hooks"
  | "frontend_components"
  | "frontend_pages_one_by_one"
  | "local_uat_ready_packet";

export type GhostClawPacketStatus =
  | "queued"
  | "leased"
  | "building"
  | "validation_pending"
  | "receipt_written"
  | "ready_for_review"
  | "review_warn"
  | "review_pass"
  | "done"
  | "blocked";

export interface GhostClawParallelThreeLaneDomain {
  mission: GhostClawMission;
  lanes: GhostClawLane[];
  packets: GhostClawPacket[];
  file_leases?: GhostClawFileLease[];
  receipts?: GhostClawReceiptRef[];
  safety_policy: GhostClawSafetyPolicy;
}

export interface GhostClawMission {
  mission_id: string;
  mission_name: string;
  repo_root: "/Users/sirinx/sirinx-os";
  branch: string;
  mode: "full_auto_safe_local_parallel_lanes";
  source_of_truth: "local_repo";
}

export interface GhostClawLane {
  lane_name: GhostClawLaneName;
  lane_type: GhostClawLaneType;
  owner: string;
  mutation_allowed: boolean;
  write_scopes?: string[];
  status: string;
}

export interface GhostClawPacket {
  packet_id: string;
  layer: GhostClawPacketLayer;
  status: GhostClawPacketStatus;
  allowed_groups: string[];
  forbidden_groups?: string[];
  leased_files?: string[];
  page_lock_required?: boolean;
  receipt_required: true;
  validation_required: true;
  next_packet_opened?: boolean;
}

export interface GhostClawFileLease {
  lease_id: string;
  packet_id: string;
  owner: string;
  leased_files: string[];
  created_at: string;
  expires_at?: string;
  status: "leased" | "released" | "conflict" | "expired";
}

export interface GhostClawReceiptRef {
  packet_id: string;
  path: string;
  status: "written" | "validated" | "review_pending" | "blocked";
}

export interface GhostClawSafetyPolicy {
  local_only: true;
  blocked_actions: string[];
  secret_handling: "presence_only_never_read_or_print_values";
  next_packet_gate: "receipt_and_validation_required_before_open";
}
