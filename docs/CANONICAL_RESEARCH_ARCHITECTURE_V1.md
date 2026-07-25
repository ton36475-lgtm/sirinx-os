# CANONICAL RESEARCH ARCHITECTURE V1 — LOCKED
## AGY Research Plane × GLM-5.2 Red-Team Critic

**Status:** LOCKED_BY_OWNER_REQUIREMENT
**Date:** 2026-07-17
**Supersedes:** All prior AGY/GLM assumptions
**Lock Authority:** Owner directive + hardware validation

---

## Architecture Lock

```yaml
google_research_plane:
  engine: AGY_Antigravity + Gemini Deep Research
  purpose:
    - Google Drive recursive inventory (READ_ONLY)
    - Google Search grounding
    - URL and document analysis
    - Cited research synthesis
  permissions:
    google_drive: READ_ONLY
    google_search: ALLOW
    url_context: ALLOW
    code_execution: METADATA_AND_ANALYSIS_ONLY
    gmail: DENY
    google_chat: DENY
    calendar: DENY
    drive_write: DENY
    drive_delete: DENY

redteam_knowledge_plane:
  model_family: GLM-5.2
  artifact_format: GGUF
  source_policy: HUGGING_FACE_ONLY
  official_owner: ZAI_NOT_GOOGLE
  uncensored_variant: UNTRUSTED_THIRD_PARTY
  role: OFFLINE_REDTEAM_CRITIC_ONLY
  mac_mini_m2_runtime: HARDWARE_BLOCKED
  network_access: false
  shell_access: false
  tool_access: false
  credentials: false
  input: REDACTED_EVIDENCE_PACK_ONLY
  output: HYPOTHESES_AND_CRITIQUE_ONLY

final_authority:
  type: SOURCE_EVIDENCE_AND_DETERMINISTIC_VALIDATION
  trust_model_output_directly: false
```

## GLM-5.2 Hardware Reality

| Spec | Value | Mac Mini M2 |
|------|-------|-------------|
| Full model | 753B params | ❌ |
| GGUF size | ~307 GB | ❌ |
| Required RAM/VRAM | ~310 GB | ❌ |
| Mac Mini M2 RAM | 8 GB | HARDWARE_BLOCKED |
| M2 Pro max | 32 GB | ❌ STILL BLOCKED |

**Conclusion:** GLM-5.2 full GGUF cannot run on Mac Mini M2. Use OmniRoute API (GLM-5.2 via Z.ai) as online critic, or wait for trusted large-memory node.

## CEH v13 Drive Corpus — Verified

```yaml
drive_connector: VERIFIED
root_folder: "01.ECS-CEH V13 AI Powered Official"
root_folder_id: "14jjSnprC7AxqPCo8pl6hDZYtg8tuehs-"

pdf_inventory:
  modules_01_20: COMPLETE (22 PDFs)
  text_layer: CORRUPTED_BY_WATERMARK
  extraction_method: RAW_PDF_PARSING_NOT_TEXT_LAYER

video_inventory:
  modules_00_20: COMPLETE (21 videos)
  transcription: NOT_STARTED

lab_archives:
  zip_iso_count: 8+ (some >1.4 GB)
  execution_authorized: false
  processing: METADATA_AND_HASH_ONLY

prerequisites:
  count: 13+ groups
  includes: Java, JDK 21, MSSQL, Python, WinRAR, WampServer
```

## Production Research Flow

```
Google Drive / Search / Official Sources
         │
         ▼
   AGY Deep Research (READ_ONLY)
         │
    cited source pack
         │
         ▼
   Sanitizer + Copyright-safe Extractor
   ├─ remove credentials
   ├─ remove personal data
   ├─ hash every source
   └─ attach page/timestamp
         │
         ▼
   GLM-5.2 Red-Team Critic (via OmniRoute API)
   ├─ challenge assumptions
   ├─ identify research gaps
   ├─ identify defensive blind spots
   └─ propose verification questions
         │
         ▼
   Deterministic Evidence Validator
   ├─ source-file verification
   ├─ page/timestamp verification
   ├─ cross-source consistency
   └─ safety classification
         │
         ▼
   GhostClaw Knowledge Repository
```

## Output Contract (14 deliverables)

| # | File | Format |
|---|------|--------|
| 00 | research_receipt | JSON |
| 01 | recursive_drive_inventory | JSONL |
| 02 | folder_tree | MD |
| 03 | pdf_page_index | JSONL |
| 04 | video_timestamp_index | JSONL |
| 05 | lab_archive_risk_register | CSV |
| 06 | module_01_20_knowledge_synthesis | MD |
| 07 | defensive_redteam_matrix | CSV |
| 08 | mitre_owasp_nist_cis_crosswalk | CSV |
| 09 | tools_and_technologies_catalog | CSV |
| 10 | claim_evidence_ledger | JSONL |
| 11 | conflicts_and_outdated_material | MD |
| 12 | glm52_redteam_critique | JSON |
| 13 | final_verified_research_report_th | MD |
| 14 | ghostclaw_knowledge_ingestion_pack | JSONL |

## Next Stage

```yaml
phase: RECURSIVE_INVENTORY_AND_HASH_LEDGER
model_inference_before_inventory_completion: BLOCKED
```

Correct sequence: inventory complete → PDF/video extraction → GLM-5.2 critic (after gates)
