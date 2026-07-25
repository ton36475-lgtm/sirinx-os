#!/bin/bash
# GHOSTCLAW Config Gate V1 Runner
# Usage: bash config_gate_run.sh [--step N | --all] [--approve EXACT_GATE]
# Default mode is local-safe. Install/write steps emit plans only unless both:
#   1) --approve EXACT_GATE is provided
#   2) GHOSTCLAW_ENABLE_MUTATION=1 is exported by the operator

set -euo pipefail

REPO="/Users/sirinx/sirinx-os"
RECEIPT_DIR="$HOME/.ghostclaw/receipts"
LOG_DIR="$RECEIPT_DIR/config_gate_v1_logs"
APPROVAL=""
RUN_MODE="--all"
STEP=""
mkdir -p "$RECEIPT_DIR" "$LOG_DIR" "$HOME/.codex"

cd "$REPO"

log_step() {
    echo "[$(date +%H:%M:%S)] $1" | tee -a "$LOG_DIR/runner.log"
}

parse_args() {
    while [ "$#" -gt 0 ]; do
        case "$1" in
            --all)
                RUN_MODE="--all"
                shift
                ;;
            --step)
                if [ -z "${2:-}" ]; then
                    echo "Missing value for --step"
                    exit 1
                fi
                RUN_MODE="--step"
                STEP="$2"
                shift 2
                ;;
            --approve)
                if [ -z "${2:-}" ]; then
                    echo "Missing value for --approve"
                    exit 1
                fi
                APPROVAL="${2:-}"
                shift 2
                ;;
            *)
                echo "Usage: $0 [--step N | --all] [--approve EXACT_GATE]"
                exit 1
                ;;
        esac
    done
}

mutation_open() {
    [ "${GHOSTCLAW_ENABLE_MUTATION:-0}" = "1" ]
}

require_gate() {
    local required="$1"
    local action="$2"
    if [ "$APPROVAL" != "$required" ] || ! mutation_open; then
        log_step "GATED: $action requires --approve $required and GHOSTCLAW_ENABLE_MUTATION=1"
        return 1
    fi
    return 0
}

# Step 0: Precheck
precheck() {
    log_step "=== PRECHECK ==="
    git status --short | tee "$LOG_DIR/00_git_status_before.txt"
    python3 --version | tee "$LOG_DIR/00_python_version.txt"
    node --version | tee "$LOG_DIR/00_node_version.txt" || true
    npm --version | tee "$LOG_DIR/00_npm_version.txt" || true
}

# Step 1: Secret Hygiene Scan
secret_scan() {
    log_step "=== SECRET HYGIENE SCAN ==="
    rg -l "(api[_-]?key|secret|token|password|BEGIN PRIVATE KEY|ccsk-|sk-|ghp_|xoxb-|AKIA)" . \
      --hidden \
      --glob '!node_modules' \
      --glob '!.git' \
      --glob '!.env' \
      --glob '!.env.*' \
      --glob '!secrets/**' \
      --glob '!dist' \
      --glob '!build' \
      --glob '!.next' \
      | sed 's#^\./##' \
      | tee "$LOG_DIR/01_secret_hygiene_paths_only.txt" || true
}

# Step 2: Plan or install 9Router
install_9router() {
    log_step "=== 9ROUTER INSTALL GATE ==="
    if ! require_gate "APPROVE_INSTALL_9ROUTER_A019E53EE" "install_9router"; then
        {
            echo "status=blocked_plan_only"
            echo "required_gate=APPROVE_INSTALL_9ROUTER_A019E53EE"
            echo "required_env=GHOSTCLAW_ENABLE_MUTATION=1"
            echo "planned_command=npm install -g 9router"
            echo "planned_verification=9router --version"
        } > "$LOG_DIR/10_9router_install.plan.txt"
        return 0
    fi
    if command -v npm >/dev/null 2>&1; then
        npm install -g 9router 2>&1 | tee "$LOG_DIR/10_9router_install.txt" || true
        9router --version 2>&1 | tee "$LOG_DIR/11_9router_version.txt" || true
    else
        log_step "npm not found - skipping 9Router install"
    fi
}

# Step 3: Plan or write Codex config
write_codex_config() {
    log_step "=== CODEX CONFIG WRITE GATE ==="
    local proposal="$LOG_DIR/20_codex_config.proposed.toml"
    cat > "$proposal" <<'EOF'
model = "deepseek/deepseek-v4-pro"
model_provider = "ninerouter_local"
model_reasoning_effort = "medium"

[model_providers.ninerouter_local]
name = "9Router Local"
base_url = "http://localhost:20128/v1"
env_key = "NINEROUTER_API_KEY"
wire_api = "responses"

[model_providers.openrouter_direct]
name = "OpenRouter Direct"
base_url = "https://openrouter.ai/api/v1"
env_key = "OPENROUTER_API_KEY"
wire_api = "responses"

[profiles.deepseek]
model = "deepseek/deepseek-v4-pro"
model_provider = "ninerouter_local"

[profiles.glm]
model = "zhipuai/glm-5.2"
model_provider = "ninerouter_local"

[profiles.kimi]
model = "moonshotai/kimi-k2.7-code"
model_provider = "ninerouter_local"

[profiles.fable5]
model = "anthropic/claude-fable-5"
model_provider = "openrouter_direct"
model_reasoning_effort = "high"
EOF
    log_step "Codex config proposal written: $proposal"
    if ! require_gate "APPROVE_WRITE_CODEX_CONFIG_A019E53EE" "write_codex_config"; then
        return 0
    fi
    if [ -f "$HOME/.codex/config.toml" ]; then
        cp "$HOME/.codex/config.toml" "$HOME/.codex/config.toml.bak.$(date +%Y%m%d%H%M%S)"
    fi
    cp "$proposal" "$HOME/.codex/config.toml"
    log_step "Codex config written"
}

# Step 4: Plan or install Semgrep
install_semgrep() {
    log_step "=== SEMGREP INSTALL GATE ==="
    if ! require_gate "APPROVE_INSTALL_SEMGREP_A019E53EE" "install_semgrep"; then
        {
            echo "status=blocked_plan_only"
            echo "required_gate=APPROVE_INSTALL_SEMGREP_A019E53EE"
            echo "required_env=GHOSTCLAW_ENABLE_MUTATION=1"
            echo "preferred_existing_tool_check=command -v semgrep"
        } > "$LOG_DIR/30_semgrep_install.plan.txt"
        command -v semgrep >/dev/null 2>&1 && semgrep --version > "$LOG_DIR/31_semgrep_version.txt" 2>&1 || true
        return 0
    fi
    if command -v pipx >/dev/null 2>&1; then
        pipx install semgrep 2>&1 | tee "$LOG_DIR/30_semgrep_install.txt" || true
    elif command -v uv >/dev/null 2>&1; then
        uv tool install semgrep 2>&1 | tee "$LOG_DIR/30_semgrep_install.txt" || true
    elif command -v brew >/dev/null 2>&1; then
        brew install semgrep 2>&1 | tee "$LOG_DIR/30_semgrep_install.txt" || true
    else
        python3 -m pip install --user semgrep 2>&1 | tee "$LOG_DIR/30_semgrep_install.txt" || true
    fi
    semgrep --version 2>&1 | tee "$LOG_DIR/31_semgrep_version.txt" || true
}

# Step 5: Write final receipt
write_receipt() {
    log_step "=== WRITE FINAL RECEIPT ==="
    python3 <<'PY'
import json, time
from pathlib import Path
home = Path.home()
receipt_dir = home / '.ghostclaw' / 'receipts'
receipt_dir.mkdir(parents=True, exist_ok=True)
payload = {
    'mission': 'GHOSTCLAW_CONFIG_GATE_V1_RUNNER',
    'status': 'CONFIG_GATE_V1_COMPLETE_OPERATOR_REVIEW_REQUIRED',
    'ts': time.strftime('%Y-%m-%dT%H:%M:%S%z'),
    'repo': '/Users/sirinx/sirinx-os',
    'locks': {
        'fable5_next_gate': 'blocked_unless_explicit_high_reasoning_gate',
        'default_model_route': 'deepseek_glm_kimi_first',
        'install_9router': 'blocked_without_APPROVE_INSTALL_9ROUTER_A019E53EE_and_GHOSTCLAW_ENABLE_MUTATION',
        'write_codex_config': 'blocked_without_APPROVE_WRITE_CODEX_CONFIG_A019E53EE_and_GHOSTCLAW_ENABLE_MUTATION',
        'install_semgrep': 'blocked_without_APPROVE_INSTALL_SEMGREP_A019E53EE_and_GHOSTCLAW_ENABLE_MUTATION',
        'hermes_command_center': 'placed_only_not_run',
        'live_telegram': 'not_wired',
        'production': 'blocked',
        'git_push': 'blocked',
        'secrets_printed': 'blocked'
    },
    'operator_review_required': [
        'confirm 9Router endpoint responds',
        'triage Semgrep HIGH/CRITICAL if any',
        'confirm Hermes file placed and compiled but not run',
        'confirm no secrets were printed or committed',
        'request a separate exact gate before commit, push, deploy, provider calls, or Cloudflare R2 writes'
    ],
    'next_gate': 'CODEX_OPENCODE_OBSIDIAN_CLOUDFLARE_R2_REVIEW_GATE'
}
(receipt_dir / 'config_gate_v1.json').write_text(json.dumps(payload, ensure_ascii=False, indent=2))
print(f"Receipt written: {receipt_dir / 'config_gate_v1.json'}")
PY
}

# Main runner
main() {
    precheck
    secret_scan
    install_9router
    write_codex_config
    install_semgrep
    write_receipt
    log_step "=== RUNNER COMPLETE ==="
}

# Parse args
parse_args "$@"
case "$RUN_MODE" in
    --step)
        case "$STEP" in
            0) precheck ;;
            1) secret_scan ;;
            2) install_9router ;;
            3) write_codex_config ;;
            4) install_semgrep ;;
            5) write_receipt ;;
            *) echo "Unknown step: $STEP"; exit 1 ;;
        esac
        ;;
    --all)
        main
        ;;
    *) echo "Usage: $0 [--step N | --all]"; exit 1 ;;
esac
