# P098 Rev E — remove the sovereign local tier

**Status:** `[APPROVED]`
**Raised:** 2026-07-25
**Approved:** 2026-07-25 by Tony (Terbo), sole human authority.
**Approval line received verbatim:**

```
🔴 APPROVE P098 Rev E
```

**Amends:** P098 Rev B (was LOCKED). **Related:** P098 Rev D (maxplus lane).

---

## 1. Decision

Remove the sovereign local tier (Ollama, `127.0.0.1:11434`) from the P098 routing chain.

## 2. P098 Rev B — prior text, quoted verbatim from GHOSTCLAW v1.0 [3]

> P098 Rev B (LOCKED): tiered LLM routing = sovereign Ollama (localhost:11434)
> → OpenRouter free (https://openrouter.ai/api/v1) → paid frontier / GLM
> (https://api.z.ai/api/paas/v4/ — NOT /api/openai/v1, that 404s).

## 3. P098 Rev E — chain as amended

```
OpenRouter free (https://openrouter.ai/api/v1)
  → paid frontier / GLM (https://api.z.ai/api/paas/v4/)
    → maxplus (LEAF, P098 Rev D — 🟢/🟡 only, never the default)
```

## 4. Trigger

Ollama was already down at decision time. **VERIFIED** raw:

```
$ curl -s -o /dev/null -w "http_code=%{http_code}\n" --max-time 5 http://127.0.0.1:11434/api/tags
http_code=000
```

## 5. What this costs — stated plainly

GhostClaw loses its **offline, keyless tier**. Every remaining tier requires an API key
and network egress. Consequences:

- No inference is possible with the network down or all keys revoked.
- Tier 1 is no longer sovereign — the first-choice provider is now a third party.
- Prompt/code sent to tier 1 must now be treated as disclosed, which was previously
  true only from tier 2 onward.

This is accepted as Tony's decision, not presented as an improvement.

## 6. Consequential edits required

- **v1.0 [3]** — the P098 Rev B line is superseded by §3 above.
- **v1.0 [6] S2 gate** — reads *"Ollama tier first (offline, keyless); tiered fallback
  works with Ollama stopped."* That gate is now unsatisfiable as written. Restated:

  > **S2 GATE (Rev E):** OpenRouter free tier answers first; tiered fallback works with
  > the OpenRouter key unset (falls through to GLM paid, then maxplus leaf).

- **P098 Rev D §10 condition 3** — the "restore Ollama first" blocker is discharged.
  maxplus is not a single point of failure because OpenRouter free and GLM sit above it.

## 7. Unchanged

- maxplus stays **LEAF** and never becomes the default for CHECKER or GUARD.
- 🔴 tasks still route only through the structural HIGH gate in v1.0 [1].
- `OllamaProvider` remains in `ghostclaw-os/crates/providers` as dead-but-compiling code
  so Rev E can be reverted without a rewrite. It is simply no longer in
  `TieredRouter::standard()`.

## 8. Labels

| Claim | Label |
|---|---|
| Rev B text in §2 | VERIFIED (GHOSTCLAW v1.0 skill, verbatim) |
| Ollama down at decision time | VERIFIED (raw curl) |
| Chain in §3 | APPROVED 2026-07-25 |
| Cost analysis §5 | reasoning, not measurement |
