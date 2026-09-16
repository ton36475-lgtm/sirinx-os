# GHOSTCLAW_LOOP_ENGINEERING - Security Hardening
# Phase 2H: Threat Model + Security Controls

## Threat Model Analysis

### T1: Secret Leakage - MITIGATED
- .gitignore includes .env, *.key, *.pem
- No hardcoded credentials in code
- PII masking in logs

### T2: Prompt Injection - MITIGATED
- Input validation middleware
- SQL escaping via Prisma ORM
- Command allowlisting

### T3: Tool Misuse - MITIGATED
- MCP_DRY_RUN=true by default
- Tool allowlist enforced
- No shell access from frontend

### T4: Unauthorized External Action - MITIGATED
- Kill switches enabled
- Human approval required for:
  - DEPLOY_KILL_SWITCH
  - EXTERNAL_SEND_KILL_SWITCH
  - IMAGE_GENERATION_KILL_SWITCH

## Security Headers (Express)

# headers.ts
SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'",
  'Referrer-Policy': 'strict-origin-when-cross-origin'
}

## CORS Configuration

ALLOWED_ORIGINS = [
  'http://localhost:3000',  # Frontend dev
  'https://dev.sirinx.co',   # Production dev dashboard
  'https://live.sirinx.co'   # Live studio
]

CORS_OPTIONS = {
  origin: ALLOWED_ORIGINS,
  methods: ['GET', 'POST', 'PATCH'],
  credentials: true,
  maxAge: 86400
}

## Rate Limiting Rules

RATE_LIMITS = {
  api: '100 per minute',
  agent_run: '10 per minute',
  task_enqueue: '50 per minute'
}

## Audit Trail Schema

CREATE TABLE audit_log (
  id VARCHAR(64) PRIMARY KEY,
  actor VARCHAR(128),
  action VARCHAR(128),
  resource VARCHAR(255),
  input_hash VARCHAR(64),  # SHA256 of input params
  correlation_id VARCHAR(128),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(32)
);

## Security Scan Commands

# NPM audit
npm audit --audit-level=high

# Snyk scan
npx snyk test --severity-threshold=high

# OWASP ZAP baseline
docker run -t owasp/zap2docker-stable zap-baseline.py -t http://localhost:3600

# Secrets detection
gitleaks detect --source=. --report-format=json