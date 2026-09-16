# MaxPlus GLM-5.2 Guard Canary Matrix

Mission ID: `GC-MAXPLUS-GLM52-LAYERED-LOCK-20260630-001`
Packet ID: `P01-maxplus-glm52-safe-harness`

## Status

Template-only. The guard hooks, launcher, and runtime canaries have not been
implemented or executed because the exact implementation gate is not present.

## Identity Canary

The identity canary must verify host-side identity evidence only. It must not
trust model self-description or the Claude Code harness name.

Expected result:

```text
effective_model: glm-5.2
provider: maxplus
identity: glm-5.2 via MaxPlus proxy; not native Claude
truth_source: settings/env/launcher/receipt/canary
self_claim_policy: rejected_as_evidence
```

Template:

`.ghostclaw_runtime/a2a2a/templates/maxplus_glm52_identity_canary_prompt.md`

## PreTool Block Matrix

The pretool guard must block these command families before any shell execution:

- `git push`
- `git merge`
- `git rebase`
- deploy commands
- `curl`
- `wget`
- `ssh`
- `scp`
- `rsync`
- install commands
- migration commands
- provider/model batch calls
- model downloads
- GPU-heavy jobs
- `.env` or secret reads
- destructive delete operations

Machine-readable template:

`.ghostclaw_runtime/a2a2a/templates/maxplus_glm52_pretool_blocked_commands.json`

## Required Proof After Implementation

- JSON settings parse.
- Python hooks compile.
- Launcher is executable.
- Push/deploy/install/network/secret canary attempts are denied by guard logic.
- Identity canary output cites config/env/receipt only.
- No secret-like token value appears in settings, hooks, launcher, docs, or receipts.
