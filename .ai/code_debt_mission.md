# Code Debt Remediation Mission - Nested JSON Repair
# Dispatch this to Hermes/OpenCode agent team

## Mission Brief

**Goal**: ซ่อมแซมโครงสร้างหนี้โค้ดและล้างบั๊ก nested JSON ทั้งหมดใน sirinx-os

**Target**: 34 JSON files with potential bracket mismatches

**Agent Team Required**:
1. **Architect Agent** - Analyze dependency impact before changes
2. **Coder Agent (DeepSeek V4 Pro)** - Execute JSON structure repairs
3. **Tester Agent** - Validate JSON/YAML syntax after changes
4. **Reviewer Agent** - Verify no data loss in repairs

## Process
[TRIAGE] Analyze scope → [MAKER] Fix JSON → [CHECKER] Validate → [GUARD] Commit with chain hash

## Files to Scan
See `/Users/sirinx/sirinx-os/tests/full_activation_evidence.json` for scan results

## Verification Requirements
- `json.loads()` must pass on all repaired files
- Nested structure must be preserved
- Evidence chain logged to SQLite state