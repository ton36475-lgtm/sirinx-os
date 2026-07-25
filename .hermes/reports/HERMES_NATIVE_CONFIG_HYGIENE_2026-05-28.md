# Hermes Native Config Hygiene - 2026-05-28

Status: APPLIED, NO RESTART

Mode: local reversible config hygiene after operator approval

## Changes Applied

### 1. Native terminal backend

File:

```text
/Users/sirinx/.hermes/config.yaml
```

Backup:

```text
/Users/sirinx/.hermes/config.yaml.bak.codex-native-terminal-20260528-135036
```

Diff:

```diff
terminal:
-  backend: docker
+  backend: local
```

Reason:

The Mac mini plan is native/no-Docker. Hermes logs showed Docker backend failures because Docker daemon is not responding. Switching `terminal.backend` to `local` aligns the runtime with the native install and prevents future terminal tool calls from trying Docker after config reload.

### 2. Remove missing cron skill reference

File:

```text
/Users/sirinx/.hermes/cron/jobs.json
```

Backup:

```text
/Users/sirinx/.hermes/cron/jobs.json.bak.codex-remove-missing-web-20260528-135101
```

Diff:

```diff
      "skills": [
        "youtube-content",
-       "skill-creator",
-       "web"
+       "skill-creator"
      ],
```

Reason:

Gateway logs showed:

```text
Cron job 'youtube-skill-learner': skill not found, skipping — Skill 'web' not found.
```

Local skill lookup found `youtube-content` and `skill-creator`, but not `web` in the Hermes skill paths. Removing only the missing `web` entry keeps the job intent while removing the stale blocker.

## Validation

```text
config-yaml-ok
terminal.backend=local
cron-json-ok
youtube.skills=youtube-content,skill-creator
```

## Actions Not Taken

- No secrets printed.
- No `.env` read.
- No gateway restart.
- No LaunchAgent unload/load/kickstart.
- No package install.
- No Docker start.
- No provider/model mutation.
- No Telegram/WhatsApp send.
- No deploy, push, or publish.

## Apply Timing

The config change is written to disk. The running Hermes gateway may need a future controlled restart to pick up `terminal.backend=local`; no restart was performed in this pass to avoid disrupting active Telegram/WhatsApp sessions.

## Rollback

```bash
cp /Users/sirinx/.hermes/config.yaml.bak.codex-native-terminal-20260528-135036 /Users/sirinx/.hermes/config.yaml
cp /Users/sirinx/.hermes/cron/jobs.json.bak.codex-remove-missing-web-20260528-135101 /Users/sirinx/.hermes/cron/jobs.json
```
