# GHOSTCLAW_LOOP_ENGINEERING_FULLSTACK_BLUEPRINT
## Version: 1.1

### Overview

GhostClaw Blueprint เป็นการออกแบบระบบ multi-agent orchestration สำหรับ SIRINX OS

### Architecture Decisions

| Layer | Decision | Rationale |
|-------|----------|-----------|
| Frontend | React + Tailwind | Fast iteration, component reuse |
| Backend | Express + Prisma | Type-safe, MySQL compatible |
| Database | MySQL 8.0 | Production ready, JSON support |
| API | REST + OpenAPI | Simple, tool-friendly |
| Deployment | GitHub Actions + Docker | CI/CD, portable |

### File Structure

```
sirinx-os/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Migration files
├── apps/
│   └── live-agent-studio/
│       └── src/
│           ├── design/        # Design tokens
│           ├── components/    # React components
│           └── hooks/         # React hooks
├── services/
│   ├── api-gateway/
│   │   ├── routes/            # API endpoints
│   │   ├── middleware/        # Security middleware
│   │   ├── controllers/       # Business logic
│   │   └── contracts/         # OpenAPI specs
│   └── dev-control-api/
│       ├── schema/            # Raw SQL schema
│       ├── seed/              # Seed data
│       └── orchestrator/      # Agent orchestration
├── docs/
│   └── ghostclaw-architecture/
├── infra/
│   └── docker/
├── security/
└── tests/
```

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/agents | List all agents |
| POST | /api/agents | Create new agent |
| GET | /api/task-queue | List pending tasks |
| POST | /api/task-queue | Enqueue task |
| POST | /api/ghostclaw/run | Run agent cycle |

### Safety Gates

- MCP_DRY_RUN=true (default)
- No real customer messages
- No cloud mutations without approval
- All PII masked in logs

### Next Steps (User Approval Required)

1. Enable database connection
2. Run prisma migrate
3. Deploy to staging
4. Enable live monitoring

---
*Blueprint created: July 2026*
*Status: Phase 2 Complete - Ready for Phase 3 Integration*