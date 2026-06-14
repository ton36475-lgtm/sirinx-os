# Repo Analysis Grid: Superpowers + FreeDomain

Status: LOCAL-ONLY ANALYSIS

Scope: Apply the uploaded video-analysis prompt structure to repository analysis for `obra/superpowers` and `DigitalPlatDev/FreeDomain`.

## Repo Learning Flow

```mermaid
flowchart TB
  I["Input: repo URL + focus"] --> V["Verify public source"]
  V --> O["Overview"]
  V --> K["Key takeaways"]
  V --> D["Deep dive"]
  V --> A["Actionable applications"]
  V --> R["Risk matrix"]
  V --> M["Mermaid summary"]
  V --> S["SIRINX integration decision"]

  S --> G{"Gate type"}
  G -->|docs only| OK["Record to docs and Obsidian"]
  G -->|repo clone| C["APPROVE_AGENT_REPO_LAB_CLONE"]
  G -->|public domain| E["APPROVE_EXTERNAL_DOMAIN_STAGING"]
  G -->|runtime install| X["Blocked until repo-specific install approval"]
```

## Integration Topology

```mermaid
flowchart LR
  subgraph Methodology["Methodology layer"]
    SP["obra/superpowers"]
    SP1["Planning"]
    SP2["TDD"]
    SP3["Systematic debugging"]
    SP4["Verification before completion"]
  end

  subgraph SIRINX["Private SIRINX node"]
    H["Hermes TUI"]
    O["Obsidian memory"]
    V["Validator Shield"]
    N["n8n/MCP local APIs"]
  end

  subgraph PublicStage["External staging layer"]
    FD["DigitalPlatDev/FreeDomain"]
    CF["Cloudflare Tunnel / Zero Trust"]
    PRE["Non-sensitive preview"]
  end

  SP --> SP1 --> H
  SP --> SP2 --> H
  SP --> SP3 --> H
  SP --> SP4 --> V
  H --> O
  H --> N
  N --> CF
  CF --> FD
  FD --> PRE
  PRE --> V
```

## Decision Grid

| Component | Adopt now | Why |
| --- | --- | --- |
| Repo-analysis prompt template | yes | docs-only, high leverage |
| Superpowers methodology | yes | aligns with existing SIRINX guardrails |
| Superpowers clone/install | no | unnecessary until repo-lab approval |
| FreeDomain as staging option | yes, as candidate | useful for disposable non-sensitive preview |
| FreeDomain as production domain | no | continuity and trust risk |
| Public tunnel | no | external gate required |

## Stop Rule

Repository analysis is allowed. Clone, install, domain registration, Cloudflare tunnel setup, DNS changes, public exposure, or webhook/callback registration requires a separate exact approval.
