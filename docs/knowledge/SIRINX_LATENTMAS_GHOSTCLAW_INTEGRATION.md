# SIRINX LatentMAS x GhostClaw Integration

Date: 2026-06-29
Status: R0-R2 local scaffold
Scope: GHOSTCLAW A2A2A governance, schema compatibility, and local auto-approve scoring

## Authority

The JSON control plane is the authority for A2A2A routing, approvals, tiers, receipts, and audit. The latent plane is a shadow acceleration layer only. It can propose context, consensus, confidence bonuses, and debug signals, but it cannot approve, execute, deploy, send, mutate cloud resources, or override the JSON control plane.

Dual-plane lock:

- JSON control plane: authoritative state, action class, violations, approval tier, final tier, receipts.
- Latent plane: non-authoritative shadow state for acceleration and comparison.
- Conflict rule: if JSON control plane and latent plane disagree, JSON wins and the action is capped or blocked.

## Terminology

Canonical term: `brainstorm`.

Deprecated alias: `beststorm`. Inbound compatibility may normalize it to `brainstorm`, but new fields and artifacts must not emit it.

Invalid typo: `beststrom`. Inbound use is an error and outbound use is prohibited.

MoA naming:

- Use `moa_summary` for consensus metadata.
- Use `moa_gated_brainstorm` for gated brainstorm approval metadata.

## Compatibility

Inbound compatibility:

- Accept `brainstorm` fields.
- Accept deprecated `beststorm` aliases only for legacy input and normalize them to `brainstorm`.
- Reject `beststrom` typo fields.
- Preserve existing A2A2A required fields and message contracts.

Outbound compatibility:

- Emit only canonical `brainstorm` field names.
- Keep all LatentMAS extension fields optional.
- Do not require latent fields for existing A2A2A producers or consumers.

## Claim Lock

Do not claim guaranteed LatentMAS performance such as `4.3x`, `83.7%`, or `+13.3%` without a local benchmark artifact linked to the mission receipt. Treat those values as research targets or upstream claims until verified on the Mac mini or approved staging hardware.

## Confidence And Tiering

Corrected formula:

```text
raw_score = base_brainstorm + latent_bonus + sum(standard_modifiers)
capped_score = min(max(raw_score, 0), 100)
display_score = raw_score
```

`display_score` may exceed 100 for observability, but approval uses only `capped_score`.

`action_tier_cap` limits the highest tier allowed by action class. Hard violations force final tier `X` regardless of score.

Hard violations:

- `secret_access_requested`
- `ambiguous_input`
- `blocked_action_attempted`

## KV Compatibility Gate

Before any latent KV state can influence a brainstorm, a compatibility gate must confirm these 12 fields:

1. `schema_version`
2. `brainstorm_id`
3. `mission_id`
4. `correlation_id`
5. `authority_plane`
6. `latent_enabled`
7. `kv_namespace`
8. `kv_key`
9. `kv_digest`
10. `created_at`
11. `expires_at`
12. `fallback_policy`

The gate must fail closed when required fields are missing, malformed, expired, or mapped to a non-shadow authority plane.

## Debug Probe Mode

Debug probes run as parallel text probes. They compare control-plane output against latent-plane suggestions and write diagnostics only. They do not decode from KV, mutate runtime state, or trigger actions.

Required probe settings:

```yaml
mode: parallel_text_probe
decode_from_kv: false
write_actions_enabled: false
external_send_enabled: false
```

## Phase Roadmap

P0: Terminology and claim lock.

P1: Backward-compatible A2A2A schema extension.

P2: Local auto-approve scoring scaffold with action tier cap.

P3: Read-only receipt and dashboard visibility.

P4: Shadow latent-plane probe with no runtime authority.

P5: KV compatibility gate test corpus.

P6: MoA-gated brainstorm review lane.

P7: Human-approved staging integration after local benchmark evidence.

## Current Stop Point

R0-R2 does not wire the auto-approve engine into runtime. It creates governance artifacts, optional schema fields, policy caps, and unit-tested local scoring only.
