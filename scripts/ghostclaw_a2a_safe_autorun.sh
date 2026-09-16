#!/usr/bin/env bash
set -Eeuo pipefail

MODE="${1:---preflight}"
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

EVIDENCE_DIR=".ghostclaw_runtime/evidence"
AUDIT_DIR=".ghostclaw_runtime/audit"
QUEUE_DIR=".ghostclaw_runtime/queue/hermes/inbox"
mkdir -p "$EVIDENCE_DIR" "$AUDIT_DIR" "$QUEUE_DIR"

timestamp() { date -Is; }

log() {
  printf '[%s] %s\n' "$(timestamp)" "$*" | tee -a "$EVIDENCE_DIR/run.log"
}

write_json_queue_seed() {
  cat > "$QUEUE_DIR/a2a-safe-boot-20260630-001.json" <<'JSON'
{
  "schema": "ghostclaw.a2a.queue.task.v1",
  "task_id": "A2A-SAFE-BOOT-20260630-001",
  "correlation_id": "corr-a2a-safe-boot-20260630-001",
  "decision_id": "dec-safe-local-autonomy-20260630-001",
  "mode": "safe_no_ask_local_autonomy",
  "target_agent": "hermes",
  "commander_agent": "hermes",
  "executor_agent": "codex-local",
  "objective": "Run local A2A preflight, validation, and evidence pack. Stop before external mutations.",
  "stop_before": ["git push", "deploy", "cloud mutation", "customer send", "paid provider call", "secret value read"]
}
JSON
}

preflight() {
  log "Starting safe A2A preflight in $ROOT"

  git status --short --branch | tee "$EVIDENCE_DIR/status.txt"
  git branch --show-current | tee "$EVIDENCE_DIR/branch.txt"
  git diff --stat | tee "$EVIDENCE_DIR/diff_stat.txt"
  git diff --name-only | tee "$EVIDENCE_DIR/diff_name_only.txt"
  git diff --check | tee "$EVIDENCE_DIR/diff_check.txt"
  git log --oneline -5 | tee "$EVIDENCE_DIR/git_log_oneline_5.txt"
  git ls-files --others --exclude-standard | tee "$EVIDENCE_DIR/untracked_files.txt"

  {
    echo "{"
    echo "  \"created_at\": \"$(timestamp)\","
    echo "  \"branch\": \"$(git branch --show-current | sed 's/"/\\"/g')\","
    echo "  \"changed_files\": ["
    paste -sd '\n' "$EVIDENCE_DIR/diff_name_only.txt" | sed 's/"/\\"/g' | awk 'NF { printf "    \"%s\",\n", $0 }' | sed '$ s/,$//'
    echo "  ],"
    echo "  \"untracked_files_count\": $(wc -l < "$EVIDENCE_DIR/untracked_files.txt" | tr -d ' '),"
    echo "  \"policy\": \"GHOSTCLAW-A2A-SAFE-AUTONOMOUS-EXECUTION-20260630\""
    echo "}"
  } > "$EVIDENCE_DIR/change_manifest.json"

  if git status --porcelain | awk '{print $2}' | grep -E '(^|/)(\.env|\.env\..*|.*secret.*|.*credential.*|.*token.*|.*key.*)$' >/dev/null 2>&1; then
    log "Protected secret-like path detected in worktree status. Stop before stage/commit."
    exit 20
  fi

  if git status --porcelain | awk '{print $2}' | grep -E '(^|/)(node_modules|dist|build|\.next|coverage)(/|$)' >/dev/null 2>&1; then
    log "Generated output path detected in worktree status. Stop before stage/commit."
    exit 21
  fi

  write_json_queue_seed
  log "Preflight complete. Evidence written to $EVIDENCE_DIR"
}

run_node_script_if_present() {
  local script_name="$1"
  if [ ! -f package.json ]; then
    return 0
  fi
  if ! command -v node >/dev/null 2>&1; then
    log "node not found; skip package script: $script_name"
    return 0
  fi

  if node -e "const p=require('./package.json'); process.exit(p.scripts && p.scripts['$script_name'] ? 0 : 1)" >/dev/null 2>&1; then
    if command -v pnpm >/dev/null 2>&1 && [ -f pnpm-lock.yaml ]; then
      log "Running pnpm $script_name"
      pnpm "$script_name" 2>&1 | tee -a "$EVIDENCE_DIR/validation_results.txt"
    elif command -v npm >/dev/null 2>&1; then
      log "Running npm run $script_name"
      npm run "$script_name" 2>&1 | tee -a "$EVIDENCE_DIR/validation_results.txt"
    else
      log "No npm/pnpm command available; skip package script: $script_name"
    fi
  fi
}

validate() {
  : > "$EVIDENCE_DIR/validation_results.txt"
  run_node_script_if_present lint
  run_node_script_if_present test
  run_node_script_if_present build

  if command -v pytest >/dev/null 2>&1 && [ -d tests ]; then
    log "Running pytest"
    pytest 2>&1 | tee -a "$EVIDENCE_DIR/validation_results.txt"
  fi

  if [ -f Cargo.toml ] && command -v cargo >/dev/null 2>&1; then
    log "Running cargo test"
    cargo test 2>&1 | tee -a "$EVIDENCE_DIR/validation_results.txt"
  fi

  if [ ! -s "$EVIDENCE_DIR/validation_results.txt" ]; then
    echo "No validation command found; documented no-test path." | tee "$EVIDENCE_DIR/validation_results.txt"
  fi
}

safe_commit() {
  preflight
  validate

  if [ ! -f gate_include_paths.txt ]; then
    log "Missing gate_include_paths.txt. Stop before staging."
    exit 30
  fi

  mapfile -t FILES < <(grep -vE '^\s*(#|$)' gate_include_paths.txt)

  if [ "${#FILES[@]}" -eq 0 ]; then
    log "gate_include_paths.txt is empty. Stop before staging."
    exit 31
  fi

  for f in "${FILES[@]}"; do
    case "$f" in
      "."|"./"|".env"|.env.*|*/.env|*/.env.*|*secret*|*credential*|*token*|*key*|node_modules/*|dist/*|build/*|.next/*|coverage/*)
        log "Forbidden stage path: $f"
        exit 32
        ;;
    esac
  done

  log "Staging explicit files only."
  git add -- "${FILES[@]}"
  git diff --cached --stat | tee "$EVIDENCE_DIR/cached_diff_stat.txt"
  git diff --cached --name-status | tee "$EVIDENCE_DIR/cached_diff_name_status.txt"
  git diff --cached --check | tee "$EVIDENCE_DIR/cached_diff_check.txt"

  if git diff --cached --quiet; then
    log "No staged changes after explicit staging. Nothing to commit."
    exit 0
  fi

  COMMIT_MESSAGE="${COMMIT_MESSAGE:-chore(a2a): add safe autonomous execution gate}"
  git commit -m "$COMMIT_MESSAGE"

  COMMIT_SHA="$(git rev-parse HEAD)"
  cat > "$EVIDENCE_DIR/local_commit_receipt.json" <<JSON
{
  "created_at": "$(timestamp)",
  "commit_sha": "$COMMIT_SHA",
  "message": "$COMMIT_MESSAGE",
  "staged_from": "gate_include_paths.txt",
  "push_executed": false,
  "deploy_executed": false
}
JSON

  log "Local commit complete: $COMMIT_SHA"
  log "STOP: push/deploy/cloud/customer/provider actions require gate-specific packet."
}

case "$MODE" in
  --preflight)
    preflight
    ;;
  --commit)
    safe_commit
    ;;
  *)
    echo "Usage: $0 [--preflight|--commit]"
    exit 2
    ;;
esac
