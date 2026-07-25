# Hermes Decision Log

| Date | Decision | Reason | Impact |
|---|---|---|---|
| 2026-05-27 | Use Hermes Spec-First Swarm Protocol v1 | Prevent prompt-to-code drift | Future work must pass context, spec, approval, implementation, test, and report gates |
| 2026-05-27 | Create live local `.hermes` state | Operator selected live project state | Local API can report actual workflow readiness |
| 2026-05-27 | Keep API dry-run/status-only | Preserve local-only safety model | No source mutation through the API |
| 2026-05-27 | Lock approval phrase to `APPROVE_IMPLEMENTATION` | Make approval explicit and testable | Broad approval is insufficient for future implementation |
