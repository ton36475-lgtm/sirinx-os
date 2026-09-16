# GhostClaw External Agent Tooling Addendum V1.3

Status: `CLASSIFIED / POLICY-GATED / READY_FOR_REGISTRY`
Mission ID: `GC-EXTERNAL-AGENT-TOOLS-V1-3-20260630-001`

## Scope

This addendum registers three external repositories as policy-gated references:

- `decolua/9router`
- `apurvsinghgautam/robin`
- `msitarzewski/agency-agents`

It does not install, execute, clone, connect providers, access dark-web
resources, call LLM providers, read secrets, deploy, push, or mutate production
systems.

## Architecture Update

```mermaid
flowchart TD
    H["Hermes Control Plane"] --> P["Policy Guardian"]
    P --> R["Receipt Gate"]
    R --> C["Codex Build Lane"]
    R --> O["OpenCode Review Lane"]
    R --> V["Validator Lane"]
    R --> U["Browser Local UAT Lane"]
    R --> M["Model Router Lane: 9router"]
    R --> T["Defensive OSINT Lane: Robin"]
    R --> A["Agent Roster Registry Lane: agency-agents"]
    M --> M1["Provider Routing Policy"]
    M --> M2["Credential Isolation"]
    M --> M3["No Paid Call Gate"]
    T --> T1["Lawful OSINT Policy"]
    T --> T2["Report Template Only"]
    T --> T3["No Dark-Web Execution by Default"]
    A --> A1["Agent Taxonomy"]
    A --> A2["Role Adapter"]
    A --> A3["No Blind Install"]
    V --> R
```

## Tool Registry

| Tool | Lane | Gate | Allowed Use | Blocked Use |
| --- | --- | --- | --- | --- |
| 9router | Model Router / Provider Gateway | Yellow/Red | local router research, provider abstraction draft, fallback policy design | storing secrets, provider ToS bypass, automatic paid calls, multi-account abuse |
| Robin | Defensive OSINT / Threat Intel | Red | lawful report template, risk matrix, offline synthetic workflow | dark-web crawling, credential discovery, leaked data handling, de-anonymization |
| agency-agents | Agent Roster / Persona Registry | Green/Yellow | read-only taxonomy, role templates, GhostClaw adapter | blind install, script execution, imported tool override |

## Final Integration Verdict

- 9router: add as Model Router Gateway candidate, do not connect provider keys.
- Robin: add as Defensive OSINT report-only reference, execution disabled.
- agency-agents: add as Agent Roster Registry reference, curated import only.
- Policy Guardian remains above all three tools.
