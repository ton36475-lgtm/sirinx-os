# 07 - AI Video Editing Pipeline Grid

Status: product workflow blueprint, publish blocked

```mermaid
flowchart LR
  RAW["Raw video clips"] --> INGEST["Upload / ingest"]
  INGEST --> ANALYZE["AI analysis"]
  ANALYZE --> TRANSCRIBE["Transcribe speech"]
  TRANSCRIBE --> SUB["Generate subtitles"]
  TRANSCRIBE --> CUT1["Cut dead air"]
  TRANSCRIBE --> CUT2["Cut mistakes"]
  TRANSCRIBE --> CUT3["Cut unclear speech"]
  SUB --> STYLE["Apply creator style memory"]
  CUT1 --> STYLE
  CUT2 --> STYLE
  CUT3 --> STYLE
  STYLE --> ASSETS["Template packs: titles / subtitles / lower thirds / frames / animation"]
  ASSETS --> EXPORT["Edited clip with subtitles"]
  EXPORT --> REVIEW["Human review"]
  REVIEW --> PUBLISH["Publish only after approval"]
```

## Definition Of Done

- Raw video, transcript, subtitles, cuts, and style memory are separate artifacts.
- Export is local until human review approves publishing.
- Course or price copy is treated as marketing draft, not verified product claim.

