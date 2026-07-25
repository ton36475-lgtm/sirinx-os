# GHOSTCLAW P101 — Full-Stack Refactor, System Syntax Repair, and Rust Migration

Date: 2026-07-13  
Mission ID: `P101-D22354812-FULLSTACK-REFACTOR-RUST-MIGRATION-20260713`  
Parent decision: `D-22354812`  
Mode: `MAX_LOCAL_AUTONOMY_WITH_HARD_BLOCKS`  
Status: `READY_FOR_LOCAL_REPO_INTAKE`

## 0. Execution lock

P101 turns the broad instruction “repair all system errors, refactor all coding
and syntax, and migrate suitable Python cores to Rust” into a deterministic,
receipt-backed engineering loop.

```text
MAX_LOCAL_AUTONOMY: enabled
SPEC_FIRST: required
ONE_REPO_AT_A_TIME: required
FILE_LEASE: required before source edits
REQUESTER_APPROVER_SEPARATION: required
SAFE_FIX_ROUNDS: max_2
SCHEMA_REPAIR_RETRIES: max_3
PUBLIC_API_PARITY: required for Rust migration
DEPENDENCY_INSTALL_OR_UPGRADE: gated
COMMIT: gated
PUSH_DEPLOY_PRODUCTION: blocked
SECRET_READ_OR_PRINT: blocked
```

Broad permission is interpreted as approval for local-safe engineering, not as a
waiver of production, credential, customer-data, provider-billing, deployment,
or unsafe browser/cyber gates.

## 1. What was executed in the current workspace

The current runtime contains P099 and P100 configuration artifacts, not the
actual GhostClaw/SIRINX source repositories. P101 therefore completed the work
that can be proved locally now and prepared an executable intake/refactor kit for
the real repositories.

Completed now:

1. Enumerated all existing P099/P100 artifacts under `/workspace`.
2. Parsed every existing JSON file successfully.
3. Parsed the existing LiteLLM YAML successfully.
4. Created the P101 policy, schema, A2A packet, command brief, master prompt,
   local quality gate, repository inventory tool, file-lease tool, Python public
   API probe, Rust policy-core scaffold, Python compatibility adapter, golden
   fixture set, and parity harness.
5. Ran Python compilation and unit tests.
6. Found one syntax error in the newly created quality-gate implementation,
   repaired it, and reran the check successfully.
7. Generated a Python API contract snapshot for the policy reference.
8. Validated the sample P101 Rust-migration goal against the Draft 2020-12 JSON
   schema.
9. Ran a static Python/Rust source-contract comparison; all five policy tables,
   policy version, reason codes, and JSON output keys match.
10. Ran a baseline quality gate against `/workspace`; it passed.

Not claimed:

- The user repositories were not mounted in this runtime, so no source file in
  `/Users/sirinx/sirinx-os`, `/Users/sirinx/sirinx-agent-native-os`, or
  `/Users/sirinx/sirinx-co` was inspected or modified here.
- Rust compilation and differential execution were not run because the current
  container has no Rust toolchain. Installing a toolchain would violate the
  no-auto-install gate.
- No commit, push, deploy, provider call, model download, Cloudflare mutation,
  secret access, or live send occurred.

## 2. Architecture adopted from the sovereign blueprint

P101 retains the useful four-layer structure from the supplied sovereign
multi-agent blueprint while applying deterministic gates:

```text
Layer 1 — Model/Worker Plane
  Hermes, Codex, local model lanes, fresh QA reviewer

Layer 2 — Control Plane
  policy classifier, project resolver, file leases, worktree isolation,
  bounded retries, queue state

Layer 3 — Engineering Plane
  repository intake, contract extraction, implementation, language gates,
  behavior parity, local UAT

Layer 4 — Evidence Plane
  append-only events, diffs, hashes, reports, receipts, next-gate decision
```

The orchestration contract is:

```text
Goal
  -> Resolve project and repository
  -> Read governance and locked facts
  -> Baseline repository
  -> Freeze public/data/API contracts
  -> Acquire exact file lease
  -> Implement smallest coherent patch
  -> Run deterministic validators
  -> Run fresh-context QA
  -> Write receipt and patch
  -> Stop at commit gate
```

P101 does not inherit unsafe or unverifiable blueprint claims as executable
policy. “Zero guardrails,” automatic anti-bot evasion, credential attacks,
unbounded loops, automatic production moves, and latency-equals-zero claims are
not acceptance criteria.

## 3. Repository order and project protection

Initial repository candidates:

| Priority | Repository | Project | First pass |
|---:|---|---|---|
| 1 | `/Users/sirinx/sirinx-os` | `GHO` | governance, queue, controller, receipts, Python policy/command cores |
| 2 | `/Users/sirinx/sirinx-agent-native-os` | `GHO` | adapters, LINE dry-run handler, local integration tests |
| 3 | `/Users/sirinx/sirinx-co` | `SRX` | read-only baseline only under P101; production website edits excluded |

All P098 project families remain addressable through the same goal schema:
`GHO`, `SRX`, `AGM`, `KUS`, `PUN`, `ADS`, `AIC`, `LVC`, `RAM`, `HAY`, `PET`,
`LOC`, `TRV`, and `STP`.

Protection rules:

- SIRINX public website and public copy require a separate, exact website gate.
- StoryPro customer-facing artifacts must keep internal cost, reseller margin,
  slip, admin, and backend workflow details out of public content.
- Production data, customer data, live messaging, payments, DNS, and Cloudflare
  resources are outside this packet.

## 4. Canonical full-stack build order

Every implementation packet follows the locked sequence:

```text
00_repo_intake
01_backend_core
02_database_domain_schema
03_service_logic
04_api_contract_freeze
05_api_route_handler
06_api_client_wiring
07_frontend_state_hooks
08_components
09_page_<route>
10_local_uat
11_commit_gate
```

A stage may be marked not applicable, but it may not be silently skipped. The
receipt must state why.

## 5. Error taxonomy and repair loop

| Class | Examples | First deterministic gate | Repair rule |
|---|---|---|---|
| Syntax | malformed Python, shell, JSON, YAML, TOML | AST/parser/bash | smallest syntax-only patch |
| Type/contract | TS types, Python typing, API shape | typecheck/schema/contract snapshot | freeze contract before edit |
| Build | bundler, compiler, module graph | local offline build | no dependency install |
| Test | unit/integration regression | existing local test command | reproduce one failure at a time |
| Runtime | state transition, adapter, timeout | local fixture/smoke test | no external provider by default |
| Data | schema mismatch, serialization drift | JSON Schema/parity fixture | no production migration |
| Governance | unleased edit, self-approval, risky command | policy/lease gate | fail closed |
| Security | secret logging, unsafe browser/cyber behavior | deny list and review | hard stop |

Bounded repair algorithm:

```text
for repair_round in 1..2:
  reproduce narrow failure
  identify root cause
  freeze relevant contract
  lease exact files
  apply smallest coherent patch
  rerun narrow gate
  rerun repository gate
  if pass: stop and review
write blocker receipt after round 2
```

Model confidence never overrides deterministic failure or policy.

## 6. Language quality matrix

### Python

- Parse every `.py` file with the AST without importing it.
- Run `compileall`, `ruff`, `mypy`, and `pytest` only when present/configured.
- Do not read `.env`, credential, or secret paths.
- Extract public names and signatures before Rust migration.

### JavaScript and TypeScript

- Read `package.json` scripts.
- Run existing `typecheck`, `lint`, `test`, and `build` scripts only when local
  dependencies already exist.
- Do not run scripts containing deploy, publish, remote shell, destructive, or
  Cloudflare mutation patterns.
- Do not install or upgrade packages automatically.

### Go

- Use `gofmt -l` for non-mutating format detection.
- Run `go vet ./...` and `go test ./...` with `GOPROXY=off`.
- Missing module-cache dependencies become a blocker, not a reason to use the
  network automatically.

### Rust

- Use `cargo fmt --check`.
- Use `cargo clippy --offline --all-targets --all-features -- -D warnings`.
- Use `cargo test --offline --all`.
- Preserve Python behavior first; optimize only after parity.

### Shell and configuration

- Run `bash -n` and `shellcheck` when available.
- Strictly parse JSON, YAML, and TOML.
- Record file/line/column only; do not print sensitive file contents.

## 7. File lease and concurrency model

P101 includes `tools/p101/scripts/file_lease.py`.

A lease must contain:

- goal ID
- repository absolute path
- worker/owner agent
- distinct approver agent
- exact include patterns
- explicit excludes
- acquisition and expiration timestamps

The lease tool rejects broad patterns such as `*`, `**`, `/`, and parent-path
traversal. It detects overlapping active leases using normalized path prefixes.
Only the owner or approver can release a lease.

Recommended defaults:

```text
lease duration: 60–90 minutes
one active lease per worker
one repository per packet
no shared mutable CWD between coder workers
fresh worktree for concurrent branches
```

## 8. Rust migration protocol

P101 uses a Rust-first core with a Python compatibility boundary:

```text
SPEC_INTAKE
  -> CONTRACT_EXTRACT
  -> STRATEGY_DESIGN
  -> FILE_LEASE_APPROVAL
  -> IMPLEMENT
  -> VALIDATE
  -> REVIEW
  -> HUMAN_DECISION
  -> PUSH_DEPLOY
```

The loop stops at `HUMAN_DECISION`. `PUSH_DEPLOY` is never inferred from broad
permission.

Before Rust coding, record:

- input and output schemas
- public function/class names and signatures
- default values
- exception/error behavior
- ordering guarantees
- serialization shape
- side effects
- timeout and cancellation behavior
- representative and edge-case fixtures

Implementation requirements:

- idiomatic ownership and borrowing
- minimal cloning
- `Result<T, E>` for fallible operations
- no premature optimization
- deterministic serialization
- explicit semantic-difference notes
- regression and differential tests against Python

Compatibility boundaries supported by the P101 schema:

| Boundary | Use |
|---|---|
| `CLI_JSON` | lowest-risk staged migration; subprocess + frozen JSON |
| `PYTHON_EXTENSION` | in-process performance after parity and packaging gate |
| `HTTP_LOCAL` | service isolation for larger cores |
| `FFI_C_ABI` | narrow ABI only when ownership/error rules are fully specified |

## 9. First Rust migration artifact created

P101 includes a dependency-free Rust policy core:

```text
tools/p101/rust/ghostclaw-policy-core/
```

It migrates the deterministic A/B/C/D/X action classifier shape first. This is
consistent with the existing Rust migration direction: command, policy, and
receipt contracts are safer first targets than external execution adapters.

Public Python compatibility function:

```python
classify_action(action: str) -> dict[str, object]
```

Frozen response keys:

```text
policy_version
action
tier
allow_local
requires_named_gate
hard_blocked
reason_code
matched_pattern
```

The Python adapter uses the Rust CLI only when
`GHOSTCLAW_POLICY_RUST_BIN` points to a compiled binary. If Rust is configured
and fails, the adapter raises and stops; it does not silently fall back and hide
a migration defect.

Current evidence:

- Python unit tests: passed
- Python AST public contract: generated
- static Python/Rust policy tables: matched
- Rust compile/test: pending toolchain on the target host
- runtime differential parity: pending compiled binary

Known semantic risks:

- Python and Rust Unicode lowercasing can diverge for non-ASCII text; current
  policy phrases are ASCII.
- CLI process/JSON failures do not exist in an in-process Python function.
- Pattern order is behavior-significant.

## 10. Local toolkit

Files:

```text
tools/p101/run_p101_local.sh
tools/p101/scripts/repo_inventory.py
tools/p101/scripts/local_quality_gate.py
tools/p101/scripts/public_api_probe.py
tools/p101/scripts/file_lease.py
tools/p101/scripts/static_policy_contract_check.py
tools/p101/scripts/run_policy_parity.py
tools/p101/python/reference_policy.py
tools/p101/python/ghostclaw_policy_adapter.py
tools/p101/rust/ghostclaw-policy-core/
tools/p101/fixtures/
```

Read-only first run:

```bash
./tools/p101/run_p101_local.sh
```

Single repository baseline:

```bash
python3 tools/p101/scripts/local_quality_gate.py \
  --repo /Users/sirinx/sirinx-os \
  --profile baseline \
  --json-output reports/mission/P101_GHO_BASELINE.json \
  --markdown-output reports/mission/P101_GHO_BASELINE.md
```

Full offline gate after baseline review:

```bash
python3 tools/p101/scripts/local_quality_gate.py \
  --repo /Users/sirinx/sirinx-os \
  --profile full \
  --json-output reports/mission/P101_GHO_FULL_GATE.json \
  --markdown-output reports/mission/P101_GHO_FULL_GATE.md
```

## 11. Agent topology

| Role | Responsibility | May approve own work |
|---|---|---:|
| CommandHermes | goal resolution, queue, state, receipt | no |
| Contract agent | API/data/public contract snapshot | no |
| Codex builder | scoped implementation under lease | no |
| Compile/test worker | deterministic local checks | no |
| Fresh QA reviewer | findings-first independent review | no |
| Gatekeeper | evaluates evidence and names next gate | no |

The reviewer receives the goal, contract, diff, and validator results, not the
builder’s entire chain of context.

## 12. Evidence pack

Every repository packet must produce:

```text
intake.json
baseline_report.json
baseline_report.md
contract_snapshot.json
refactor_plan.md
validation_report.json
changed_files.md
patch.diff                       # when edits exist
rust_migration_manifest.json     # when applicable
parity_report.json               # when applicable
receipt.md
```

Receipt minimum fields:

- mission, goal, project, repo, branch, HEAD
- requester and approver agents
- lease ID and scope
- exact changed files
- commands and exit codes
- before/after failure evidence
- tests skipped and reasons
- hashes of generated artifacts
- blocked actions
- residual risks
- stage reached
- next named gate

## 13. Hard blocks

Always blocked under P101:

- git push
- production deploy
- DNS or Cloudflare mutation
- R2/D1/KV writes
- webhook activation
- secret read or print
- model download
- GPU live work
- live LINE, Telegram, or email send
- CRM/customer writes
- payment mutation
- production database migration
- rollback execution
- anti-bot bypass or Cloudflare/Queue-It evasion
- unauthorized interception
- credential or password attack
- logged-in social scraping or PII harvesting
- unauthorized third-party pixel cloning
- destructive delete
- `chmod 777`
- `git add .` or `git add -A`

## 14. Completion criteria

A repository is locally complete only when:

1. Intake and baseline evidence exist.
2. Scope and public contracts are frozen.
3. All edits are inside a valid lease.
4. Deterministic gates pass, or exact blockers are recorded after two repair
   rounds.
5. Rust callers are not switched before differential parity passes.
6. A fresh reviewer reports no unresolved critical finding.
7. Changed-file summary and receipt are complete.
8. The loop stops at `COMMIT_GATE`.

## 15. Next safe command

```text
RUN_P101_LOCAL_REPO_INTAKE_AND_BASELINE
SCOPE: /Users/sirinx/sirinx-os, /Users/sirinx/sirinx-agent-native-os, /Users/sirinx/sirinx-co
ALLOW: read-only repo/git metadata; offline syntax/config/format checks; reports and receipts
BLOCK: dependency install, source edit, commit, push, deploy, secrets, provider calls, production mutation
OUTPUT: reports/mission/p101_local/
```
