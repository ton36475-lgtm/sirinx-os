# Evolution Systems - Cron Job Model Routing Matrix

## Frontier Models (Primary - System Creation)
| Model | Use Case | Port/Endpoint |
|-------|----------|---------------|
| moonshot-v1-256k-kimi3 | Architecture, Chinese processing, long context | localhost:18789 |
| fable-v5-codestral | Code generation, technical implementation | localhost:18789 |
| solar-1-preview | Reasoning, planning, logic tasks | localhost:18789 |

## Secondary Models (Review/Media)
| Model | Use Case | Port/Endpoint |
|-------|----------|---------------|
| glm-5.2 | Planning, documentation, review | localhost:18789 |
| deepseek-v4-pro | Review, security scan, backend logic | localhost:18789 |

---

## Cron Job Model Assignment

| Job | Primary Model | Secondary Model | Purpose |
|-----|---------------|---------------|---------|
| frontier-model-generator | kimi3 | solar | Create system tasks |
| loop-engineering-v4 | fable5 | deepseek | Evolution loops |
| agent-dispatch-loop | kimi3/solar | glm | 47 Ronin dispatch |
| agent-collect-brainstorm | kimi3 | glm | Collect findings |
| health-check-v4 | glm-5.2 | solar | Health analysis |
| self-evolution-v4 | solar | kimi3 | Self-improvement |
| full-auto-loop-tier-cd | solar/glm | kimi3 | Approval gating |
| daily-report-v4 | glm-5.2 | solar | Reports |

---

## Media Generation Routing (Video/Image)

For creative tasks (After Effects, ClawForge, Media Studio):
- **Planning**: GLM-5.2 (localhost:18789)
- **Execution**: DeepSeek-V4-Pro (localhost:18789)
- **Review**: Kimi3 (localhost:18789)

---

## Emergency Override

```
# To change model routing, set in ~/.omniroute/routes.json:
{"frontier_model": "moonshot-v1-256k-kimi3"}
```

---

Documented: 2026-07-17T17:30:00Z