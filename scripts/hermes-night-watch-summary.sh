#!/usr/bin/env bash
set -u

TARGET_DIR="${SIRINX_NIGHT_WATCH_TARGET_DIR:-/Users/sirinx/sirinx-os}"
LATEST_REPORT="${SIRINX_NIGHT_WATCH_LATEST_REPORT:-$TARGET_DIR/.hermes/logs/night-watch-latest.md}"

if [ ! -d "$TARGET_DIR" ]; then
  echo -e "\a"
  echo "❌ [Error] ไม่พบโฟลเดอร์: $TARGET_DIR"
  exit 1
fi

echo "🔄 กำลังเข้าสู่โฟลเดอร์และเริ่มรัน Hermes night-watch..."
LOG_OUTPUT="$(cd "$TARGET_DIR" && pnpm night-watch 2>&1)"
EXIT_CODE=$?

REPORT_TEXT=""
if [ -f "$LATEST_REPORT" ]; then
  REPORT_TEXT="$(cat "$LATEST_REPORT")"
fi

FAILED_COUNT=0
UNKNOWN_COUNT=0
FAILURE_DETAILS=()

report_section() {
  local heading="$1"

  if [ ! -f "$LATEST_REPORT" ]; then
    return 0
  fi

  awk -v heading="$heading" '
    $0 == heading { capture = 1; next }
    capture && /^### / { exit }
    capture { print }
  ' "$LATEST_REPORT"
}

print_healthy() {
  local label="$1"
  echo "✅ $label: Healthy"
}

print_unknown() {
  local label="$1"
  local reason="$2"
  echo "⚠️  $label: Unknown ($reason)"
  ((UNKNOWN_COUNT++))
}

print_failed() {
  local label="$1"
  local reason="$2"
  echo "❌ $label: Failed / Unhealthy"
  FAILURE_DETAILS+=("$label: $reason")
  ((FAILED_COUNT++))
}

section_has_bad_status() {
  grep -qiE 'offline|error|failed|unreachable|not found|degraded|unavailable'
}

check_local_stack() {
  local section
  section="$(report_section "### Local Stack")"

  if [ -z "$section" ]; then
    print_unknown "Local Stack" "ไม่พบข้อมูลใน Log"
  elif echo "$section" | section_has_bad_status; then
    print_failed "Local Stack" "local stack section contains degraded status"
  elif echo "$section" | grep -qiE 'online|healthy|ok'; then
    print_healthy "Local Stack"
  else
    print_unknown "Local Stack" "ไม่พบสถานะ online/healthy"
  fi
}

check_hermes_desktop() {
  local section
  section="$(report_section "### Hermes")"

  if [ -z "$section" ]; then
    print_unknown "Hermes Desktop" "ไม่พบข้อมูลใน Log"
  elif echo "$section" | grep -qiE 'Hermes Desktop:.*online'; then
    print_healthy "Hermes Desktop"
  elif echo "$section" | grep -qiE 'Hermes Desktop:.*(offline|error|failed|unreachable)'; then
    print_failed "Hermes Desktop" "desktop probe is not online"
  else
    print_unknown "Hermes Desktop" "ไม่พบสถานะ desktop"
  fi
}

check_hermes_gateway() {
  local section
  section="$(report_section "### Hermes")"

  if [ -z "$section" ]; then
    print_unknown "Hermes Gateway" "ไม่พบข้อมูลใน Log"
  elif echo "$section" | grep -qiE 'LastExitStatus"?[[:space:]]*=[[:space:]]*[1-9][0-9]*|blocked[[:space:]]+[1-9][0-9]*|gateway.*(offline|error|failed|degraded|unavailable)|Hermes status has degraded'; then
    print_failed "Hermes Gateway" "gateway has non-zero exit, blocked tasks, or degraded probe"
  elif echo "$section" | grep -qiE 'Gateway service is loaded|gateway.*online|healthy|ok'; then
    print_healthy "Hermes Gateway"
  else
    print_unknown "Hermes Gateway" "ไม่พบสถานะ gateway"
  fi
}

check_public_website() {
  local section
  section="$(report_section "### Public Website")"

  if [ -z "$section" ]; then
    print_unknown "Public Website" "ไม่พบข้อมูลใน Log"
  elif echo "$section" | grep -qiE 'HTTP (000|[1345][0-9][0-9]|error)'; then
    print_failed "Public Website" "one or more website probes are not HTTP 200"
  elif echo "$section" | grep -qi 'HTTP 200'; then
    print_healthy "Public Website"
  else
    print_unknown "Public Website" "ไม่พบ HTTP status"
  fi
}

check_positive_count() {
  local label="$1"
  local pattern="$2"
  local value
  value="$(printf '%s\n' "$REPORT_TEXT" | sed -nE "s/.*$pattern[[:space:]]*([0-9]+).*/\\1/p" | tail -n 1)"

  if [ -z "$value" ]; then
    print_unknown "$label" "ไม่พบข้อมูลใน Log"
  elif [ "$value" -gt 0 ] 2>/dev/null; then
    print_healthy "$label"
  else
    print_failed "$label" "count is empty or zero"
  fi
}

check_git_dirty() {
  local current_dirty
  local report_dirty

  current_dirty="$(git -C "$TARGET_DIR" status --short 2>/dev/null || true)"
  report_dirty="$(printf '%s\n' "$REPORT_TEXT" | sed -nE 's/.*dirty_files=([0-9]+).*/\1/p' | awk '$1 > 0 { print; exit }')"

  if [ -n "$current_dirty" ]; then
    print_failed "Git Dirty States" "current target repo has dirty or untracked files"
  elif [ -n "$report_dirty" ]; then
    print_failed "Git Dirty States" "latest report contains dirty_files=$report_dirty"
  elif git -C "$TARGET_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    print_healthy "Git Dirty States"
  elif printf '%s\n' "$REPORT_TEXT" | grep -q 'dirty_files=0'; then
    print_healthy "Git Dirty States"
  else
    print_unknown "Git Dirty States" "ไม่พบข้อมูล git status"
  fi
}

echo "--------------------------------------------------"
echo "📋 สรุปผลสถานะระบบ SYRINX Hermes Night-Watch"
echo "--------------------------------------------------"
echo "Evidence: $LATEST_REPORT"

check_local_stack
check_hermes_desktop
check_hermes_gateway
check_public_website
check_positive_count "Sitemap" "Sitemap URL count:"
check_positive_count "Province Route Count" "Province route count in sitemap:"
check_git_dirty

echo "--------------------------------------------------"

if [ "$EXIT_CODE" -ne 0 ] || [ "$FAILED_COUNT" -gt 0 ]; then
  echo -e "\a" && sleep 0.2
  echo -e "\a" && sleep 0.2
  echo -e "\a"

  echo "⚠️  [Diagnosis Required] ตรวจพบปัญหาในระบบ!"
  echo "🛑 หยุดระบบชั่วคราวเพื่อรอการตรวจสอบจากคุณ (Human Approval)"
  echo "🔍 รายละเอียดบรรทัดที่คาดว่ามีข้อผิดพลาด:"

  if [ "$EXIT_CODE" -ne 0 ]; then
    echo "- pnpm night-watch exit code: $EXIT_CODE"
  fi

  for detail in "${FAILURE_DETAILS[@]}"; do
    echo "- $detail"
  done

  printf '%s\n' "$LOG_OUTPUT" | grep -iE 'fail|error|reject|unhealthy|dirty|ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY' | head -n 10
  exit 1
fi

echo "🎉 ทุกระบบทำงานปกติเสร็จสมบูรณ์!"
