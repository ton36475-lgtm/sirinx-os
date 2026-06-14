# SIRINX Hermes CLI Performance PR 31968

Date: 2026-05-27
Status: verified upstream PR, local-only research note

## Source

Primary source:

```text
https://github.com/NousResearch/hermes-agent/pull/31968
```

PR:

```text
perf(cli): cut hermes startup 63% - flip head-to-head vs codex
```

State:

```text
MERGED
Merged at: 2026-05-25T10:06:39Z
```

Files touched:

```text
agent/secret_sources/bitwarden.py
hermes_cli/env_loader.py
hermes_cli/main.py
tests/test_bitwarden_secrets.py
```

## Verified PR Claims

The PR describes three startup-path optimizations for Hermes CLI invocations:

1. Persist Bitwarden Secrets Manager fetches across CLI invocations with an L2 disk cache.
2. Lazy-load the provider model catalog instead of importing it on normal startup.
3. Deduplicate `config.yaml` reads in the top-level CLI bootstrap path.

Reported benchmark:

```text
hermes --version median warm wall time:
before: 701 ms
after: 258 ms
delta: -443 ms / -63%
```

Reported head-to-head framework-overhead benchmark:

```text
before: Hermes 5/11 wins, Codex 6/11 wins
after:  Hermes 6/11 wins, Codex 5/11 wins
```

The PR explicitly frames this as framework overhead measurement, not proof that one agent is globally better across code quality, reasoning quality, or safety.

## Engineering Lesson

For agent systems, model quality is only one part of perceived capability. Repeated startup work, provider catalog imports, config parsing, secret-source round trips, and gateway-spawned process overhead can compound across multi-turn tasks.

Optimization priority for SIRINX should be:

```text
measure framework overhead
-> cache safe repeated work
-> lazy-load rarely used catalogs
-> remove duplicate config reads
-> verify with local benchmarks
-> keep quality/safety metrics separate
```

## SIRINX Application

Candidate local follow-up:

```text
Part 7.16 - SIRINX Agent Runtime Overhead Profiler
```

Scope:

- measure CenterBrain API route latency
- measure Hermes gateway status latency
- measure Agent Launch Gate and Agent Driver response latency
- measure Repo Intake Gate dry-run latency
- keep benchmark output local-only under `docs/knowledge/evidence`
- do not call paid providers
- do not execute real agent work

Suggested local endpoints:

```text
GET  /api/runtime-overhead-profiler
POST /api/runtime-overhead-profiler/benchmark/dry-run
```

Blocked:

- no provider benchmark claims without controlled local evidence
- no marketing claim that Hermes is better than Codex globally
- no secret-source benchmark if it touches real tokens
- no gateway restart as part of benchmark unless separately approved

## Stop Point

```text
HERMES CLI PERFORMANCE PR RECORDED - LOCAL ONLY - WAITING FOR RUNTIME PROFILER APPROVAL
```
