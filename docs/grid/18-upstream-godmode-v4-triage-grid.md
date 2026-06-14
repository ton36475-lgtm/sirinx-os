# Upstream Godmode v4 Triage Grid

Status: LOCAL-ONLY TRIAGE

Scope: Validate an upstream AI Company Godmode v4 report before accepting it into SIRINX local truth.

## Triage Flow

```mermaid
flowchart TB
  U["Upstream AI Company report"] --> V["Local verification"]
  V --> P1["Check /root/project-hermes"]
  V --> P2["Check /Users/sirinx/project-hermes"]
  V --> P3["Search claimed files"]
  V --> P4["Search local skills"]

  P1 --> R{"Evidence found?"}
  P2 --> R
  P3 --> R
  P4 --> R

  R -->|no| T["Treat as transcript, not local truth"]
  R -->|yes| I["Inspect files read-only"]

  T --> D["Create triage report"]
  D --> G["Update grid and state"]
  G --> B["Keep install/clone/run blocked"]

  I --> S["Secret and manifest scan"]
  S --> A{"Approval exists?"}
  A -->|no| B
  A -->|yes| C["Proceed to exact approved action only"]
```

## Claim Classification

| Upstream claim | Local state | Decision |
| --- | --- | --- |
| `~/project-hermes` created | not found | do not rely on it |
| `install-all-repos.sh` created | not found | do not run |
| `swarm_v3.py` tested | not found | unverified |
| A2A cards created | not found | unverified |
| `sirinx-godmode-v4` skill created | not found locally | unverified |
| n8n / llama / gateway commands ready | not run | keep blocked |

## Corrected A2A Card Note

```mermaid
flowchart LR
  A["A2A Agent"] --> B["Agent Card"]
  B --> C["Current official recommended well-known URI"]
  C --> D["/.well-known/agent.json"]
  B --> E["Declare protocolVersion, name, description, url"]
  B --> F["Declare skills, capabilities, auth, transports"]
```

## Safe Command Ladder

```mermaid
stateDiagram-v2
  [*] --> TranscriptOnly
  TranscriptOnly --> LocalTriageReport
  LocalTriageReport --> SkillDraftApproval: if operator wants local skill
  LocalTriageReport --> RepoCloneApproval: if operator wants repo lab
  SkillDraftApproval --> DraftSkill: APPROVE_IMPLEMENTATION for local sirinx-godmode-v4 skill draft
  RepoCloneApproval --> ShallowClone: APPROVE_AGENT_REPO_LAB_CLONE for vendor/agent-lab metadata-only shallow clone
  ShallowClone --> ManifestReview
  ManifestReview --> InstallBlocked
  DraftSkill --> Validation
  Validation --> [*]
  InstallBlocked --> [*]
```

## Stop Rule

Do not run broad installer blocks from upstream transcripts. Convert them into local approval packets first.
