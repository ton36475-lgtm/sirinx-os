# GHOSTCLAW Agency Team Structure
# Adapted from Agency Agents - Selective Import for SIRINX OS

This folder contains GhostClaw-adapted agency personas. Each agent follows the Agency pattern but is customized for SIRINX OS governance.

## Teams Imported

| Agent | Source | Adaptation Notes | Role |
|-------|--------|-----------------|------|
| `engineering-agent.md` | Agency/ECC | +GhostClaw security rules, +Semgrep gate | Architecture, code review, refactor planning |
| `security-agent.md` | Agency/Anthropic Cybersecurity | +GBrain threat model, +SkillSpector pre-scan | Security review, incident response, compliance |
| `product-agent.md` | Agency | +claim safety, +SIRINX OS focus | Product strategy, offer framing, feature prioritization |
| `technical-writer.md` | Agency | +100% docs-only output, +redaction policy | SOPs, prompt libraries, decision frameworks |

## Agent Capabilities Matrix

| Agent | Read Files | Write Files | Run Commands | Approve Gates | Notes |
|-------|------------|-------------|--------------|---------------|-------|
| Engineering | ✅ | ✅ (receipted) | ✅ (dry-run) | ❌ | Must use Semgrep gate after code mutations |
| Security | ✅ | ✅ (receipted) | ❌ | ❌ | Read-only analysis, threat modeling only |
| Product | ✅ | ✅ (docs-only) | ❌ | ❌ | No guaranteed ROI claims, uses Solar policy |
| Technical Writer | ✅ | ✅ (docs-only) | ❌ | ❌ | 100% output is Markdown/JSON in /intellectual-assets |

## Model Budget Lock

- Default route: DeepSeek / GLM / Kimi class models.
- Fable5 route: only for explicit high-level architecture, strategy, or founder-level decision gates.
- Never run fable5 for polling, routine summaries, formatting, repeated status checks, or bulk docs.

## Security Requirements Before Using Any Agent

1. Run SkillSpector on source repo before import
2. Never import agents that read `.env` or secrets by default
3. Never import agents with `rm -rf`, `curl | bash`, or shell injection patterns
4. Always add GhostClaw redaction rules to agent output
5. All write actions must go through receipt logging
