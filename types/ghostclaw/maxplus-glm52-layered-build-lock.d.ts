export type GhostClawLayeredMissionMode = "full_auto_safe_local_layered_sequence";

export type GhostClawLayeredPhase =
  | "PHASE_0_OBSERVE_AND_FREEZE"
  | "PHASE_1_BUILD_MAXPLUS_GLM52_SAFE_HARNESS"
  | "PHASE_2_BACKEND_DOMAIN_SCHEMA"
  | "PHASE_3_BACKEND_SERVICE_LOGIC"
  | "PHASE_4_API_CONTRACT_FREEZE"
  | "PHASE_5_API_ROUTE_HANDLER"
  | "PHASE_6_API_CLIENT_WIRING"
  | "PHASE_7_FRONTEND_STATE_HOOKS"
  | "PHASE_8_FRONTEND_COMPONENTS"
  | "PHASE_9_FRONTEND_PAGES_ONE_BY_ONE"
  | "PHASE_10_LOCAL_UAT"
  | "PHASE_11_REVIEW_AND_VALIDATION"
  | "PHASE_12_LOCAL_COMMIT_GATE";

export type GhostClawLayeredLayer =
  | "observe_freeze"
  | "harness"
  | "backend_domain_schema"
  | "backend_service_logic"
  | "api_contract"
  | "api_route_handler"
  | "api_client"
  | "frontend_state_hooks"
  | "frontend_components"
  | "frontend_pages"
  | "local_uat"
  | "review_validation"
  | "local_commit_gate";

export type GhostClawLayerStatus =
  | "blocked"
  | "queued"
  | "leased"
  | "building"
  | "validation_pending"
  | "receipt_written"
  | "ready_for_review"
  | "review_warn"
  | "review_pass"
  | "done"
  | "blocked_until_previous_layer_done"
  | "blocked_until_review"
  | "blocked_until_all_validation_and_receipts";

export type GhostClawLayeredLaneName =
  | "Hermes_Commander"
  | "Codex_Builder"
  | "OpenCode_Reviewer"
  | "GLM52_ClaudeCode_Lane"
  | "Stagehand_UAT_Worker"
  | "Validator_Worker";

export interface GhostClawMaxPlusGlm52LayeredBuildLock {
  mission: GhostClawLayeredMission;
  harness: GhostClawGlm52Harness;
  layers: GhostClawLayerDefinition[];
  lanes: GhostClawLayeredLane[];
  file_leases?: GhostClawLayeredFileLease[];
  reviews?: GhostClawLayeredReviewRef[];
  receipts?: GhostClawLayeredReceiptRef[];
  safety_policy: GhostClawLayeredSafetyPolicy;
}

export interface GhostClawLayeredMission {
  mission_id: "GC-MAXPLUS-GLM52-LAYERED-LOCK-20260630-001";
  mission_name: "MAXPLUS_GLM52_SAFE_HARNESS_LAYERED_BUILD_LOCK_V8";
  repo_root: "/Users/sirinx/sirinx-os";
  expected_branch: "staging/godmode-master-os-v2";
  mode: GhostClawLayeredMissionMode;
  source_of_truth: "local_repo";
}

export interface GhostClawGlm52Harness {
  expected_provider: "maxplus";
  expected_model: "glm-5.2";
  expected_identity: "glm-5.2 via MaxPlus proxy; not native Claude";
  effort_cap: "high";
  truth_sources: Array<
    | ".claude/settings.local.json"
    | "launcher environment"
    | ".ghostclaw_runtime/receipts/*.json"
    | "canary output"
  >;
  provider_call_required_for_local_validation: false;
  model_self_description_is_evidence?: false;
}

export interface GhostClawLayerDefinition {
  packet_id: string;
  phase: GhostClawLayeredPhase;
  layer: GhostClawLayeredLayer;
  status: GhostClawLayerStatus;
  allowed_groups: string[];
  forbidden_groups?: string[];
  page_lock_required?: boolean;
  one_page_at_a_time?: boolean;
  receipt_required: true;
  validation_required: true;
  next_layer_opened?: boolean;
}

export interface GhostClawLayeredLane {
  lane_name: GhostClawLayeredLaneName;
  role: string;
  mutation_allowed: boolean | string;
  write_scopes?: string[];
  status: string;
}

export interface GhostClawLayeredFileLease {
  lease_id: string;
  packet_id: string;
  layer: GhostClawLayeredLayer | string;
  owner: string;
  leased_files: string[];
  created_at: string;
  expires_at?: string;
  status: "leased" | "released" | "conflict" | "expired";
}

export interface GhostClawLayeredReceiptRef {
  packet_id: string;
  path: string;
  status: "written" | "validated" | "review_pending" | "blocked";
}

export interface GhostClawLayeredReviewRef {
  review_id: string;
  path: string;
  status: "pass" | "warn" | "fail" | "pending";
  provider_invoked: boolean;
}

export interface GhostClawLayeredSafetyPolicy {
  local_only: true;
  one_layer_at_a_time: true;
  one_page_at_a_time: true;
  codex_only_mutating_builder: true;
  blocked_actions: string[];
  secret_handling: "presence_only_never_read_or_print_values";
  next_layer_gate: "receipt_review_and_validation_required_before_open";
}
