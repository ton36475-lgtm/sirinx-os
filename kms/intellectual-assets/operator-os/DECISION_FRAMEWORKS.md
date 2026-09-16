# DECISION_FRAMEWORKS — SIRINX Operator OS

> Portable decision frameworks. Each one is a checklist an AI (or a human at 2 a.m.)
> can execute without extra context. Reference: AGENTS.md §5, §6, §15, §16.

---

## F1 — Pipeline vs Agent vs Hybrid

Ask in order; first "yes" decides:

1. Are the steps known in advance AND business rules clear? → **Pipeline**
2. Does the task require tool choice based on feedback / replanning? → **Agent (bounded, A4 max)**
3. Is it production + customer-facing? → **Hybrid**: pipeline skeleton, agent inside bounded
   sections, human approval on every external action.

Anti-pattern: calling a cron-triggered 5-step workflow "an agent". Name things honestly.

## F2 — Autonomy assignment (before building any feature)

```text
1. What is the worst thing this feature can do if the model hallucinates?
2. Map that worst case to A0–A7.
3. Build one level BELOW the level you think you need.
4. External write of any kind → A5 floor (human approval).
```

## F3 — Tool-tier gate (T0–T8)

| Question | If yes |
|----------|--------|
| Read-only, local? | T0–T2, proceed |
| Costs money? | T5 → approval |
| Writes to external system? | T6 → approval always |
| Cloud/deploy/payment/customer? | T7 → approval + rollback plan |
| Arbitrary shell / secret read? | T8 → refuse |

## F4 — Ship / Hold decision (release gate compression)

Ship only when ALL are true:

- [ ] Baseline documented and reproducible (Gate 01)
- [ ] No secrets in code, PII masked (Gate 02)
- [ ] Browser/console QA clean (Gate 03)
- [ ] Claim guard active for anything customer-facing (Gate 04)
- [ ] correlation_id + cost tracking on every AI run (Gate 05)
- [ ] Rollback tested, kill switch reachable (Gate 08)

One unchecked box = HOLD. There is no "mostly passed".

## F5 — Build vs Buy vs Wrap

1. Is it core to SIRINX's moat (agent governance, solar intelligence, live studio)? → **Build**
2. Is it commodity infra (queue, db, monitoring)? → **Buy/OSS**
3. Is it a capability an existing tool has 80% of? → **Wrap** with an adapter +
   kill switch, never fork.

## F6 — Cost guard decision

```text
attempt > MAX_REPAIR_ATTEMPTS (2)     → stop, human review
spend  > MAX_SPEND_PER_TASK_USD (5)   → stop, human review
runtime > MAX_RUNTIME_MINUTES (60)    → stop, human review
same failure twice                    → stop, do NOT retry a third time
```

## F7 — Claim verification (external AI/benchmark claims)

1. Load the authoritative source directly.
2. Distinguish "listed as feature" vs "verified numbers on a page that loads".
3. 404 or unsourced → downgrade to "claimed / not independently verified".
4. Never repeat a number you didn't see at the source.

## F8 — Readiness language (SRL, never "production ready")

Use SRL-0…9. Current honest levels get written in PROJECT_STATE.md with evidence paths.
"Production ready" without an SRL number and evidence is a forbidden phrase.
