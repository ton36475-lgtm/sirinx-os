#!/usr/bin/env bash
# P101 local evidence initializer. This script never dispatches worker commands.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PHASE="BASELINE"
INIT_ARCH_MAP=0
RUNTIME_ROOT="${SIRINX_P101_RUNTIME_ROOT:-${REPO_ROOT}/.ghostclaw_runtime/p101/baseline}"
OUTPUT="${RUNTIME_ROOT}/architecture-map.json"
RECEIPT="${RUNTIME_ROOT}/receipt.json"
CANVAS_OUTPUT=""
INVENTORY_OUTPUT=""

usage() {
  cat <<'EOF'
Usage: scripts/hermes-autoloop-m2.sh --phase BASELINE --init-arch-map [options]

Options:
  --output PATH         Architecture map JSON output
  --receipt PATH        Local receipt JSON output
  --inventory-output PATH  Optional standalone inventory JSON output
  --canvas-output PATH  Optional Obsidian Canvas output

This command is read-only with respect to workers and external systems. It does
not send tmux keys, call providers, mutate Cloudflare, or append Obsidian notes.
Use the canonical a2a_obsidian_sync.py helper separately for a digest pulse.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --phase)
      PHASE="${2:?missing value for --phase}"
      shift 2
      ;;
    --init-arch-map)
      INIT_ARCH_MAP=1
      shift
      ;;
    --output)
      OUTPUT="${2:?missing value for --output}"
      shift 2
      ;;
    --receipt)
      RECEIPT="${2:?missing value for --receipt}"
      shift 2
      ;;
    --canvas-output)
      CANVAS_OUTPUT="${2:?missing value for --canvas-output}"
      shift 2
      ;;
    --inventory-output)
      INVENTORY_OUTPUT="${2:?missing value for --inventory-output}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    --mode|--execute|--auto-approval)
      echo "blocked: live or auto-approval modes are not supported by this initializer" >&2
      exit 64
      ;;
    *)
      echo "unknown argument: $1" >&2
      usage >&2
      exit 64
      ;;
  esac
done

if [[ "$PHASE" != "BASELINE" || "$INIT_ARCH_MAP" -ne 1 ]]; then
  echo "blocked: --phase BASELINE --init-arch-map is required" >&2
  exit 64
fi

COMMAND=(
  python3
  "${REPO_ROOT}/GHOSTCLAW/P101/tools/p101/scripts/baseline_arch_map.py"
  --repo "$REPO_ROOT"
  --phase "$PHASE"
  --output "$OUTPUT"
  --receipt "$RECEIPT"
)
if [[ -n "$CANVAS_OUTPUT" ]]; then
  COMMAND+=(--canvas-output "$CANVAS_OUTPUT")
fi
if [[ -n "$INVENTORY_OUTPUT" ]]; then
  COMMAND+=(--inventory-output "$INVENTORY_OUTPUT")
fi

exec "${COMMAND[@]}"
