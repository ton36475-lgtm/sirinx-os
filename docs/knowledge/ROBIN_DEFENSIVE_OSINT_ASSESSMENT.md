# Robin Defensive OSINT Assessment

Tool: `apurvsinghgautam/robin`
Lane: `DEFENSIVE_OSINT_THREAT_INTEL`
Default Gate: `RED`
Execution Default: `disabled`

## Capability Snapshot

Operator-provided source summary describes Robin as an AI-powered dark web OSINT
tool with LLM-assisted query refinement, result filtering, investigation
summary, Streamlit UI, Docker-ready mode, and reporting.

Fresh primary-source verification was not executed in this packet. Before any
expanded use, re-check the upstream README, license, and safety disclaimers.

## GhostClaw Fit

Allowed as:

- lawful OSINT runbook reference
- redacted report template
- threat intel dashboard schema input
- source-risk classification model
- incident report format

Blocked:

- dark-web crawling execution
- Tor search execution
- credential collection
- leaked database handling
- marketplace search
- de-anonymization
- private person data collection
- storing raw dark-web content in GhostClaw memory

## Verdict

Add as a report-only Defensive OSINT lane. Keep execution disabled until a
case-specific lawful authorization record and analyst manual gate exist.
