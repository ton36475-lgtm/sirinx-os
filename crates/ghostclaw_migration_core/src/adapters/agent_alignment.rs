//! Deterministic, local-only alignment policy for bounded agent teams.
//!
//! Despite the `TrainingModel` name, this module does not perform machine
//! learning, provider calls, process execution, or file I/O. It evaluates one
//! shared objective and base commit against a fixed Hermes-manager topology.

use std::collections::BTreeSet;

use crate::schema::escape_json;

/// Stable version of the alignment evaluation contract.
pub const AGENT_ALIGNMENT_CONTRACT_VERSION: &str = "agent_alignment_training_model.v1";

/// Exact authority token accepted for the manager.
pub const CANONICAL_MANAGER_AUTHORITY: &str = "hermes";

/// Maximum number of execution agents, excluding the Hermes manager.
pub const MAX_EXECUTION_AGENTS: usize = 3;

/// Maximum number of maker agents.
pub const MAX_MAKERS: usize = 2;

const REQUIRED_CHECK_NAMES: &[&str] = &[
    "authority.canonical_hermes",
    "effects.external_actions_disabled",
    "effects.live_execution_disabled",
    "identity.unique_agent_ids",
    "ownership.disjoint_writer_scopes",
    "shared.base_commit",
    "shared.objective",
    "topology.execution_agent_limit",
    "topology.independent_verifier",
    "topology.maker_limit",
];

const REQUIRED_RECEIPT_FIELD_NAMES: &[&str] = &[
    "base_commit",
    "contract_version",
    "execution_agent_assignments",
    "execution_agent_ids",
    "external_actions",
    "issues",
    "live_execution",
    "manager_authority",
    "manager_id",
    "objective",
    "verdict",
];

/// One execution role in the bounded team.
#[derive(Clone, Copy, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub enum AlignmentAgentRole {
    /// Writer responsible for one or more disjoint repository paths.
    Maker,
    /// Independent, read-only reviewer.
    Verifier,
}

impl AlignmentAgentRole {
    /// Returns the stable role identifier.
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Maker => "maker",
            Self::Verifier => "verifier",
        }
    }
}

/// Hermes manager authority, kept outside the execution-agent count.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AlignmentManager {
    /// Unique manager id.
    pub agent_id: String,
    /// Authority token; only the exact value `hermes` is accepted.
    pub authority: String,
    /// Whether the manager may trigger an external action.
    pub external_actions: bool,
    /// Whether the manager may trigger live execution.
    pub live_execution: bool,
}

impl AlignmentManager {
    /// Creates a canonical local-only Hermes manager.
    pub fn hermes(agent_id: impl Into<String>) -> Self {
        Self {
            agent_id: agent_id.into(),
            authority: CANONICAL_MANAGER_AUTHORITY.to_string(),
            external_actions: false,
            live_execution: false,
        }
    }
}

/// One execution-agent assignment evaluated by the alignment contract.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AlignmentExecutionAgent {
    /// Unique execution-agent id.
    pub agent_id: String,
    /// Assigned roles. Exactly one role is valid.
    pub roles: Vec<AlignmentAgentRole>,
    /// Whether the agent is restricted to read-only work.
    pub read_only: bool,
    /// Repo-relative writer scopes. Only makers may own paths.
    pub owned_paths: Vec<String>,
    /// Whether this agent may trigger an external action.
    pub external_actions: bool,
    /// Whether this agent may trigger live execution.
    pub live_execution: bool,
}

impl AlignmentExecutionAgent {
    /// Creates a writer maker with explicit owned paths.
    pub fn writer_maker(agent_id: impl Into<String>, owned_paths: Vec<String>) -> Self {
        Self {
            agent_id: agent_id.into(),
            roles: vec![AlignmentAgentRole::Maker],
            read_only: false,
            owned_paths,
            external_actions: false,
            live_execution: false,
        }
    }

    /// Creates an independent verifier with no writer ownership.
    pub fn read_only_verifier(agent_id: impl Into<String>) -> Self {
        Self {
            agent_id: agent_id.into(),
            roles: vec![AlignmentAgentRole::Verifier],
            read_only: true,
            owned_paths: Vec::new(),
            external_actions: false,
            live_execution: false,
        }
    }
}

/// Observed check and receipt evidence supplied to one evaluation.
///
/// The model derives the required names itself; callers only report which
/// checks and fields were actually present.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AlignmentEvidence {
    /// Names of deterministic checks recorded by the caller.
    pub completed_checks: Vec<String>,
    /// Names of fields present in the caller's alignment receipt.
    pub receipt_fields: Vec<String>,
}

impl AlignmentEvidence {
    /// Creates evidence from observed check and receipt-field names.
    pub fn new(completed_checks: Vec<String>, receipt_fields: Vec<String>) -> Self {
        Self {
            completed_checks,
            receipt_fields,
        }
    }

    /// Creates complete evidence from the contract-derived requirements.
    pub fn complete() -> Self {
        Self {
            completed_checks: AgentAlignmentTrainingModel::required_check_names()
                .iter()
                .map(|name| (*name).to_string())
                .collect(),
            receipt_fields: AgentAlignmentTrainingModel::required_receipt_field_names()
                .iter()
                .map(|name| (*name).to_string())
                .collect(),
        }
    }
}

/// Deterministic policy input that binds all team members to one objective and
/// one base commit.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AgentAlignmentTrainingModel {
    /// Shared objective for every manager, maker, and verifier.
    pub objective: String,
    /// Shared immutable base commit for every assignment.
    pub base_commit: String,
    /// Hermes manager, excluded from the execution-agent count.
    pub manager: AlignmentManager,
    /// Bounded maker and verifier assignments.
    pub execution_agents: Vec<AlignmentExecutionAgent>,
    /// Global external-action permission; canonical value is `false`.
    pub external_actions: bool,
    /// Global live-execution permission; canonical value is `false`.
    pub live_execution: bool,
}

impl AgentAlignmentTrainingModel {
    /// Creates a local-only model with all global execution flags disabled.
    pub fn new(
        objective: impl Into<String>,
        base_commit: impl Into<String>,
        manager: AlignmentManager,
        execution_agents: Vec<AlignmentExecutionAgent>,
    ) -> Self {
        Self {
            objective: objective.into(),
            base_commit: base_commit.into(),
            manager,
            execution_agents,
            external_actions: false,
            live_execution: false,
        }
    }

    /// Returns the stable check names derived from this contract version.
    pub const fn required_check_names() -> &'static [&'static str] {
        REQUIRED_CHECK_NAMES
    }

    /// Returns the stable receipt fields derived from this contract version.
    pub const fn required_receipt_field_names() -> &'static [&'static str] {
        REQUIRED_RECEIPT_FIELD_NAMES
    }

    /// Evaluates topology, identity, ownership, permission, and evidence rules.
    pub fn evaluate(&self, evidence: &AlignmentEvidence) -> AgentAlignmentEvaluationReport {
        let mut issue_codes = Vec::new();

        if self.objective.trim().is_empty() {
            record_issue(&mut issue_codes, AlignmentIssueCode::ObjectiveMissing);
        }
        if self.base_commit.trim().is_empty() {
            record_issue(&mut issue_codes, AlignmentIssueCode::BaseCommitMissing);
        }
        if self.manager.authority != CANONICAL_MANAGER_AUTHORITY {
            record_issue(
                &mut issue_codes,
                AlignmentIssueCode::ManagerAuthorityNotHermes,
            );
        }
        if self.external_actions {
            record_issue(
                &mut issue_codes,
                AlignmentIssueCode::GlobalExternalActionsEnabled,
            );
        }
        if self.live_execution {
            record_issue(
                &mut issue_codes,
                AlignmentIssueCode::GlobalLiveExecutionEnabled,
            );
        }
        if self.manager.external_actions {
            record_issue(
                &mut issue_codes,
                AlignmentIssueCode::ManagerExternalActionsEnabled,
            );
        }
        if self.manager.live_execution {
            record_issue(
                &mut issue_codes,
                AlignmentIssueCode::ManagerLiveExecutionEnabled,
            );
        }

        let execution_agent_count = self.execution_agents.len();
        if execution_agent_count > MAX_EXECUTION_AGENTS {
            record_issue(
                &mut issue_codes,
                AlignmentIssueCode::ExecutionAgentLimitExceeded,
            );
        }

        let maker_count = self
            .execution_agents
            .iter()
            .filter(|agent| agent.roles.contains(&AlignmentAgentRole::Maker))
            .count();
        if maker_count > MAX_MAKERS {
            record_issue(&mut issue_codes, AlignmentIssueCode::MakerLimitExceeded);
        }

        let mut seen_ids = BTreeSet::new();
        let manager_id = self.manager.agent_id.trim();
        if manager_id.is_empty() {
            record_issue(&mut issue_codes, AlignmentIssueCode::ManagerIdMissing);
        } else {
            seen_ids.insert(manager_id.to_string());
        }

        let mut normalized_writer_scopes = Vec::new();
        let mut verifier_count = 0;
        let mut independent_verifier_count = 0;

        for agent in &self.execution_agents {
            let agent_id = agent.agent_id.trim();
            let id_is_unique = if agent_id.is_empty() {
                record_issue(&mut issue_codes, AlignmentIssueCode::AgentIdMissing);
                false
            } else if seen_ids.insert(agent_id.to_string()) {
                true
            } else {
                record_issue(&mut issue_codes, AlignmentIssueCode::DuplicateAgentId);
                false
            };

            let maker_role_count = agent
                .roles
                .iter()
                .filter(|role| **role == AlignmentAgentRole::Maker)
                .count();
            let verifier_role_count = agent
                .roles
                .iter()
                .filter(|role| **role == AlignmentAgentRole::Verifier)
                .count();
            let is_maker = maker_role_count > 0;
            let is_verifier = verifier_role_count > 0;

            if !is_maker && !is_verifier {
                record_issue(&mut issue_codes, AlignmentIssueCode::AgentRoleMissing);
            }
            if maker_role_count > 1 || verifier_role_count > 1 {
                record_issue(&mut issue_codes, AlignmentIssueCode::DuplicateAgentRole);
            }
            if is_maker && is_verifier {
                record_issue(&mut issue_codes, AlignmentIssueCode::AgentDualRole);
            }
            if agent.external_actions {
                record_issue(
                    &mut issue_codes,
                    AlignmentIssueCode::AgentExternalActionsEnabled,
                );
            }
            if agent.live_execution {
                record_issue(
                    &mut issue_codes,
                    AlignmentIssueCode::AgentLiveExecutionEnabled,
                );
            }

            if is_maker {
                if agent.read_only {
                    record_issue(&mut issue_codes, AlignmentIssueCode::MakerNotWriter);
                }
                if agent.owned_paths.is_empty() {
                    record_issue(&mut issue_codes, AlignmentIssueCode::MakerOwnedPathsMissing);
                }
                for path in &agent.owned_paths {
                    match normalize_writer_scope(path) {
                        Ok(normalized) => {
                            normalized_writer_scopes.push((agent_id.to_string(), normalized));
                        }
                        Err(code) => record_issue(&mut issue_codes, code),
                    }
                }
            }

            if is_verifier {
                verifier_count += 1;
                if !agent.read_only {
                    record_issue(&mut issue_codes, AlignmentIssueCode::VerifierNotReadOnly);
                }
                if !agent.owned_paths.is_empty() {
                    record_issue(&mut issue_codes, AlignmentIssueCode::VerifierHasOwnedPaths);
                }
                let has_one_verifier_role =
                    verifier_role_count == 1 && maker_role_count == 0 && agent.roles.len() == 1;
                if has_one_verifier_role
                    && agent.read_only
                    && agent.owned_paths.is_empty()
                    && !agent.external_actions
                    && !agent.live_execution
                    && id_is_unique
                    && !agent_id.is_empty()
                {
                    independent_verifier_count += 1;
                }
            }
        }

        normalized_writer_scopes.sort();
        if writer_scopes_overlap(&normalized_writer_scopes) {
            record_issue(&mut issue_codes, AlignmentIssueCode::MakerPathScopeOverlap);
        }
        if independent_verifier_count == 0 {
            record_issue(
                &mut issue_codes,
                AlignmentIssueCode::IndependentVerifierMissing,
            );
        }

        let required_checks = Self::required_check_names()
            .iter()
            .map(|name| (*name).to_string())
            .collect::<Vec<_>>();
        let completed_checks = evidence
            .completed_checks
            .iter()
            .map(String::as_str)
            .collect::<BTreeSet<_>>();
        let missing_checks = required_checks
            .iter()
            .filter(|name| !completed_checks.contains(name.as_str()))
            .cloned()
            .collect::<Vec<_>>();
        if !missing_checks.is_empty() {
            record_issue(&mut issue_codes, AlignmentIssueCode::RequiredCheckMissing);
        }

        let required_receipt_fields = Self::required_receipt_field_names()
            .iter()
            .map(|name| (*name).to_string())
            .collect::<Vec<_>>();
        let receipt_fields = evidence
            .receipt_fields
            .iter()
            .map(String::as_str)
            .collect::<BTreeSet<_>>();
        let missing_receipt_fields = required_receipt_fields
            .iter()
            .filter(|name| !receipt_fields.contains(name.as_str()))
            .cloned()
            .collect::<Vec<_>>();
        if !missing_receipt_fields.is_empty() {
            record_issue(&mut issue_codes, AlignmentIssueCode::ReceiptFieldMissing);
        }

        issue_codes.sort_by_key(|code| code.as_str());
        let issues = issue_codes
            .into_iter()
            .map(AlignmentIssue::from_code)
            .collect::<Vec<_>>();
        let verdict = if issues.is_empty() {
            AlignmentVerdict::Aligned
        } else {
            AlignmentVerdict::Blocked
        };
        let mut execution_agent_ids = self
            .execution_agents
            .iter()
            .map(|agent| agent.agent_id.clone())
            .collect::<Vec<_>>();
        execution_agent_ids.sort();
        let mut execution_agent_assignments = self
            .execution_agents
            .iter()
            .map(AlignmentAssignmentSnapshot::from_agent)
            .collect::<Vec<_>>();
        execution_agent_assignments.sort();
        let external_actions = self.external_actions
            || self.manager.external_actions
            || self
                .execution_agents
                .iter()
                .any(|agent| agent.external_actions);
        let live_execution = self.live_execution
            || self.manager.live_execution
            || self
                .execution_agents
                .iter()
                .any(|agent| agent.live_execution);

        AgentAlignmentEvaluationReport {
            contract_version: AGENT_ALIGNMENT_CONTRACT_VERSION.to_string(),
            verdict,
            objective: self.objective.clone(),
            base_commit: self.base_commit.clone(),
            manager_id: self.manager.agent_id.clone(),
            manager_authority: self.manager.authority.clone(),
            execution_agent_ids,
            execution_agent_assignments,
            execution_agent_count,
            maker_count,
            verifier_count,
            independent_verifier_count,
            external_actions,
            live_execution,
            required_checks,
            missing_checks,
            required_receipt_fields,
            missing_receipt_fields,
            issues,
        }
    }
}

/// Final alignment verdict.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum AlignmentVerdict {
    /// Every deterministic rule passed.
    Aligned,
    /// At least one deterministic rule failed.
    Blocked,
}

impl AlignmentVerdict {
    /// Returns the stable verdict identifier.
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Aligned => "aligned",
            Self::Blocked => "blocked",
        }
    }
}

/// Stable machine-readable issue code.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum AlignmentIssueCode {
    /// Shared objective was empty.
    ObjectiveMissing,
    /// Shared base commit was empty.
    BaseCommitMissing,
    /// Manager authority was not the exact canonical Hermes token.
    ManagerAuthorityNotHermes,
    /// Manager id was empty.
    ManagerIdMissing,
    /// More than three execution agents were configured.
    ExecutionAgentLimitExceeded,
    /// More than two maker agents were configured.
    MakerLimitExceeded,
    /// No valid independent read-only verifier was configured.
    IndependentVerifierMissing,
    /// An execution-agent id was empty.
    AgentIdMissing,
    /// An id was reused by the manager or an execution agent.
    DuplicateAgentId,
    /// An execution agent had no role.
    AgentRoleMissing,
    /// An execution agent repeated one role.
    DuplicateAgentRole,
    /// One execution agent was both maker and verifier.
    AgentDualRole,
    /// A maker was marked read-only.
    MakerNotWriter,
    /// A maker had no owned writer paths.
    MakerOwnedPathsMissing,
    /// A writer path was empty.
    MakerPathScopeEmpty,
    /// A writer path was absolute.
    MakerPathScopeAbsolute,
    /// A writer path used a non-portable separator.
    MakerPathScopeNonPortable,
    /// A writer path was not in exact canonical repo-relative form.
    MakerPathScopeNonCanonical,
    /// A writer path contained parent traversal.
    MakerPathScopeTraversal,
    /// A writer path contained glob syntax.
    MakerPathScopeGlob,
    /// A writer path resolved to the repository root.
    MakerPathScopeBroadRoot,
    /// Two normalized writer scopes were equal or ancestor-related.
    MakerPathScopeOverlap,
    /// A verifier was not read-only.
    VerifierNotReadOnly,
    /// A verifier claimed writer ownership.
    VerifierHasOwnedPaths,
    /// Global external actions were enabled.
    GlobalExternalActionsEnabled,
    /// Global live execution was enabled.
    GlobalLiveExecutionEnabled,
    /// Manager external actions were enabled.
    ManagerExternalActionsEnabled,
    /// Manager live execution was enabled.
    ManagerLiveExecutionEnabled,
    /// An execution agent enabled external actions.
    AgentExternalActionsEnabled,
    /// An execution agent enabled live execution.
    AgentLiveExecutionEnabled,
    /// At least one contract-derived check was absent.
    RequiredCheckMissing,
    /// At least one contract-derived receipt field was absent.
    ReceiptFieldMissing,
}

impl AlignmentIssueCode {
    /// Returns the stable issue-code string.
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::ObjectiveMissing => "objective_missing",
            Self::BaseCommitMissing => "base_commit_missing",
            Self::ManagerAuthorityNotHermes => "manager_authority_not_hermes",
            Self::ManagerIdMissing => "manager_id_missing",
            Self::ExecutionAgentLimitExceeded => "execution_agent_limit_exceeded",
            Self::MakerLimitExceeded => "maker_limit_exceeded",
            Self::IndependentVerifierMissing => "independent_verifier_missing",
            Self::AgentIdMissing => "agent_id_missing",
            Self::DuplicateAgentId => "duplicate_agent_id",
            Self::AgentRoleMissing => "agent_role_missing",
            Self::DuplicateAgentRole => "duplicate_agent_role",
            Self::AgentDualRole => "agent_dual_role",
            Self::MakerNotWriter => "maker_not_writer",
            Self::MakerOwnedPathsMissing => "maker_owned_paths_missing",
            Self::MakerPathScopeEmpty => "maker_path_scope_empty",
            Self::MakerPathScopeAbsolute => "maker_path_scope_absolute",
            Self::MakerPathScopeNonPortable => "maker_path_scope_non_portable",
            Self::MakerPathScopeNonCanonical => "maker_path_scope_non_canonical",
            Self::MakerPathScopeTraversal => "maker_path_scope_traversal",
            Self::MakerPathScopeGlob => "maker_path_scope_glob",
            Self::MakerPathScopeBroadRoot => "maker_path_scope_broad_root",
            Self::MakerPathScopeOverlap => "maker_path_scope_overlap",
            Self::VerifierNotReadOnly => "verifier_not_read_only",
            Self::VerifierHasOwnedPaths => "verifier_has_owned_paths",
            Self::GlobalExternalActionsEnabled => "global_external_actions_enabled",
            Self::GlobalLiveExecutionEnabled => "global_live_execution_enabled",
            Self::ManagerExternalActionsEnabled => "manager_external_actions_enabled",
            Self::ManagerLiveExecutionEnabled => "manager_live_execution_enabled",
            Self::AgentExternalActionsEnabled => "agent_external_actions_enabled",
            Self::AgentLiveExecutionEnabled => "agent_live_execution_enabled",
            Self::RequiredCheckMissing => "required_check_missing",
            Self::ReceiptFieldMissing => "receipt_field_missing",
        }
    }

    /// Returns the stable operator-facing explanation.
    pub const fn message(self) -> &'static str {
        match self {
            Self::ObjectiveMissing => "shared objective must be non-empty",
            Self::BaseCommitMissing => "shared base commit must be non-empty",
            Self::ManagerAuthorityNotHermes => "manager authority must equal hermes exactly",
            Self::ManagerIdMissing => "manager id must be non-empty",
            Self::ExecutionAgentLimitExceeded => "execution-agent count exceeds three",
            Self::MakerLimitExceeded => "maker count exceeds two",
            Self::IndependentVerifierMissing => {
                "at least one distinct read-only verifier is required"
            }
            Self::AgentIdMissing => "execution-agent ids must be non-empty",
            Self::DuplicateAgentId => "manager and execution-agent ids must be unique",
            Self::AgentRoleMissing => "each execution agent needs exactly one role",
            Self::DuplicateAgentRole => "an execution agent repeated a role",
            Self::AgentDualRole => "maker and verifier roles must be independent",
            Self::MakerNotWriter => "maker agents must be writer assignments",
            Self::MakerOwnedPathsMissing => "maker agents require owned paths",
            Self::MakerPathScopeEmpty => "writer scopes must be non-empty",
            Self::MakerPathScopeAbsolute => "writer scopes must be repo-relative",
            Self::MakerPathScopeNonPortable => "writer scopes must use forward slashes",
            Self::MakerPathScopeNonCanonical => {
                "writer scopes must use exact canonical repo-relative spelling"
            }
            Self::MakerPathScopeTraversal => "writer scopes must not contain parent traversal",
            Self::MakerPathScopeGlob => "writer scopes must not contain glob syntax",
            Self::MakerPathScopeBroadRoot => "writer scopes must not own the repository root",
            Self::MakerPathScopeOverlap => "normalized writer scopes must be pairwise disjoint",
            Self::VerifierNotReadOnly => "verifiers must be read-only",
            Self::VerifierHasOwnedPaths => "verifiers must not own writer paths",
            Self::GlobalExternalActionsEnabled => "global external actions must be false",
            Self::GlobalLiveExecutionEnabled => "global live execution must be false",
            Self::ManagerExternalActionsEnabled => "manager external actions must be false",
            Self::ManagerLiveExecutionEnabled => "manager live execution must be false",
            Self::AgentExternalActionsEnabled => "agent external actions must be false",
            Self::AgentLiveExecutionEnabled => "agent live execution must be false",
            Self::RequiredCheckMissing => "all contract-derived checks must be recorded",
            Self::ReceiptFieldMissing => "all contract-derived receipt fields must be recorded",
        }
    }
}

/// One typed issue in an evaluation report.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AlignmentIssue {
    /// Stable machine-readable code.
    pub code: AlignmentIssueCode,
    /// Stable operator-facing explanation.
    pub message: &'static str,
}

impl AlignmentIssue {
    fn from_code(code: AlignmentIssueCode) -> Self {
        Self {
            code,
            message: code.message(),
        }
    }

    fn to_json(&self) -> String {
        format!(
            "{{\"code\":\"{}\",\"message\":\"{}\"}}",
            self.code.as_str(),
            escape_json(self.message)
        )
    }
}

/// Canonically ordered assignment data bound into an evaluation receipt.
#[derive(Clone, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub struct AlignmentAssignmentSnapshot {
    /// Exact execution-agent id.
    pub agent_id: String,
    /// Sorted role identifiers.
    pub roles: Vec<String>,
    /// Whether this assignment is read-only.
    pub read_only: bool,
    /// Sorted exact owned paths.
    pub owned_paths: Vec<String>,
    /// Whether external actions are enabled.
    pub external_actions: bool,
    /// Whether live execution is enabled.
    pub live_execution: bool,
}

impl AlignmentAssignmentSnapshot {
    fn from_agent(agent: &AlignmentExecutionAgent) -> Self {
        let mut roles = agent
            .roles
            .iter()
            .map(|role| role.as_str().to_string())
            .collect::<Vec<_>>();
        roles.sort();
        let mut owned_paths = agent.owned_paths.clone();
        owned_paths.sort();
        Self {
            agent_id: agent.agent_id.clone(),
            roles,
            read_only: agent.read_only,
            owned_paths,
            external_actions: agent.external_actions,
            live_execution: agent.live_execution,
        }
    }

    fn to_json(&self) -> String {
        format!(
            "{{\"agent_id\":\"{}\",\"roles\":{},\"read_only\":{},\"owned_paths\":{},\"external_actions\":{},\"live_execution\":{}}}",
            escape_json(&self.agent_id),
            json_string_array(&self.roles),
            self.read_only,
            json_string_array(&self.owned_paths),
            self.external_actions,
            self.live_execution
        )
    }
}

/// Typed, deterministic output from one model evaluation.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AgentAlignmentEvaluationReport {
    /// Alignment contract version.
    pub contract_version: String,
    /// Aggregate verdict.
    pub verdict: AlignmentVerdict,
    /// Shared objective snapshot.
    pub objective: String,
    /// Shared base-commit snapshot.
    pub base_commit: String,
    /// Manager id snapshot.
    pub manager_id: String,
    /// Manager authority snapshot.
    pub manager_authority: String,
    /// Sorted execution-agent ids.
    pub execution_agent_ids: Vec<String>,
    /// Sorted execution-agent assignment snapshots.
    pub execution_agent_assignments: Vec<AlignmentAssignmentSnapshot>,
    /// Execution-agent count, excluding the manager.
    pub execution_agent_count: usize,
    /// Number of agents assigned the maker role.
    pub maker_count: usize,
    /// Number of agents assigned the verifier role.
    pub verifier_count: usize,
    /// Number of valid independent verifiers.
    pub independent_verifier_count: usize,
    /// Whether any model member enabled external actions.
    pub external_actions: bool,
    /// Whether any model member enabled live execution.
    pub live_execution: bool,
    /// Contract-derived required checks.
    pub required_checks: Vec<String>,
    /// Required checks absent from observed evidence.
    pub missing_checks: Vec<String>,
    /// Contract-derived required receipt fields.
    pub required_receipt_fields: Vec<String>,
    /// Required receipt fields absent from observed evidence.
    pub missing_receipt_fields: Vec<String>,
    /// Issues sorted by stable issue code.
    pub issues: Vec<AlignmentIssue>,
}

impl AgentAlignmentEvaluationReport {
    /// Returns whether this report passed every rule.
    pub fn is_aligned(&self) -> bool {
        self.verdict == AlignmentVerdict::Aligned
    }

    /// Returns whether the report contains one issue code.
    pub fn has_issue(&self, code: AlignmentIssueCode) -> bool {
        self.issues.iter().any(|issue| issue.code == code)
    }

    /// Serializes the report to compact JSON with stable field and list order.
    pub fn to_json(&self) -> String {
        let issues = self
            .issues
            .iter()
            .map(AlignmentIssue::to_json)
            .collect::<Vec<_>>()
            .join(",");
        let assignments = self
            .execution_agent_assignments
            .iter()
            .map(AlignmentAssignmentSnapshot::to_json)
            .collect::<Vec<_>>()
            .join(",");
        format!(
            "{{\"contract_version\":\"{}\",\"verdict\":\"{}\",\"objective\":\"{}\",\"base_commit\":\"{}\",\"manager_id\":\"{}\",\"manager_authority\":\"{}\",\"execution_agent_ids\":{},\"execution_agent_assignments\":[{}],\"execution_agent_count\":{},\"maker_count\":{},\"verifier_count\":{},\"independent_verifier_count\":{},\"external_actions\":{},\"live_execution\":{},\"required_checks\":{},\"missing_checks\":{},\"required_receipt_fields\":{},\"missing_receipt_fields\":{},\"issues\":[{}]}}",
            escape_json(&self.contract_version),
            self.verdict.as_str(),
            escape_json(&self.objective),
            escape_json(&self.base_commit),
            escape_json(&self.manager_id),
            escape_json(&self.manager_authority),
            json_string_array(&self.execution_agent_ids),
            assignments,
            self.execution_agent_count,
            self.maker_count,
            self.verifier_count,
            self.independent_verifier_count,
            self.external_actions,
            self.live_execution,
            json_string_array(&self.required_checks),
            json_string_array(&self.missing_checks),
            json_string_array(&self.required_receipt_fields),
            json_string_array(&self.missing_receipt_fields),
            issues
        )
    }
}

fn record_issue(issues: &mut Vec<AlignmentIssueCode>, code: AlignmentIssueCode) {
    if !issues.contains(&code) {
        issues.push(code);
    }
}

fn normalize_writer_scope(path: &str) -> Result<String, AlignmentIssueCode> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err(AlignmentIssueCode::MakerPathScopeEmpty);
    }
    if trimmed != path {
        return Err(AlignmentIssueCode::MakerPathScopeNonCanonical);
    }
    if trimmed.starts_with('/') || trimmed.starts_with('\\') || is_windows_absolute_path(trimmed) {
        return Err(AlignmentIssueCode::MakerPathScopeAbsolute);
    }
    if trimmed.contains('\\') {
        return Err(AlignmentIssueCode::MakerPathScopeNonPortable);
    }
    if trimmed
        .chars()
        .any(|ch| matches!(ch, '*' | '?' | '[' | ']' | '{' | '}'))
    {
        return Err(AlignmentIssueCode::MakerPathScopeGlob);
    }

    let mut segments = Vec::new();
    for segment in trimmed.split('/') {
        match segment {
            "" | "." => {}
            ".." => return Err(AlignmentIssueCode::MakerPathScopeTraversal),
            value => segments.push(value),
        }
    }
    if segments.is_empty() {
        return Err(AlignmentIssueCode::MakerPathScopeBroadRoot);
    }
    let canonical = segments.join("/");
    if canonical != trimmed {
        return Err(AlignmentIssueCode::MakerPathScopeNonCanonical);
    }
    Ok(canonical)
}

fn is_windows_absolute_path(path: &str) -> bool {
    let bytes = path.as_bytes();
    bytes.len() >= 2 && bytes[0].is_ascii_alphabetic() && bytes[1] == b':'
}

fn writer_scopes_overlap(scopes: &[(String, String)]) -> bool {
    for (index, (_, left)) in scopes.iter().enumerate() {
        for (_, right) in scopes.iter().skip(index + 1) {
            if path_scopes_overlap(left, right) {
                return true;
            }
        }
    }
    false
}

fn path_scopes_overlap(left: &str, right: &str) -> bool {
    left == right || is_path_descendant(left, right) || is_path_descendant(right, left)
}

fn is_path_descendant(candidate: &str, parent: &str) -> bool {
    candidate
        .strip_prefix(parent)
        .is_some_and(|suffix| suffix.starts_with('/'))
}

fn json_string_array(values: &[String]) -> String {
    let values = values
        .iter()
        .map(|value| format!("\"{}\"", escape_json(value)))
        .collect::<Vec<_>>()
        .join(",");
    format!("[{values}]")
}
