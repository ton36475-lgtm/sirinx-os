# SIRINX LatentMAS — GHOSTCLAW Integration

**Phase:** 9
**Status:** Architecture specification only — no live inference
**LATENTMAS_LIVE_ENABLED:** false

---

## 1. Dual-Plane Architecture

LatentMAS operates on a **dual-plane** model:

| Plane | Authority | Description |
|---|---|---|
| **Control Plane** | Source of Truth | JSON-based task envelopes, receipts, and audit trails. All decisions are recorded here. |
| **Latent Plane** | Shadow/Acceleration Only | KV cache acceleration for inference. Does not carry authoritative state. |
| **Safety Plane** | Final Authority | Policy Guardian and KOB Validator. Overrides all other planes. |

Invariant: `JSON receipt + policy gate > latent score`.

Contract markers:

- `json_control_plane_source_of_truth`
- `latent_plane_shadow_only`
- `safety_policy_plane_final_authority`

## 2. Key Rules

### 2.1 No KV-Only Protocol

- All authoritative communication goes through the JSON control plane
- KV cache in the latent plane is a **shadow** — it cannot be the sole protocol
- `kv_only_protocol` = Tier X hard violation

### 2.2 Exact KV Compatibility Gate

- KV cache compatibility requires **exact match** between control and latent planes
- This is the `exact KV compatibility gate`.
- If compatibility fails, the latent plane is **disabled** and control plane continues alone
- No degraded KV protocol is accepted

### 2.3 Debug Probe = Parallel Text Probe

- Debug probes for latent plane issues use **parallel text probes** — NOT `decode_from_kv`
- The runtime marker is `parallel_text_probe`.
- Direct KV decoding is prohibited as it bypasses the control plane's authority

### 2.4 No Guaranteed Performance Claims

- **No guaranteed 4.3x speedup** claim
- **No guaranteed 83.7% accuracy** claim
- **No guaranteed +13.3% improvement** claim
- All performance metrics are **benchmarked, not guaranteed**

### 2.5 Safety Rules

- `LATENTMAS_LIVE_ENABLED = false` (default)
- `model_download_allowed = false`
- `gpu_live_inference_allowed = false`
- No model download
- No GPU live inference
- No secret access
- The Policy Guardian can override any latent plane proposal
- KOB Validator issues safety verdicts for any latent plane activation request

## 3. Manifest

The LatentMAS manifest is stored at:

```
.ghostclaw_runtime/latent/manifest.json
```

It declares:
- Control plane = source of truth (JSON)
- Latent plane = shadow/acceleration only
- Safety plane = final authority
- All hard rules (no KV-only, no guaranteed claims, no live inference)

## 4. Worker Integration

| Worker | Role |
|---|---|
| receipt_memory_worker | Archives latent plane manifests and evidence |
| policy_guardian | Enforces safety plane authority over latent plane |
| kob_validator | Issues safety verdict for latent plane activation |
| model_router | Routes latent-plane tasks to appropriate model lanes (metadata only) |

## 5. Validation

- LatentMAS validation (Phase 15): `cargo check --offline --locked` if Cargo.toml exists
- If cargo needs fetch: auto-block, record `blocked_by_missing_cached_dependency`
- If no Cargo.toml: `skipped_no_latentmas_crate`
- `LATENTMAS_LIVE_ENABLED = false` always enforced

## 6. Gateway L6

- If `services/latentmas-gateway` exists: `pnpm --filter latentmas-gateway test`
- If missing: `skipped_no_gateway`
- No secrets read, no installs
