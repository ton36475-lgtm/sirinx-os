# 10 - Risk / Verification Grid

Status: governance grid

```mermaid
flowchart LR
  INPUT["Any claim / tool / workflow"] --> CLASSIFY{"Claim Type"}
  CLASSIFY -->|"Observed"| OBS["Local command / official source / current evidence"]
  CLASSIFY -->|"Template"| TEMPLATE["Layout / placeholder / demo copy"]
  CLASSIFY -->|"Blocked"| BLOCK["Requires approval or missing evidence"]
  CLASSIFY -->|"Unverified"| RESEARCH["Research signal only"]

  OBS --> ALLOW["Can enter docs as fact"]
  TEMPLATE --> LABEL["Must label as template"]
  BLOCK --> STOP["Stop before external effect"]
  RESEARCH --> VERIFY["Verify before business decision"]

  STOP --> APPROVAL["Human approval packet"]
```

## Definition Of Done

- Claims must be labeled before they enter docs, dashboards, or reports.
- Unverified social claims cannot drive architecture decisions.
- Blocked actions stop at approval packet.

