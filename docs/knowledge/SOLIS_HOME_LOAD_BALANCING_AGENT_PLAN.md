# Solis Home Load Balancing Agent Plan

## Goal

Build a controlled SIRINX OS extension that can use customer-approved Solis inverter data to monitor each home, model energy behavior, propose load-balancing actions, and eventually execute approved control actions through a dedicated pilot adapter.

This is a cyber-physical energy system. The first production-grade milestone is not automatic control. The first milestone is reliable read-only telemetry, digital-twin validation, recommendation-only optimization, and audited human approval.

## Source Constraints From Solis

Official Solis material creates three important constraints for the design:

- SolisCloud API access must be requested and activated through Solis/SolisCloud API Management.
- Solis states that API access is not the same thing as remote control access.
- Solis support states that SolisCloud data is uploaded every 5 minutes and represents a snapshot, not a 5-minute average.
- The SolisCloud API document lists monitoring endpoints such as inverter list, inverter data, alarm list, collector data, EPM data, and station day/month/year data, with documented frequency limits around 2 requests per second on many endpoints.

Sources:

- https://solis-service.solisinverters.com/en/support/solutions/articles/44002212561-request-api-access-soliscloud
- https://doc.ginlongcloud.com/en/20.API%20documentation/01.SolisCloud%20Platform%20API%20Document.html
- https://solis-service.solisinverters.com/en/support/solutions/articles/44002686962/
- https://oss.soliscloud.com/templet/SolisCloud%20Platform%20API%20Document%20V2.0.2.pdf

## Non-Negotiable Safety Position

SIRINX must not send real inverter, battery, relay, EV charger, or load-control commands until all of these are true:

- Customer consent is active and tied to the exact SolisCloud account/site.
- API credentials are stored in an approved secret manager, never in source code or Obsidian.
- Telemetry ingestion has run read-only long enough to verify data quality.
- Site topology is documented: inverter, meter, battery, protected load, deferrable load, phase, grid constraints, and homeowner override path.
- Digital-twin simulation passes against measured history.
- Human approval flow is working and audited.
- Kill switch, rollback plan, and incident process are tested.
- A qualified electrical engineer signs off the first pilot site.

## Target Agent Team

| Agent | Role | External Write Access |
| --- | --- | --- |
| Hermes Orchestrator | Routes tasks, enforces stage gates, opens approval tasks. | None |
| Solis Telemetry Steward | Pulls SolisCloud plant, inverter, collector, EPM, and alarm data. | None |
| Site Digital Twin Agent | Maintains per-house topology, tariffs, load inventory, SOC reserve, and comfort rules. | None |
| Load Balance Optimizer | Produces proposed schedules and setpoints for export limiting, battery charge/discharge, and deferrable loads. | None |
| Safety Validator | Blocks stale telemetry, alarms, low SOC, grid outage, consent gaps, override state, and out-of-bound proposals. | None |
| Customer Approval Agent | Collects approval through dashboard, LINE, Telegram, or mobile review. | Approval-gated |
| Control Adapter Agent | Executes commands only in pilot mode after all gates pass. | Pilot-only |
| Audit And Incident Agent | Logs events, approvals, command attempts, kill-switch events, and incident reports. | Approval-gated |

## Data Model

Minimum tables or collections:

- `customers`: customer identity, consent state, contact channels, data-retention policy.
- `sites`: address, timezone, utility, phase, tariff, export agreement, grid constraints.
- `devices`: inverter, logger, EPM/meter, battery, EV charger, relay/load controller.
- `solis_credentials`: secret reference only, not raw key values.
- `telemetry_samples`: normalized Solis readings with observed time, received time, and source.
- `site_alarms`: Solis alarms and SIRINX safety events.
- `load_circuits`: protected, essential, comfort, deferrable, EV, and process loads.
- `forecasts`: PV, home load, tariff windows, outage reserve, weather.
- `optimization_runs`: input snapshot, assumptions, proposed action, score, and safety result.
- `approvals`: approver, channel, scope, expiry, evidence.
- `command_executions`: command payload hash, target adapter, result, rollback action, and operator.
- `audit_events`: append-only trace of every agent decision and external action.

## Implementation Phases

### Phase 0 - Consent And API Inventory

- Confirm customer owns or can authorize the SolisCloud site.
- Request SolisCloud API access through official process.
- Document whether the customer has end-user access, installer access, or North America owner/director access.
- Record available endpoints, rate limits, timezone, and data freshness behavior.
- Store only secret references in repo configuration.

### Phase 1 - Read-Only Solis Telemetry

- Pull station, inverter, collector, EPM, and alarm data.
- Normalize observed time, received time, unit, sign convention, and source.
- Detect stale data, offline logger, missing meter, and active alarms.
- Build a dashboard card per house: PV, load, grid import/export, battery SOC, alarm state, and data age.

### Phase 2 - Database And Customer Mobile Alignment

- Import customer mobile-app site mapping without copying secrets into source control.
- Map Solis station IDs to SIRINX customer/site IDs.
- Preserve the customer's existing mobile-app experience while SIRINX runs as an overlay intelligence layer.
- Add data-retention and deletion workflows.

### Phase 3 - Digital Twin

- Model house topology, protected loads, deferrable loads, EV charging, battery reserve, tariff periods, and export limits.
- Compare digital-twin outputs with measured Solis history.
- Block control recommendations when prediction error or missing-meter risk is too high.

### Phase 4 - Recommendation-Only Optimization

- Generate proposed actions only: charge battery, discharge battery, limit export, shift deferrable load, or hold.
- Score each action by cost, comfort impact, equipment risk, SOC reserve, and confidence.
- Require human approval to move beyond recommendation.

### Phase 5 - Manual Control Pilot

- Enable a dedicated control adapter only for one approved pilot site.
- Require fresh telemetry, active consent, no alarms, no homeowner override, and explicit approval ID.
- Execute one small bounded action at a time.
- Verify result through telemetry before any next action.

### Phase 6 - Limited Autopilot

- Allow bounded automatic actions only after pilot evidence.
- Keep protected loads outside autopilot.
- Keep kill switch, homeowner override, and human review always available.
- Use automatic rollback on stale telemetry, alarms, communication loss, or comfort violation.

## Safety Gates

Every proposed control action is blocked when any condition is true:

- Kill switch active.
- Customer consent inactive.
- Homeowner override active.
- Logger, inverter, meter, or grid is offline.
- Active inverter/site alarm exists.
- Telemetry is older than the configured maximum age.
- Battery SOC is below reserve for discharge.
- Proposed charge/discharge exceeds configured site limits.
- Proposed duration exceeds configured action window.
- Protected load boundary is unclear.
- Approval is missing, expired, or not tied to the exact command scope.

## Cloudflare Execution Shape

Recommended SIRINX OS production shape:

- Cloudflare Worker API for dashboard and webhook entrypoints.
- Durable Object or Agents SDK instance per site for stateful site coordination.
- Queue for telemetry ingestion and retry.
- Workflow for multi-step approval and control execution.
- D1/Postgres-compatible durable store for normalized telemetry and audit events.
- R2 for signed reports and evidence artifacts.
- Cloudflare Access for operator dashboards.

## Acceptance Checklist

- Solis integration starts in read-only mode.
- No source file contains API ID, API secret, customer credential, or exported mobile-app token.
- Unit tests prove read-only mode cannot execute commands.
- Unit tests prove stale telemetry, low SOC, alarms, consent gap, override, and missing approval block control.
- Dashboard exposes data freshness and alarm state.
- Every recommendation has an audit event.
- Every execution has approval evidence, result telemetry, and rollback notes.
- Main public website remains unchanged.

## Current Repository Implementation

Initial dry-run implementation lives in:

- `apps/solar-intelligence/src/domain/solis-load-control.ts`
- `apps/solar-intelligence/src/domain/solis-load-control.test.ts`
- `policies/solis-load-control-policy.yaml`

The current implementation does not call SolisCloud and does not send device commands. It defines guardrails and a deterministic decision engine for future integration.
