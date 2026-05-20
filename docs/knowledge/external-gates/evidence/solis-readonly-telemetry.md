# Solis Read-Only Telemetry Evidence

Gate: Solis API consent and read-only telemetry
Status: pending consent, credential storage, and station mapping evidence
External writes: false
Secret storage: pending approval

## Required Evidence

- [ ] customer/site consent recorded
- [ ] credential storage path approved
- [ ] station/inverter/logger/meter mapping recorded
- [ ] read-only smoke scope confirmed
- [x] control/write path disabled

## Operator Record

- Date/time: 2026-05-20 15:29:00 +0700
- Operator: Codex local preflight; human operator still required for consent, credential storage, and station mapping
- Customer/site masked label: pending
- Consent artifact path: pending
- Credential storage path, no value: pending
- Station masked id: pending
- Inverter masked id: pending
- Logger masked id: pending
- Meter masked id: pending
- Read-only endpoints approved: pending
- Kill switch path: policy gate `kill_switch_clear`; runtime control path remains disabled
- Engineer signoff: pending

## Verification Output

Do not paste SolisCloud API secrets, passwords, tokens, customer credentials, exact customer private data, or `.env` values.

```text
Local preflight:
- Policy file exists: `policies/solis-load-control-policy.yaml`
- Policy status: `active-dry-run`
- Policy default mode: `read_only`
- Policy requires approval for live telemetry ingestion, control adapter changes, device commands, and load-control worker deploy.
- Local Solis CLI exists at `/Users/sirinx/.local/bin/solis`, but it was not executed.
- Blocked actions remain: SolisCloud credential login, Solis telemetry call, inverter control, battery dispatch, export-limit change.

Pending human verification:
- customer/site consent artifact
- credential storage path without exposing values
- station/inverter/logger/meter mapping
- read-only endpoint smoke scope
- engineer signoff
```

## Stop Rule

Stop if consent, credential storage, station mapping, engineer signoff, alarm scope, kill switch, or read-only adapter boundary is missing.
