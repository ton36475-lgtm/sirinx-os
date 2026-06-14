#!/usr/bin/env bash
set -u

ROOT="/Users/sirinx/sirinx-os"
PUBLIC_REPO="/Users/sirinx/restore-sources/ton36475-lgtm-sirinx"
VAULT="/Users/sirinx/Documents/Obsidian Vault/SIRINX"
LOG_FILE="$VAULT/06_OPERATIONS/Hermes Night Watch Log.md"
LEGACY_LOG_FILE="$VAULT/Hermes Night Watch Log.md"
LOCAL_LOG_DIR="$ROOT/.hermes/logs"

now="$(TZ=Asia/Bangkok date '+%Y-%m-%d %H:%M:%S %Z')"
local_stamp="$(TZ=Asia/Bangkok date '+%Y%m%d-%H%M%S')"
LOCAL_LATEST_LOG="$LOCAL_LOG_DIR/night-watch-latest.md"
LOCAL_STAMPED_LOG="$LOCAL_LOG_DIR/night-watch-$local_stamp.md"

mkdir -p "$VAULT" "$(dirname "$LOG_FILE")" "$LOCAL_LOG_DIR"

clean_head() {
  local limit="${1:-40}"
  sed -e 's/[[:cntrl:]]//g' | head -n "$limit"
}

git_snapshot() {
  local repo="$1"
  local label="$2"

  if [ ! -d "$repo/.git" ]; then
    printf '%s: missing git repo at %s\n' "$label" "$repo"
    return 0
  fi

  local branch commit dirty
  branch="$(git -C "$repo" branch --show-current 2>/dev/null || true)"
  commit="$(git -C "$repo" log -1 --oneline 2>/dev/null || true)"
  dirty="$(git -C "$repo" status --short 2>/dev/null | wc -l | tr -d ' ')"

  printf '%s: branch=%s commit=%s dirty_files=%s\n' "$label" "${branch:-unknown}" "${commit:-unknown}" "${dirty:-unknown}"
}

http_code() {
  local url="$1"
  curl -sS -L --max-time 12 -o /dev/null -w '%{http_code}' "$url" 2>/dev/null || printf 'error'
}

sitemap_count() {
  curl -sS --max-time 12 'https://www.sirinx.co/sitemap.xml' 2>/dev/null | grep -c '<loc>' || true
}

province_count() {
  curl -sS --max-time 12 'https://www.sirinx.co/sitemap.xml' 2>/dev/null | grep -c '/solar-carport/' || true
}

append_section() {
  local local_stack hermes_block ready_tasks
  local homepage_code assessment_code province_code sitemap_total province_total
  local final_status status_note
  local -a status_notes

  local_stack="$(cd "$ROOT" && pnpm stack:status 2>&1 | clean_head 40 || true)"
  hermes_block="$(
    {
      hermes-desktop status
      hermes gateway status
      hermes kanban --board sirinx-os stats
    } 2>&1 | clean_head 80 || true
  )"
  ready_tasks="$(hermes kanban --board sirinx-os list 2>&1 | clean_head 40 || true)"
  homepage_code="$(http_code 'https://www.sirinx.co/')"
  assessment_code="$(http_code 'https://www.sirinx.co/assessment')"
  province_code="$(http_code 'https://www.sirinx.co/solar-carport/phitsanulok')"
  sitemap_total="$(sitemap_count)"
  province_total="$(province_count)"

  final_status="OK"
  status_notes=()

  if [ ! -d "$ROOT" ]; then
    final_status="FAILED"
    status_notes+=("Core project root is missing: $ROOT")
  fi

  if grep -qiE 'offline|error|failed|unreachable|not found' <<<"$local_stack"; then
    [ "$final_status" = "OK" ] && final_status="WARN"
    status_notes+=("Local stack has degraded services; see Local Stack section.")
  fi

  if grep -qiE 'offline|error|failed|unreachable|not found|unknown command' <<<"$hermes_block"; then
    [ "$final_status" = "OK" ] && final_status="WARN"
    status_notes+=("Hermes status has degraded or unavailable probes; see Hermes section.")
  fi

  if [ "$homepage_code" != "200" ] || [ "$assessment_code" != "200" ] || [ "$province_code" != "200" ]; then
    [ "$final_status" = "OK" ] && final_status="WARN"
    status_notes+=("One or more public website probes did not return HTTP 200.")
  fi

  if [ -z "$sitemap_total" ] || [ "$sitemap_total" = "0" ] || [ -z "$province_total" ] || [ "$province_total" = "0" ]; then
    [ "$final_status" = "OK" ] && final_status="WARN"
    status_notes+=("Sitemap or province route counts are empty.")
  fi

  printf '\n## %s\n\n' "$now"
  printf '### Final Status\n\n'
  printf '%s\n\n' "$final_status"
  printf '### Status Notes\n\n'
  if [ "${#status_notes[@]}" -eq 0 ]; then
    printf -- '- No blocking issues observed by the shell snapshot.\n\n'
  else
    for status_note in "${status_notes[@]}"; do
      printf -- '- %s\n' "$status_note"
    done
    printf '\n'
  fi

    printf '### Scope\n\n'
    printf -- '- Mode: observation and local logging only.\n'
    printf -- '- No deploy, no git push, no DNS change, no SaaS write, no customer messaging, no secret reads.\n'
    printf -- '- Obsidian log target: `%s`.\n\n' "$LOG_FILE"
    printf -- '- Local latest log target: `%s`.\n\n' "$LOCAL_LATEST_LOG"

    printf '### Local Stack\n\n```text\n'
    printf '%s\n' "$local_stack"
    printf '```\n\n'

    printf '### Hermes\n\n```text\n'
    printf '%s\n' "$hermes_block"
    printf '```\n\n'

    printf '### Public Website\n\n'
    printf -- '- `https://www.sirinx.co/`: HTTP %s\n' "$homepage_code"
    printf -- '- `https://www.sirinx.co/assessment`: HTTP %s\n' "$assessment_code"
    printf -- '- `https://www.sirinx.co/solar-carport/phitsanulok`: HTTP %s\n' "$province_code"
    printf -- '- Sitemap URL count: %s\n' "$sitemap_total"
    printf -- '- Province route count in sitemap: %s\n\n' "$province_total"

    printf '### Git\n\n```text\n'
    git_snapshot "$PUBLIC_REPO" "public-website"
    git_snapshot "$ROOT" "sirinx-os"
    printf '```\n\n'

    printf '### Ready Hermes Tasks\n\n```text\n'
    printf '%s\n' "$ready_tasks"
    printf '```\n\n'

    printf '### Operator Rule\n\n'
    printf -- '- Telegram callback should treat exit code 0 with Final Status OK or WARN as completed.\n'
    printf -- '- If all checks are green, continue with the first ready dry-run task only.\n'
    printf -- '- If anything is red, stop at diagnosis and request approval for risky action.\n'
}

tmp_report="$(mktemp "${TMPDIR:-/tmp}/sirinx-night-watch.XXXXXX")"
trap 'rm -f "$tmp_report"' EXIT
append_section > "$tmp_report"
cat "$tmp_report" >> "$LOG_FILE"
if [ "$LEGACY_LOG_FILE" != "$LOG_FILE" ]; then
  cat "$tmp_report" >> "$LEGACY_LOG_FILE"
fi
cp "$tmp_report" "$LOCAL_LATEST_LOG"
cp "$tmp_report" "$LOCAL_STAMPED_LOG"

final_status="$(grep -A2 '^### Final Status' "$tmp_report" | tail -n 1 | tr -d '[:space:]')"
printf 'Hermes night-watch snapshot appended to %s\n' "$LOG_FILE"
printf 'Hermes night-watch legacy mirror appended to %s\n' "$LEGACY_LOG_FILE"
printf 'Hermes night-watch latest log written to %s\n' "$LOCAL_LATEST_LOG"
printf 'Hermes night-watch status: %s\n' "${final_status:-UNKNOWN}"

if [ "${final_status:-FAILED}" = "FAILED" ]; then
  exit 1
fi
