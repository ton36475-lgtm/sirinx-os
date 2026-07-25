# Install Gate

This scaffold is ready for review, not runtime execution.

## Install-Audit Gate

Allowed only after explicit approval:

- Resolve dependencies for `@sirinx/enterprise-ai-company`.
- Review lockfile changes.
- Run scaffold verification and TypeScript checks after dependencies exist.

Still blocked:

- `dev`, `start`, and `volt` runtime commands
- provider/model calls
- VoltOps live telemetry
- `.env` value reads or secret printing
- deploy, push, DNS, production mutation

## Runtime Gate

Runtime start is separate from install. It requires:

```bash
SIRINX_ENTERPRISE_AI_COMPANY_RUNTIME_APPROVED=1
```

The runtime gate only allows local startup after install review. Provider calls and public actions still require separate owner approval.
