# A2A2A P081 Packet 041 Worker Liveness Audit

Status: `WORKERS_NOT_ACTIVE_FOR_P079_ACK`
Updated: `2026-07-03T12:14:37+07:00`

## Summary

P081 performed a read-only liveness audit after P080 showed that the new P079
`packet_041` Hermes/KOB envelopes had no current receiver-side ack.

The result explains why the new ack is still missing: the runtime has stale PID
hint files for `ghostclaw-hermes` and `ghostclaw-kob`, but no active tmux
sessions with those names and no persistent role-worker process was found.

## Current Findings

- `tmux` exists at `/opt/homebrew/bin/tmux`.
- Active tmux sessions observed: `sirinx-site-preview` only.
- `.ghostclaw_runtime/a2a2a/pids/hermes.pid` contains `tmux:ghostclaw-hermes`.
- `.ghostclaw_runtime/a2a2a/pids/kob.pid` contains `tmux:ghostclaw-kob`.
- The PID hint names were not present in current tmux sessions.
- `role-worker-processed-hermes.json` updated at `2026-07-02T19:57:34.111430Z`.
- `role-worker-processed-kob.json` updated at `2026-07-02T19:57:34.158088Z`.
- Latest Hermes/KOB logs show processing for older `packet_041` files from
  `2026-07-02T19:05:01Z`, not the new P079 files from `2026-07-03T04:56:10Z`.

## Read-Only Worker Entrypoint Check

`scripts/ghostclaw_a2a_role_worker.py --help` confirms the script supports the
needed safe shape:

- `--agent {hermes,kob}`
- `--packet PACKET`
- `--once`

That means the next safe action can stay one-shot and packet-scoped rather than
starting a persistent worker loop.

## Next Gate

The next exact gate remains:

```text
APPROVE_A2A2A_P080_PACKET041_LOCAL_ROLE_WORKER_ACK_ONLY
```

After that gate only, Codex may run one-shot local ack for exactly these two
files:

- `.ghostclaw_runtime/a2a2a/inbox/hermes/queue_coord_packet_041_hermes_20260703T045610_739524Z.json`
- `.ghostclaw_runtime/a2a2a/inbox/kob/queue_coord_packet_041_kob_20260703T045610_739524Z.json`

## Still Blocked

- persistent worker loop/start/restart
- queue payload execution
- Telegram/LINE/customer live send
- provider/model call
- repo/customer-data external routing
- source mutation
- install
- commit
- push
- deploy
- secret read/print
- Cloudflare/R2 mutation

