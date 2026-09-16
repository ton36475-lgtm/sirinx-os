# APPROVAL_REQUEST.md
# Need permission to run workspace checks

## Requested Commands
```bash
# Verify all crates
cargo check --workspace

# Test core crate specifically
cargo test -p ghostclaw-core --no-fail-fast

# Build WASM target
cargo build --target wasm32-unknown-unknown --workspace
```

## Safety Note
- No secrets will be read
- Only compile/verification commands
- Results written to research/ folder

## Approval Status
⏸ AWAITING explicit approval to proceed