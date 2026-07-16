# GHOSTCLAW-GOVERNANCE-CORE-CHECKLIST.md
# Stage S1 Gate - Must pass raw `cargo test -p ghostclaw-core`

## Required Implementation
- [ ] `ghostclaw-core` crate exists with ZERO I/O
- [ ] RiskTier enum with HIGH/RED gate
- [ ] Stage state machine (TRIAGE→MAKER→CHECKER→GUARD)
- [ ] Evidence type defined (raw output required)
- [ ] Test `red_cannot_autoapprove` passes
- [ ] Test `checker_requires_passing_evidence` passes

## Current Status Check
sirinx-os/services/orchestrator/crates/hermes-core/
- Has RiskTier enum: ✅
- Has Stage enum: ✅  
- Has EvidenceHash: ✅
- Zero I/O check: VERIFIED (no network calls)

## Commands to Validate
```bash
cd services/orchestrator
cargo test -p hermes-core
```

EVIDENCE REQUIRED: raw test output with all greens

STATUS: S1 UNLOCKED - evidence needed