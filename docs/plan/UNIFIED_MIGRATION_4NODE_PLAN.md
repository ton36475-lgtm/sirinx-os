# UNIFIED MIGRATION — 4-NODE SERVER + KALI SECURITY PLAN

**Status: PROPOSED — awaiting 🔴 human approval (Tony)**
**Created: 2026-07-31**
**Governance: GHOSTCLAW OS Master Alignment v1.0 — TRIAGE → MAKER → CHECKER → GUARD**

> Every infrastructure mutation described here (provision, deploy, DNS, billing,
> firewall change) is 🔴 RED under `GHOSTCLAW/policies/approval-matrix.yaml`.
> Nothing in this document may be executed by an agent. It is a plan only.

---

## 0. Evidence baseline (what is actually true today)

| Claim | Label | Evidence |
|---|---|---|
| `GHOSTCLAW/` governance assets exist in `sirinx-os` | VERIFIED | commit `c02ce5b`, 19 files |
| A2A2A protocol + department workers documented | VERIFIED | commit `4dfa2ae`, 12 files |
| Rust workspace exists in `sirinx-co` (8 crates) | VERIFIED | `sirinx-co/Cargo.toml` + `crates/*/Cargo.toml` |
| GHOSTCLAW Rust workspace per promptpack `[5]` layout | **DOES NOT EXIST** | no `crates/core`, `crates/hermes`, `crates/mcp-server`, `crates/telegram` found in any repo |
| Any prior 4-server plan | **DOES NOT EXIST** | filesystem search across all 19 repos returned zero matches |
| Any prior Kali configuration | **DOES NOT EXIST** | same search, zero matches |
| Codex "Record workflow as skill" session output | **UNVERIFIED — NOT IN REMOTE** | work is local-only on `MacminiSirinx.local:/Users/sirinx/sirinx-os`, never committed |
| Server specs, hostnames, provider, region, budget | **UNKNOWN** | VERIFY AT BUILD TIME — Tony must supply |

**Blocking carry-over from prior session:** `oz-corp-omega-dual-node` contains a
committed OpenSSH private key at repo root (tab-named files `\t` and `\t.pub`),
present in git history. Treat as compromised. Rotation + history purge is
Phase 0 and requires Tony. No node in this plan may reuse that key material.

---

## 1. Node topology (PROPOSED)

Four servers, each with one job. Blast radius is contained by role separation,
not by trust.

```
                    Internet
                        │
              [Cloudflare Tunnel + Access]
                        │
   ┌────────────────────▼────────────────────┐
   │ NODE-1  EDGE / GATEWAY                  │  public-facing (tunnel only)
   │ Go API gateway, TLS term, WAF,          │  NO inbound 22 from internet
   │ rate limit, signed service tokens       │
   └────────────────────┬────────────────────┘
                        │ mTLS, private network only
   ┌────────────────────▼────────────────────┐
   │ NODE-2  CORE / APPLICATION              │  no public IP
   │ Rust core (axum), Python orchestration, │
   │ Next.js SSR, agent runtime              │
   └────────────────────┬────────────────────┘
                        │ private network only
   ┌────────────────────▼────────────────────┐
   │ NODE-3  DATA                            │  no public IP, no egress to internet
   │ Postgres (primary), MongoDB, Redis,     │
   │ encrypted backups, PITR                 │
   └─────────────────────────────────────────┘

   ┌─────────────────────────────────────────┐
   │ NODE-4  SECURITY / OPS (Kali)           │  NO inbound at all
   │ Kali toolchain, SIEM/log sink,          │  egress to in-scope targets only
   │ scheduled scans, gitleaks CI runner     │  separate credential domain
   └─────────────────────────────────────────┘

   [MacminiSirinx.local]  sovereign local node — Ollama :11434 bound to
   localhost, dev workstation, Codex/Claude CLI. NEVER exposed via tunnel.
```

### Why four, and why this split

- **NODE-1 is the only thing the internet can reach**, and it reaches it through
  a Cloudflare named tunnel — no origin IP is ever published, so there is no
  port to scan. It terminates auth and forwards *signed* service tokens inward.
  This directly replaces the `X-User-ID`-header-trust pattern found in
  `automation-system-backend`, which is not safe to carry forward.
- **NODE-2 holds all business logic and every agent process.** If an agent
  misbehaves, it is one hop from data and zero hops from the internet.
- **NODE-3 has no route to the internet at all.** Backups are pulled, not pushed.
  A compromised app node cannot exfiltrate a database it cannot dial out from.
- **NODE-4 is deliberately isolated in both directions.** A security node that
  can be reached from the app tier is a lateral-movement gift; a security node
  that shares credentials with production is worse.

---

## 2. Kali node (NODE-4) — configuration policy

**Authorization scope is the first control, not the last.**
NODE-4 may only scan hosts on an explicit written allowlist covering assets
Tony owns or is contractually authorized to test. Scanning anything else — a
supplier, a competitor, a "let's just check" third party — is out of scope and
must be refused, regardless of who asks.

| Control | Setting |
|---|---|
| Inbound | none. Management via Tailscale/WireGuard from Mac mini only |
| Egress | allowlist of in-scope targets; default deny |
| Credentials | own domain, own vault namespace, zero shared secrets with prod |
| Scan cadence | scheduled, off-peak, rate-limited; never unannounced against prod |
| Result handling | findings → SIEM on same node → summary report only leaves node |
| Destructive tooling | exploit/DoS modules disabled by policy; recon + config audit only |
| Retention | raw scan output 30d, findings 1y, both encrypted at rest |

**In-scope tooling (defensive/audit posture):** `nmap` service+config audit,
`nuclei` with CVE templates, `trivy`/`grype` for container and dependency CVEs,
`gitleaks` for secret scanning (already needed for the Phase 0 key incident),
`ssh-audit`, `testssl.sh`, `lynis` for host hardening baselines.

**Explicitly out of scope on this node:** anything aimed at systems outside the
allowlist, credential-stuffing tooling, and any automated exploitation against
production. Findings get remediated through the normal 🔴 gate, not patched by
an agent mid-scan.

---

## 3. Security perimeter (applies to all nodes)

1. **Secrets** — vault-backed, never in `.env` in git. `.env.example` holds names
   only. `gitleaks` pre-commit hook mandatory on every repo. This is not
   theoretical: the account already leaked one SSH key this way.
2. **SSH** — key-only, no password auth, no root login, port not exposed to
   internet on any node. Access via private mesh only.
3. **Service-to-service auth** — signed short-lived tokens issued by NODE-1.
   No downstream service trusts a plain header.
4. **Database** — least-privilege roles per service, no shared superuser,
   TLS required, `chokma-growth-os` data in a fully separate database and
   credential boundary per the council's compliance finding.
5. **Ollama** — stays bound to `127.0.0.1` on the Mac mini. Never tunneled;
   its pull/delete endpoints can destroy local models.
6. **Audit** — every 🔴 approval (who/when/what) written to an append-only log
   on NODE-4, mirrored off-host.

---

## 4. Migration phases (each gate = raw evidence)

| Phase | Work | Gate (raw evidence required) |
|---|---|---|
| **0** | Rotate + purge leaked SSH key; account-wide gitleaks sweep | raw `gitleaks detect` output clean on all 19 repos; key confirmed revoked by Tony |
| **1** | Recover Codex work from Mac mini; resolve canonical-app decision (`sirinx` vs `sirinx-os` vs `sirinx-solar-energy`); confirm `sirinx-os` real default branch | raw `git log` showing Codex commits on remote; Tony's written decision quoted verbatim |
| **2** | Provision 4 nodes, private mesh, no services yet | raw `ssh` + `ip a` + firewall rule dump from each node |
| **3** | NODE-3 data tier: Postgres + Mongo + backup/PITR | raw `pg_isready`, restore-from-backup drill output |
| **4** | NODE-2 core: Rust + Python runtime + agent processes | raw `cargo test` green; agent dry-run with `live_send=false` |
| **5** | NODE-1 edge: Go gateway + tunnel + Access | raw curl through tunnel; raw 401 proving unsigned request rejected |
| **6** | NODE-4 Kali: tooling, allowlist, SIEM, scheduled scans | raw scan output against in-scope host; raw proof egress-deny works |
| **7** | Vertical cutover in readiness order; `chokma` last and isolated | per-vertical smoke test raw output |
| **8** | Full perimeter audit, observability, decommission legacy repos | raw audit report; raw green CI across unified repo |

**No phase may start before the prior phase's gate produces raw output.**
This mirrors the S1–S4 gating already locked in the GHOSTCLAW promptpack.

---

## 5. Decisions required from Tony (🔴 — cannot be automated)

1. **Rotate the leaked SSH key** and authorize the history rewrite.
2. **Recover the Codex session work** from `MacminiSirinx.local` (commit + push),
   or confirm it should be abandoned and rebuilt.
3. **Server specifics** — provider, region, sizing, budget, hostnames. Nothing
   in this plan hardcodes these because none of them are known. VERIFY AT BUILD TIME.
4. **Which app is canonical** among `sirinx` / `sirinx-os` / `sirinx-solar-energy`.
5. **Kali scan allowlist** — the explicit list of hosts Tony owns/is authorized
   to test. NODE-4 does not get built until this list exists in writing.
6. **P097-R approval** (sovereign local Rust host + tunnel) — still PROPOSED in
   the promptpack; this plan assumes it but does not depend on it.

---

## 6. Open drift risks

- The promptpack `[5]` layout describes a GHOSTCLAW Rust workspace that has
  never been built. Either build it, or update the promptpack to point at
  `sirinx-co/crates` as the real core. Leaving both in the docs is drift.
- `sirinx-os` is a pnpm/Turbo monorepo with several satellite apps that grew
  after its docs were last written; unification must reconcile those before
  cutover, not during.
- 46 skill definitions exist across `sirinx-skills-kit` and
  `unknowcoding-newbie-dev-skill` with real overlap; consolidate to one library
  with a working validator (`validate-skills.mjs` is currently a broken reference).

---

*Nothing in this document has been executed. All infrastructure items are*
*PROPOSED and gated on 🔴 human approval per GHOSTCLAW governance.*
