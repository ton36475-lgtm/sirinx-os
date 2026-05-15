#!/usr/bin/env bash
set -euo pipefail

cd /Users/sirinx/sirinx-os
thclaws -p \
  --model ollama/hermes-prime-lite \
  --permission-mode ask \
  --max-iterations 1 \
  --disallowed-tools Bash,Edit,Write \
  "Reply with exactly: SIRINX_THCLAWS_LIGHT_OK"
