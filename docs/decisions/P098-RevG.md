# P098 Rev G — Alibaba MaaS lane, and per-family routing by measured latency

**Status:** `[APPROVED — wired 2026-07-25]`
**Raised:** 2026-07-25
**Approved:** 2026-07-25 by Tony (Terbo), sole human authority.
**Approval line received:**

```
🔴 APPROVE P098 Rev G
```

*(received as `🔴 APPROVE P098 Rev Gบช` — the token is complete and the trailing
two characters are an IME artifact, not a different decision. Recorded as
received rather than silently tidied.)*
**Amends:** the chain established by Rev F. **Related:** Rev D (maxplus), Rev E (no local tier).

---

## 1. Decision proposed

Add `alibaba` (Alibaba Cloud Model Studio) as a PRIMARY lane, and route by model
family according to what each provider actually measured, rather than by vendor
affinity.

## 2. Chain as amended

```
glm-*                    → cointh    (https://cointh.com/glm/anthropic)
qwen* / deepseek* / kimi* → alibaba   (workspace MaaS endpoint)
                              ↓ on quota exhaustion only
                          → maxplus  (LEAF, Rev D — 🟢/🟡 only, never 🔴)
                              ↓ if maxplus is DOWN or absent
                          → OpenRouter free → GLM paid (Rev E remainder)
```

Rev F routed GLM to cointh on the strength of one comparison. Rev G keeps that
and adds a second primary, because the measurements below do not point at one
provider for everything.

## 3. Why — measured, not assumed

Same prompt (`"Say OK"`), same day, one sample each:

| model | alibaba | cointh | maxplus | fastest |
|---|---:|---:|---:|---|
| `glm-5.2` | 1676 ms | **1265 ms** | 3610 ms | cointh |
| `glm-5.1` | 4109 ms | **1194 ms** | 2909 ms | cointh |
| `deepseek-v4-pro` | **2032 ms** | — | 3708 ms | alibaba |
| `deepseek-v4-flash` | **870 ms** | — | 3112 ms | alibaba |
| `kimi-k2.7-code` | **941 ms** | — | 2096 ms | alibaba |
| `qwen3.7-max` | **2191 ms** | — | 5357 ms | alibaba |
| `qwen3.7-plus` | **2577 ms** | — | 5611 ms | alibaba |

Two things fall out of this and neither was obvious in advance:

**alibaba beats maxplus on every id they share** — by 1.8× to 3.6×. maxplus is a
reseller in front of these same models, so the gap is the reseller hop.

**cointh still beats alibaba on GLM**, and by more than alibaba's own margin
elsewhere. Sending GLM to alibaba because alibaba is faster "in general" would be
slower for GLM specifically. That is why this is per-family and not per-provider.

**One sample each.** These are not benchmarks. They are enough to order a routing
table and not enough to defend a 10% difference; the GLM and qwen gaps are large
enough that ordering is safe.

## 4. The lane

**VERIFIED** — `GET /compatible-mode/v1/models` → 151 model ids.

11 were smoke-tested — the qwen flagships plus every id shared with another lane.
**11 of 11 answered.** The free tier is a 70M-token plan and a 151-id sweep would
spend it to learn nothing that changes the routing table.

The remaining 140 are listed by the endpoint but **UNVERIFIED**: mostly older
qwen3/qwen3.5 sizes, embeddings, and image models.

Both wire formats work:

- `openai_chat` → `/compatible-mode/v1/chat/completions` — 11/11
- `anthropic_messages` → `/apps/anthropic/v1/messages` — verified on `qwen3.7-max`
  and `glm-5.2`, both returning `msg_` envelopes
- `dashscope` → `/api/v1` — **NOT PROBED**

Registry: `config/models.alibaba.json`, validated against the shared schema.

## 5. `qwen3.8` does not exist

The request that opened this work asked for "qwen 3.8 preview". **There is no
`qwen3.8` on the endpoint.** The newest qwen is `qwen3.7-max-preview`, which was
probed and answered in 1694 ms.

Under the M2.2 rule an id absent from the live list is `ABSENT` and must not be
routed to. `qwen3.7-max-preview` is used in its place.

This is the third time a declared id has failed against a live list on this
project: maxplus listed three ids that were not routable, cointh's config
misspelled two of four, and here a requested id does not exist at all.

## 6. The base URL is account-specific

```
https://ws-pmpu62szcpaossb6.ap-southeast-1.maas.aliyuncs.com
        └──────┬──────┘
          workspace id
```

Model Studio issues a dedicated inference domain per workspace, so this host is
not a fact about the service — it is a fact about *this account's* workspace. A
different workspace, or a rebuilt one, is a different URL.

Handled by making the constant a default that `ALIBABA_MAAS_BASE_URL` overrides,
with a test (`the_workspace_id_is_overridable`) pinning that the override wins.

## 7. Implementation

`ghostclaw-os/crates/providers/src/alibaba.rs` — same guardrails as the other
lanes, shared rather than re-implemented:

- egress redaction gate before any payload leaves
- circuit breaker keyed on `alibaba-maas`
- hash-chained receipt per call
- connect 10s / total 120s, one retry
- M2.4 empty-content retry at 4096 — `glm-5.2` needed it here, as on maxplus
- exhaustion detection shared with cointh, so a spent quota falls through to the
  leaf lane without tripping the breaker

**One thing this lane needs that the others did not:** `glm-5.2-fast-preview`
returned `OK.</think></think>OK.` to a one-word prompt — reasoning markup leaking
into content. `strip_reasoning_markup` removes it, with a test using that exact
string and another asserting the word "think" in ordinary prose survives.

### Wired 2026-07-25

`crates/providers/src/family.rs` classifies a model id by prefix and returns the
lanes Rev G §3 prefers for it. Prefix matching rather than a lookup table: one
lane alone lists 151 ids, and a table goes stale on the first point release.

`TieredRouter::for_model(model)` builds the chain; `standard()` now delegates to
it. The primary comes from the family, the leaf and the Rev E remainder are the
same for everything.

**The leaf reads `MAXPLUS_KEY_CHINESE`, not `MAXPLUS_API_KEY`.** A maxplus pool is
bound to the key, and on 2026-07-25 the key held in `MAXPLUS_API_KEY` was moved to
the VIP pool, which answers model lists but rejects inference — 400 at the root,
503 on `/maxpools` and `/subpools`. The Chinese Specials key is the one that
completes requests, so that is the one the leaf uses, with the old variable as a
fallback.

Five routing tests assert the wiring rather than the intent:

```
glm_goes_to_cointh_first ........................... ok
qwen_deepseek_and_kimi_go_to_alibaba_first ......... ok
claude_starts_at_the_leaf_because_no_primary_serves_it  ok
maxplus_is_never_above_a_primary ................... ok
the_chain_still_works_with_every_optional_key_missing  ok
```

`maxplus_is_never_above_a_primary` is the one worth keeping: Rev D §3 classifies
maxplus as LEAF, and this fails if it ever sorts first for a model a primary
serves — the way that classification would quietly stop being true.

The first version of these tests failed intermittently. Environment variables are
process-global and cargo runs tests in a crate on parallel threads, so the "no
keys configured" case was racing the others. They now share a mutex.

```
$ cargo test -p ghostclaw-providers   # ×3, stable
44 passed; 0 failed

$ cargo test --workspace
102 passed; 0 failed
```

## 8. Cost note

The 70M free tokens are a starting balance, not a standing state. Nothing in this
lane tracks consumption yet — when it runs out, the exhaustion path in §7 sends
traffic to maxplus, which is metered. Worth a budget cap before this lane carries
real volume.

## 9. Labels

| Claim | Label |
|---|---|
| 151 ids from `GET /compatible-mode/v1/models` | VERIFIED (raw) |
| 11/11 smoke tests, both wire formats | VERIFIED (raw, per id) |
| Latency table in §3 | VERIFIED as measurements; one sample each, not benchmarks |
| `qwen3.8` absent | VERIFIED (searched the live list) |
| The other 140 ids | UNVERIFIED — listed, not probed |
| `/api/v1` DashScope path | UNVERIFIED — not probed |
| Chain in §2 | PROPOSED |
| Free-tier balance and burn rate | UNVERIFIED — not instrumented |
