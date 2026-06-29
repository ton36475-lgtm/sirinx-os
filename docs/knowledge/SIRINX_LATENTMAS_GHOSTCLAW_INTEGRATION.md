# SIRINX LatentMAS × GhostClaw Integration

**Status:** ACTIVE
**Authority:** ADR-LATENT-001

---

## 1. Dual-Plane Architecture

```
CONTROL PLANE (JSON)  = source of truth
LATENT PLANE (KV)     = shadow / acceleration only
SAFETY PLANE          = always active, final authority
```

### Invariant

```
JSON receipt + policy gate > latent score  (always)
```

## 2. Plane Definitions

### Control Plane (JSON)
- Source of truth for all decisions
- Receipts, decisions, evidence packs, worker messages
- `autonomous_approval` metadata
- `action_tier_cap` enforcement

### Latent Plane (KV)
- Shadow / acceleration only
- Never authoritative
- May provide `latent_bonus` to `display_score`
- `effective_score` remains capped at 100
- Fallback to JSON control plane on any mismatch

### Safety Plane
- Always active
- Policy gate is final authority
- Hard violations force tier X
- No score (MoA, latent, confidence) can override

## 3. KV Compatibility Gate

A KV bundle is compatible only if all 12 fields match exactly and the backend exposes `past_key_values`:

```python
KV_REQUIRED_FIELDS = [
  "model_id", "model_revision", "tokenizer_hash", "config_hash",
  "num_layers", "hidden_size", "num_attention_heads", "num_key_value_heads",
  "rope_scaling", "dtype", "quantization_mode", "cache_schema_hash"
]
```

On mismatch: fallback to JSON text Brainstorm, log mismatch, `latent_bonus = 0`.

## 4. Debug Probe

- Mode: `parallel_text_probe`
- `decode_from_kv` = **false**
- Debug probe runs in parallel with text probe, not from KV
- No KV-only protocol is allowed

## 5. Claims Lock

Until a local benchmark is run, never state these as facts:
- "4.3x faster inference"
- "83.7% fewer tokens"
- "+13.3% accuracy"
- "guaranteed speedup"

Allowed: "empirical results from arXiv:2511.20639v3 on specific benchmarks", "shadow latent metrics (not yet validated)".

## 6. Auto-Approve Score Invariant

```python
effective_score = min(100, base_brainstorm + latent_bonus + standard_modifiers)
```

- `display_score` may exceed 100 for confidence signaling only
- `effective_score` is capped at 100
- Base tier: A≥90, B≥75, C≥60, D<60
- `action_tier_cap` overrides base tier: `final_tier = min(base_tier, cap)`
- Hard violations force tier X

## 7. Runtime Directory

LatentMAS runtime files are stored under `.ghostclaw_runtime/latent/`.

## 8. Terminology

- `brainstorm` = canonical
- `beststorm` = deprecated legacy alias (inbound read only)
- `beststrom` = invalid typo (reject)
