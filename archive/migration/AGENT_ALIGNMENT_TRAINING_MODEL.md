# Agent Alignment Training Model

## Purpose

`AgentAlignmentTrainingModel` is an A1 deterministic policy contract. “Training”
means training the team topology and its receipts to follow one bounded contract;
it is not ML fine-tuning. The adapter performs no provider calls, process
execution, network access, file I/O, live action, or external action.

Every evaluation binds the whole team to one objective and one base commit.
Hermes is the sole manager authority and is represented outside the execution
agent list.

## Canonical topology

| Rule | Contract |
|---|---|
| Manager | Exact authority token `hermes`; separate from worker count |
| Execution agents | At most 3 |
| Makers | At most 2; writer-only; at least one owned path each |
| Verifiers | At least 1 independent read-only verifier with no writer ownership |
| Identity | Non-empty ids unique across manager, makers, and verifiers |
| Roles | Exactly one of `maker` or `verifier` per execution agent |
| Effects | Global, manager, and execution-agent live/external flags are all `false` |
| Evidence | Required check names and receipt fields are derived by the contract |

This topology supports the canonical three-worker team: two disjoint writer
makers plus one independent verifier. The Hermes manager does not consume a
worker slot.

## Writer-scope rules

Owned paths are repo-relative literal scopes. The evaluator:

- rejects empty, absolute, backslash, traversal, glob, and repository-root scopes;
- rejects whitespace padding, redundant `.` segments, and repeated separators;
- rejects exact and normalized-equivalent duplicates;
- rejects ancestor/descendant ownership, including overlap within one maker.

Literal paths are intentional. Glob expansion and filesystem resolution would
make this pure policy model depend on ambient state.

## Derived evidence

Call `AgentAlignmentTrainingModel::required_check_names()` and
`required_receipt_field_names()` to inspect the versioned requirements.
`AlignmentEvidence::complete()` creates a complete local test fixture from those
derived names. Callers report observed names to `evaluate`; they do not define
the required schema.

An evaluation blocks when any derived check or receipt field is absent.

## Stable issue codes

| Code | Meaning |
|---|---|
| `agent_dual_role` | One worker claimed maker and verifier roles |
| `agent_external_actions_enabled` | A worker enabled external actions |
| `agent_id_missing` | A worker id was empty |
| `agent_live_execution_enabled` | A worker enabled live execution |
| `agent_role_missing` | A worker had no role |
| `base_commit_missing` | Shared base commit was empty |
| `duplicate_agent_id` | Manager/worker id uniqueness failed |
| `duplicate_agent_role` | A worker repeated a role |
| `execution_agent_limit_exceeded` | More than three workers were configured |
| `global_external_actions_enabled` | Global external actions were enabled |
| `global_live_execution_enabled` | Global live execution was enabled |
| `independent_verifier_missing` | No distinct safe verifier was present |
| `maker_limit_exceeded` | More than two makers were configured |
| `maker_not_writer` | A maker was marked read-only |
| `maker_owned_paths_missing` | A maker had no owned writer paths |
| `maker_path_scope_absolute` | A writer scope was absolute |
| `maker_path_scope_broad_root` | A writer scope resolved to repo root |
| `maker_path_scope_empty` | A writer scope was empty |
| `maker_path_scope_glob` | A writer scope used glob syntax |
| `maker_path_scope_non_portable` | A writer scope used backslashes |
| `maker_path_scope_non_canonical` | A writer scope was not exact canonical form |
| `maker_path_scope_overlap` | Normalized writer scopes overlapped |
| `maker_path_scope_traversal` | A writer scope used `..` traversal |
| `manager_authority_not_hermes` | Authority was not byte-exact `hermes` |
| `manager_external_actions_enabled` | Manager external actions were enabled |
| `manager_id_missing` | Manager id was empty |
| `manager_live_execution_enabled` | Manager live execution was enabled |
| `objective_missing` | Shared objective was empty |
| `receipt_field_missing` | A derived receipt field was absent |
| `required_check_missing` | A derived check was absent |
| `verifier_has_owned_paths` | A verifier claimed writer ownership |
| `verifier_not_read_only` | A verifier had write permission |

Issues are deduplicated and sorted by code. `to_json()` emits compact JSON with
fixed field order, sorted execution-agent ids, complete sorted assignment
snapshots (roles, read-only status, exact paths, and effect flags), stable
requirement order, sorted missing evidence, and sorted issues. The fixture at
`tests/fixtures/agent_alignment/aligned_report.json` pins the happy-path
contract.

## Safety boundary

An `aligned` report is evidence that this local configuration satisfies the
model. It is not authority to start agents, call providers, write outside
declared paths, execute live work, send external messages, commit, push, or
deploy.
