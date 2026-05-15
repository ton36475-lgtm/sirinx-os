# SIRINX Self-Learning Timeline

Status: Level 1 documentation artifact
Scope: SIRINX OS local knowledge, policy, and review loops
Runtime impact: none

## Purpose

This timeline defines how SIRINX OS moves from manual operator memory to controlled self-learning artifacts. It does not grant agents new runtime authority, production access, deployment rights, or secret access.

Self-learning in this repository means creating reviewed summaries, patterns, policies, and evaluation notes that help future work become more repeatable. It does not mean autonomous code mutation, autonomous deployment, unreviewed memory ingestion, or raw chat storage.

## Level 0: Manual Baseline

Level 0 is the starting state.

- The operator provides goals, constraints, and approval.
- Codex inspects the repository, follows `AGENTS.md`, and reports findings.
- Knowledge exists mainly in human instructions, runbooks, and task summaries.
- Changes require explicit human direction.
- No self-learning artifacts are treated as policy unless reviewed.

## Level 1: Structured Self-Teaching

Level 1 adds controlled documentation and policy artifacts.

- Codex may summarize lessons from completed work into approved files.
- Lessons must be written as concise patterns, failures, prevention rules, and next goals.
- Raw chat logs are not allowed as memory.
- Secret values, `.env` contents, credentials, customer private data, and tokens are never copied into learning files.
- Level 1 work is limited to documentation, policy, council, and memory-candidate files.
- No source code, runtime configuration, migrations, production infrastructure, or external systems may be changed as part of Level 1.

## Level 1 Artifact Set

The Level 1 artifact set is:

- `docs/knowledge/SIRINX_SELF_LEARNING_TIMELINE.md`
- `docs/knowledge/LEVEL_1_SELF_TEACHING_LOOP.md`
- `brain/self-learning/agent-lessons.md`
- `brain/self-learning/successful-patterns.md`
- `brain/self-learning/failed-patterns.md`
- `councils/learning-council.yaml`
- `policies/self-learning-policy.yaml`
- `policies/timeline-commit-policy.yaml`

## Level 1 Review Gates

Every Level 1 learning update must pass these checks before commit:

1. The changed files are inside the allowed Level 1 paths.
2. No source code or runtime configuration changed.
3. No secret files were read or summarized.
4. No secret-like values appear in the diff.
5. Markdown files are readable and do not contain raw chat logs.
6. YAML files parse successfully with existing local tools.
7. The final report includes changed files, validation performed, risks, and commit readiness.

## Level 2: Self-Evaluation Goals

Level 2 may add evaluation documents derived from Level 1 artifacts. The next target files are expected to include:

- `docs/knowledge/LEVEL_2_SELF_EVALUATION.md`
- `docs/knowledge/SUCCESS_PATTERNS.md`
- `docs/knowledge/FAILED_PATTERNS.md`
- `docs/knowledge/AGENTS_RULE_PROPOSALS.md`
- `brain/self-learning/evaluation-scorecard.md`

Level 2 must remain documentation-only until the operator explicitly approves a broader scope.

## Evidence Rules

Allowed evidence includes:

- Repository paths.
- Commit hashes.
- Test names and command names.
- Human-approved summaries.
- Diff summaries.
- Risk and mitigation notes.

Forbidden evidence includes:

- Raw chat transcripts.
- `.env` values.
- API keys, credentials, tokens, cookies, private keys, or passwords.
- Customer private data unless explicitly sanitized and approved.
- Screenshots or logs containing private data.

## Timeline Control Statement

Level 1 self-learning is approved only as a documentation and policy layer. It improves repeatability and review quality without changing runtime behavior.
