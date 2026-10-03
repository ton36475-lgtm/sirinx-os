# Mac External Storage Migration Runbook

**Target:** \`/Users/sirinx\` on the Mac mini M2  
**Mode:** evidence-gated migration; preserve bootability and service continuity  
**Status:** blocked from execution until an authorized Mac execution channel is online

## Scope

Move heavy, reproducible workloads to a USB/Thunderbolt storage tier while keeping the Mac system, user configuration, credentials and control-plane identity stable.

### Preferred data tiers

\`\`\`text
Internal SSD
  - macOS system files
  - Homebrew / core executables
  - ~/.ssh, Keychain-backed credentials, shell identity
  - lightweight source metadata and active workspaces

External fast storage
  - model weights / GGUF / MLX artifacts
  - Hugging Face caches
  - training checkpoints and datasets
  - Docker / OrbStack VM data only through vendor-supported migration
  - large build caches and reproducible artifacts

NAS / remote storage
  - archive copies
  - cold datasets
  - benchmark history
\`\`\`

## Preflight — read only

\`\`\`bash
set -euo pipefail
hostname
sw_vers
uname -a
diskutil list
mount
command -v docker >/dev/null 2>&1 && echo docker=installed || echo docker=missing
command -v orb >/dev/null 2>&1 && echo orb=installed || echo orb=missing
command -v rsync >/dev/null 2>&1 && echo rsync=installed || echo rsync=missing
command -v git >/dev/null 2>&1 && echo git=installed || echo git=missing
du -xhd 2 "$HOME/Library" 2>/dev/null | sort -h | tail -40 || true
du -xhd 2 "$HOME/.cache" 2>/dev/null | sort -h | tail -40 || true
docker system df 2>/dev/null || true
orb status 2>/dev/null || true
\`\`\`

Do not use \`mv\`, \`rm\`, filesystem links or application settings changes until the destination filesystem, free space, service state and rollback location are recorded.

## Docker Desktop

Use Docker Desktop's supported **Resources → Advanced → Disk image location** mechanism rather than moving the disk image directly in Finder or with a blind filesystem move.

Before changing the location: stop Docker Desktop fully, record the current image path and size, verify external capacity/mount stability, create a backup/snapshot when needed, change location via the UI, restart, then verify images, containers, volumes and services. Rollback uses the recorded original location.

## OrbStack

Use **Settings → Storage** and the application's supported migration workflow. Do not assume that merely pointing storage at an external disk migrates existing data. Verify the real data image location and disk consumption after the move.

Post-migration checks:

\`\`\`bash
orb status
docker context show
docker ps
docker volume ls
docker images
\`\`\`

## Workspace / model data

Reproducible data can be copied and verified with:

\`\`\`bash
rsync -aHAX --numeric-ids --info=progress2 \
  "$HOME/sirinx-os/" \
  "/Volumes/SIRINX-DATA/sirinx-os/"
\`\`\`

Keep the source until at least one full service restart and integrity check has passed.

Recommended external directories:

\`\`\`text
/Volumes/SIRINX-DATA/models/
/Volumes/SIRINX-DATA/huggingface/
/Volumes/SIRINX-DATA/checkpoints/
/Volumes/SIRINX-DATA/datasets/
/Volumes/SIRINX-DATA/docker/
/Volumes/SIRINX-DATA/orbstack/
/Volumes/SIRINX-DATA/build-cache/
\`\`\`

Do not move or copy \`~/.ssh/\`, Keychain data, real \`.env\` files, API keys/tokens, OS system directories, or application databases without a verified vendor migration path.

## Service continuity gates

\`\`\`text
[ ] Mac boots normally
[ ] Tailscale identity unchanged
[ ] GhostClaw authority state unchanged
[ ] Hermes/OpenCode/Codex resolve model endpoints
[ ] LiteLLM health passes
[ ] MySQL health passes
[ ] Redis health passes
[ ] n8n health passes
[ ] Ollama/llama.cpp endpoints respond
[ ] OrbStack/Docker containers and volumes visible
[ ] model files checksum/size verified
[ ] benchmark smoke passes
[ ] receipt written
\`\`\`

## Migration gate

No source deletion occurs during the first pass. Cleanup is a separate evidence-backed mission after successful reboot, service validation and rollback-window completion.
