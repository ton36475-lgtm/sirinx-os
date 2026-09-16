use ghostclaw_migration_core::adapters::agent_alignment::{
    AgentAlignmentTrainingModel, AlignmentAgentRole, AlignmentEvidence, AlignmentExecutionAgent,
    AlignmentIssueCode, AlignmentManager,
};

#[test]
fn aligned_team_should_match_fixture_backed_report() {
    let model = aligned_model();

    let report = model.evaluate(&AlignmentEvidence::complete());

    assert_eq!(
        report.to_json(),
        include_str!("fixtures/agent_alignment/aligned_report.json").trim()
    );
}

#[test]
fn manager_should_not_count_toward_three_execution_agent_limit() {
    let model = aligned_model();

    let report = model.evaluate(&AlignmentEvidence::complete());

    assert_eq!(report.execution_agent_count, 3);
    assert!(report.is_aligned());
}

#[test]
fn evaluation_should_reject_non_canonical_hermes_authority() {
    let mut model = aligned_model();
    model.manager.authority = "Hermes".to_string();

    let report = model.evaluate(&AlignmentEvidence::complete());

    assert!(report.has_issue(AlignmentIssueCode::ManagerAuthorityNotHermes));
}

#[test]
fn evaluation_should_reject_spoofed_hermes_authority() {
    let mut model = aligned_model();
    model.manager.authority = "hеrmes".to_string();

    let report = model.evaluate(&AlignmentEvidence::complete());

    assert!(report.has_issue(AlignmentIssueCode::ManagerAuthorityNotHermes));
}

#[test]
fn evaluation_should_reject_four_execution_agents() {
    let mut model = aligned_model();
    model
        .execution_agents
        .push(AlignmentExecutionAgent::read_only_verifier("verifier-b"));

    let report = model.evaluate(&AlignmentEvidence::complete());

    assert!(report.has_issue(AlignmentIssueCode::ExecutionAgentLimitExceeded));
}

#[test]
fn evaluation_should_reject_three_makers() {
    let mut model = aligned_model();
    model
        .execution_agents
        .push(AlignmentExecutionAgent::writer_maker(
            "maker-c",
            vec!["docs/AGENT_ALIGNMENT_TRAINING_MODEL.md".to_string()],
        ));

    let report = model.evaluate(&AlignmentEvidence::complete());

    assert!(report.has_issue(AlignmentIssueCode::MakerLimitExceeded));
}

#[test]
fn evaluation_should_reject_missing_verifier() {
    let mut model = aligned_model();
    model
        .execution_agents
        .retain(|agent| !agent.roles.contains(&AlignmentAgentRole::Verifier));

    let report = model.evaluate(&AlignmentEvidence::complete());

    assert!(report.has_issue(AlignmentIssueCode::IndependentVerifierMissing));
}

#[test]
fn evaluation_should_reject_verifier_with_write_permission() {
    let mut model = aligned_model();
    let verifier = verifier_mut(&mut model);
    verifier.read_only = false;

    let report = model.evaluate(&AlignmentEvidence::complete());

    assert!(report.has_issue(AlignmentIssueCode::VerifierNotReadOnly));
}

#[test]
fn evaluation_should_reject_verifier_with_owned_writer_path() {
    let mut model = aligned_model();
    let verifier = verifier_mut(&mut model);
    verifier.owned_paths = vec!["src/lib.rs".to_string()];

    let report = model.evaluate(&AlignmentEvidence::complete());

    assert!(report.has_issue(AlignmentIssueCode::VerifierHasOwnedPaths));
}

#[test]
fn evaluation_should_reject_dual_role_agent() {
    let mut model = aligned_model();
    let verifier = verifier_mut(&mut model);
    verifier.roles.push(AlignmentAgentRole::Maker);

    let report = model.evaluate(&AlignmentEvidence::complete());

    assert!(report.has_issue(AlignmentIssueCode::AgentDualRole));
}

#[test]
fn evaluation_should_reject_duplicate_id_across_manager_and_workers() {
    let mut model = aligned_model();
    model.execution_agents[0].agent_id = model.manager.agent_id.clone();

    let report = model.evaluate(&AlignmentEvidence::complete());

    assert!(report.has_issue(AlignmentIssueCode::DuplicateAgentId));
}

#[test]
fn evaluation_should_reject_exact_writer_scope_overlap() {
    let mut model = aligned_model();
    model.execution_agents[1].owned_paths = vec!["src/adapters/agent_alignment.rs".to_string()];

    let report = model.evaluate(&AlignmentEvidence::complete());

    assert!(report.has_issue(AlignmentIssueCode::MakerPathScopeOverlap));
}

#[test]
fn evaluation_should_reject_parent_child_writer_scope_overlap() {
    let mut model = aligned_model();
    model.execution_agents[0].owned_paths = vec!["src/adapters".to_string()];
    model.execution_agents[1].owned_paths = vec!["src/adapters/agent_alignment.rs".to_string()];

    let report = model.evaluate(&AlignmentEvidence::complete());

    assert!(report.has_issue(AlignmentIssueCode::MakerPathScopeOverlap));
}

#[test]
fn evaluation_should_reject_dot_segment_writer_scope() {
    let mut model = aligned_model();
    model.execution_agents[0].owned_paths = vec!["src/./adapters/agent_alignment.rs".to_string()];

    let report = model.evaluate(&AlignmentEvidence::complete());

    assert!(report.has_issue(AlignmentIssueCode::MakerPathScopeNonCanonical));
}

#[test]
fn evaluation_should_reject_repeated_separator_writer_scope() {
    let mut model = aligned_model();
    model.execution_agents[0].owned_paths = vec!["src/adapters//agent_alignment.rs".to_string()];

    let report = model.evaluate(&AlignmentEvidence::complete());

    assert!(report.has_issue(AlignmentIssueCode::MakerPathScopeNonCanonical));
}

#[test]
fn evaluation_should_reject_whitespace_padded_writer_scope() {
    let mut model = aligned_model();
    model.execution_agents[0].owned_paths = vec![" src/adapters/agent_alignment.rs ".to_string()];

    let report = model.evaluate(&AlignmentEvidence::complete());

    assert!(report.has_issue(AlignmentIssueCode::MakerPathScopeNonCanonical));
}

#[test]
fn evaluation_should_reject_traversal_writer_scope() {
    let mut model = aligned_model();
    model.execution_agents[0].owned_paths = vec!["src/adapters/../review_packet.rs".to_string()];

    let report = model.evaluate(&AlignmentEvidence::complete());

    assert!(report.has_issue(AlignmentIssueCode::MakerPathScopeTraversal));
}

#[test]
fn evaluation_should_reject_glob_writer_scope() {
    let mut model = aligned_model();
    model.execution_agents[0].owned_paths = vec!["src/adapters/**".to_string()];

    let report = model.evaluate(&AlignmentEvidence::complete());

    assert!(report.has_issue(AlignmentIssueCode::MakerPathScopeGlob));
}

#[test]
fn evaluation_should_reject_broad_root_writer_scope() {
    let mut model = aligned_model();
    model.execution_agents[0].owned_paths = vec!["./".to_string()];

    let report = model.evaluate(&AlignmentEvidence::complete());

    assert!(report.has_issue(AlignmentIssueCode::MakerPathScopeBroadRoot));
}

#[test]
fn evaluation_should_reject_maker_without_owned_paths() {
    let mut model = aligned_model();
    model.execution_agents[0].owned_paths.clear();

    let report = model.evaluate(&AlignmentEvidence::complete());

    assert!(report.has_issue(AlignmentIssueCode::MakerOwnedPathsMissing));
}

#[test]
fn evaluation_should_reject_global_external_actions() {
    let mut model = aligned_model();
    model.external_actions = true;

    let report = model.evaluate(&AlignmentEvidence::complete());

    assert!(report.has_issue(AlignmentIssueCode::GlobalExternalActionsEnabled));
}

#[test]
fn evaluation_should_reject_global_live_execution() {
    let mut model = aligned_model();
    model.live_execution = true;

    let report = model.evaluate(&AlignmentEvidence::complete());

    assert!(report.has_issue(AlignmentIssueCode::GlobalLiveExecutionEnabled));
}

#[test]
fn evaluation_should_reject_manager_external_actions() {
    let mut model = aligned_model();
    model.manager.external_actions = true;

    let report = model.evaluate(&AlignmentEvidence::complete());

    assert!(report.has_issue(AlignmentIssueCode::ManagerExternalActionsEnabled));
}

#[test]
fn evaluation_should_reject_agent_live_execution() {
    let mut model = aligned_model();
    model.execution_agents[0].live_execution = true;

    let report = model.evaluate(&AlignmentEvidence::complete());

    assert!(report.has_issue(AlignmentIssueCode::AgentLiveExecutionEnabled));
}

#[test]
fn evaluation_should_reject_missing_required_checks() {
    let model = aligned_model();
    let mut evidence = AlignmentEvidence::complete();
    evidence.completed_checks.clear();

    let report = model.evaluate(&evidence);

    assert!(report.has_issue(AlignmentIssueCode::RequiredCheckMissing));
}

#[test]
fn evaluation_should_reject_missing_required_receipt_fields() {
    let model = aligned_model();
    let mut evidence = AlignmentEvidence::complete();
    evidence.receipt_fields.clear();

    let report = model.evaluate(&evidence);

    assert!(report.has_issue(AlignmentIssueCode::ReceiptFieldMissing));
}

#[test]
fn issue_json_should_use_stable_code_order() {
    let mut model = aligned_model();
    model.live_execution = true;
    model.external_actions = true;
    model.manager.authority = "HERMES".to_string();

    let report = model.evaluate(&AlignmentEvidence::new(Vec::new(), Vec::new()));
    let codes = report
        .issues
        .iter()
        .map(|issue| issue.code.as_str())
        .collect::<Vec<_>>();
    let mut sorted_codes = codes.clone();
    sorted_codes.sort_unstable();

    assert_eq!(codes, sorted_codes);
}

#[test]
fn report_json_should_canonicalize_agent_and_path_input_order() {
    let mut first = aligned_model();
    first.execution_agents[0]
        .owned_paths
        .push("src/adapters/mod.rs".to_string());
    let mut second = first.clone();
    second.execution_agents.reverse();
    for agent in &mut second.execution_agents {
        agent.owned_paths.reverse();
    }

    let first_json = first.evaluate(&AlignmentEvidence::complete()).to_json();
    let second_json = second.evaluate(&AlignmentEvidence::complete()).to_json();

    assert_eq!(first_json, second_json);
}

#[test]
fn report_json_should_differ_for_distinct_ownership_assignments() {
    let first = aligned_model();
    let mut second = aligned_model();
    second.execution_agents[0].owned_paths =
        vec!["src/adapters/orchestrator_status.rs".to_string()];

    let first_json = first.evaluate(&AlignmentEvidence::complete()).to_json();
    let second_json = second.evaluate(&AlignmentEvidence::complete()).to_json();

    assert_ne!(first_json, second_json);
}

fn aligned_model() -> AgentAlignmentTrainingModel {
    AgentAlignmentTrainingModel::new(
        "Implement one local-only alignment contract",
        "b55f81ecd372ff23a34fcf33c2744706447e14ca",
        AlignmentManager::hermes("hermes-manager"),
        vec![
            AlignmentExecutionAgent::writer_maker(
                "maker-a",
                vec!["src/adapters/agent_alignment.rs".to_string()],
            ),
            AlignmentExecutionAgent::writer_maker(
                "maker-b",
                vec!["tests/agent_alignment.rs".to_string()],
            ),
            AlignmentExecutionAgent::read_only_verifier("verifier-a"),
        ],
    )
}

fn verifier_mut(model: &mut AgentAlignmentTrainingModel) -> &mut AlignmentExecutionAgent {
    &mut model.execution_agents[2]
}
