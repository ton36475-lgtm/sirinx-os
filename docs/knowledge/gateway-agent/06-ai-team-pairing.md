# AI Team Pairing Contract

Date: 2026-05-26
Status: local-only pairing ready

## Purpose

Pair every SIRINX 47 Ronin role to a local owner profile and runtime lane without starting real gateways or sending Telegram/LINE messages.

## Pairing Rule

- 12 active Hermes profiles are the owner spine.
- 47 role roster entries are paired to the closest active profile by lane.
- Codex remains the local control runner.
- Hermes TUI and Gemini CLI are manual review lanes only.
- A2A2LoopSync holds evidence packets and next exact steps.

## Local API

```text
GET /api/ai-team-pairing
POST /api/ai-team-pairing/dry-run
```

## Messaging Boundary

Telegram and LINE stay blocked until `docs/knowledge/external-gates/evidence/telegram-line-recipient-token.md` is complete and a later exact send approval exists.

The Telegram screenshot is treated as operator context only. It is not proof of a deliverable target, token ownership, or final send approval.

## Stop Point

```text
AI TEAM PAIRED LOCAL-ONLY - WAITING FOR HUMAN APPROVAL
```
