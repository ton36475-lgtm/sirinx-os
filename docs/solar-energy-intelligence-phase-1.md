# Solar Energy Intelligence Platform - Phase 1

## Goal

Build a Thailand-focused solar engineering intelligence layer that supports customer intake, system sizing, ROI simulation, proposal generation, and ObsidianBrain knowledge capture.

## Current Implementation

- Local app: `apps/solar-intelligence`
- Local URL: `http://127.0.0.1:8720`
- Engine: TypeScript domain modules under `src/domain`
- Obsidian sync: `src/obsidian/markdown.ts`
- Demo data: Deye inverter, GSL LiFePO4 battery, sample hybrid ESS customer

## Safety And Compliance Position

- PEA approval is modeled as a blocker rule.
- Anti-islanding is modeled as a blocker rule.
- Export limitation is modeled as a warning/commissioning gate.
- Tariff, yield, CAPEX, and ROI are explicit assumptions until replaced with measured data.
- Final quotes must refresh official PEA Smart List and verify inverter/battery BMS compatibility.

## Future Production Architecture

- Next.js + TypeScript operator/customer portals
- PostgreSQL + Prisma for multi-tenant project data
- Python simulation service for irradiance, load curves, and battery cycling
- Redis for proposal and simulation caching
- Worker queue for PDF generation and Obsidian sync
- Role-based access for owners, sales, engineers, installers, and customers
- Audit logs for all AI recommendations and rule-engine decisions

## Phase 2 Candidates

- Customer intake form with bill upload
- Equipment CRUD with source expiration reminders
- Installer workflow board
- PDF proposal renderer
- AI recommendation draft mode with human approval
- Solis home telemetry ingestion and recommendation-only load balancing

## Commercial BESS Extension

The app now also includes a C&I Hybrid PV + BESS + STS critical-load subsystem:

- 1P260S LFP HV battery architecture
- 832 VDC nominal / 728-910 VDC operating range model
- 261 kWh class liquid-cooled ESS
- 125 kW PCS and C-rate calculation
- STS transfer and synchronization logic
- EMS strategies for peak shaving, TOU, PV self-consumption, backup reserve, and power quality
- Commissioning gates for IR test, precharge, phase sequence, CT polarity, CAN/BMS, STS transfer, EMS acceptance, fire/gas chain, and export compliance

All C&I values are seeded from operator-provided project knowledge and must be attached to OEM manuals, local engineer sign-off, and utility requirements before EPC release.

## Solis Home Load Balancing Extension

The next production path is a residential/site intelligence layer that connects customer-approved SolisCloud telemetry to SIRINX OS without changing the public website.

Initial scope:

- Read-only SolisCloud telemetry and customer mobile-app site mapping.
- Per-house digital twin for PV, inverter, battery, grid import/export, protected load, deferrable load, tariff, and consent status.
- Recommendation-only optimization for battery charge/discharge, export limiting, and deferrable load shifting.
- Human approval before any external control command.
- Kill switch, homeowner override, alarm blocking, stale-data blocking, and audit trail.

Implementation files:

- `docs/knowledge/SOLIS_HOME_LOAD_BALANCING_AGENT_PLAN.md`
- `policies/solis-load-control-policy.yaml`
- `src/domain/solis-load-control.ts`
- `src/domain/solis-load-control.test.ts`

Current state: deterministic dry-run safety engine only. It does not call SolisCloud and does not execute real inverter or load-control commands.

## C&I BESS Deep Knowledge Pack

The C&I Obsidian sync creates 20 reusable engineering notes:

1. Commissioning Engineer Knowledge
2. EMS Logic Step By Step
3. Power Flow Every Mode
4. BMS Architecture Deep
5. PCS Control Loop
6. Grid Synchronization
7. Protection Coordination
8. Sizing Methodology
9. Failure Modes Whole System
10. Root Cause Analysis
11. SCADA Integration
12. Modbus Map Architecture
13. Black Start Sequence
14. Island Mode Engineering
15. Thai Utility Compliance
16. Revenue Model Of ESS
17. Advanced Hybrid Topology
18. Microgrid Engineering
19. Battery Degradation Modeling
20. Complete EPC Workflow
