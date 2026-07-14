# Hermes-Codex Integration Test Suite

## Ownership

Runtime tests live beside the Rust crates under `crates/*/src/` so `cargo test
--workspace --all-targets` exercises the code that will be built for Workers.

Repository-level queue and packet guards remain canonical under
`WORKSPACE_SCAFFOLD/tests/`. They validate repository artifacts, not the
Cloudflare Worker runtime, and are intentionally not duplicated here.

## Run Tests

```bash
cargo test --manifest-path services/orchestrator/Cargo.toml --workspace --all-targets
python3 -m unittest \
  WORKSPACE_SCAFFOLD.tests.test_codex_hermes_execution_queue \
  WORKSPACE_SCAFFOLD.tests.test_hermes_a2a_codex_sync_all_jobs_packet \
  -v
```

## Workflow Reference

See `docs/scaffolds/HERMES_CODEX_MESH_WORKFLOW.md` for the execution and gate
boundaries.
