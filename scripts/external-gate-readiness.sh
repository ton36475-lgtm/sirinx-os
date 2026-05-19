#!/usr/bin/env bash
set -euo pipefail

ROOT="${SIRINX_PROJECT_ROOT:-/Users/sirinx/sirinx-os}"
PUBLIC_REPO="${SIRINX_PUBLIC_SITE_REPO:-/Users/sirinx/restore-sources/ton36475-lgtm-sirinx}"
API_BASE="${DEV_CONTROL_API_BASE:-http://127.0.0.1:8711}"
DASHBOARD_URL="${DEV_DASHBOARD_URL:-http://127.0.0.1:8710}"
PUBLIC_URL="${SIRINX_PUBLIC_URL:-https://www.sirinx.co/}"

hard_failures=0

ok() {
  printf '[OK] %s\n' "$*"
}

warn() {
  printf '[WARN] %s\n' "$*"
}

fail() {
  printf '[FAIL] %s\n' "$*"
  hard_failures=$((hard_failures + 1))
}

git_status_check() {
  local label="$1"
  local repo="$2"

  if [[ ! -d "$repo/.git" ]]; then
    warn "$label repo not found at $repo"
    return
  fi

  local status
  status="$(git -C "$repo" status --short --branch)"
  printf '%s\n%s\n' "== $label git status ==" "$status"

  if git -C "$repo" status --short | grep -q .; then
    warn "$label has local changes; review before commit/deploy."
  else
    ok "$label worktree is clean."
  fi
}

check_command_center_api() {
  local health
  if ! health="$(curl -fsS --max-time 5 "$API_BASE/health")"; then
    fail "Command Center API is not responding at $API_BASE/health"
    return
  fi
  ok "Command Center API health responded: $health"

  local preflight
  if ! preflight="$(curl -fsS --max-time 5 "$API_BASE/api/external-gate-preflight")"; then
    fail "External gate preflight endpoint is not responding."
    return
  fi

  if ! printf '%s' "$preflight" | node <<'NODE'
let raw = "";
process.stdin.on("data", (chunk) => {
  raw += chunk;
});
process.stdin.on("end", () => {
  const data = JSON.parse(raw);
  const ids = (data.entries || []).map((entry) => entry.id);
  const expected = [
    "gate-codex-mobile-qr-mfa",
    "gate-telegram-line-target-token",
    "gate-solis-readonly-telemetry",
    "gate-cloudflare-bot-management-review"
  ];
  const sameIds =
    ids.length === expected.length &&
    expected.every((id, index) => ids[index] === id);

  const summary = data.summary || {};
  const valid =
    data.status === "ready-local-preflight" &&
    sameIds &&
    summary.entries === 4 &&
    summary.manualHumanGates === 1 &&
    summary.optionalOfficialReview === 1 &&
    summary.canExecuteNow === 0 &&
    summary.externalWrites === false &&
    data.canExecuteNow === false &&
    data.externalWrites === false;

  if (!valid) {
    console.error(JSON.stringify({ status: data.status, summary, ids }, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify({ status: data.status, summary, ids }, null, 2));
});
NODE
  then
    fail "External gate preflight is stale or unsafe."
  else
    ok "External gate preflight is current and non-executable."
  fi
}

check_dashboard() {
  if curl -fsS --max-time 5 "$DASHBOARD_URL" >/dev/null; then
    ok "Command Center dashboard is responding at $DASHBOARD_URL"
  else
    fail "Command Center dashboard is not responding at $DASHBOARD_URL"
  fi
}

check_hermes_pairing() {
  if ! command -v hermes >/dev/null 2>&1; then
    warn "Hermes CLI not found; cannot inspect pairing readiness."
    return
  fi

  if hermes gateway status >/tmp/sirinx-hermes-gateway-status.txt 2>&1; then
    ok "Hermes gateway status command succeeded."
  else
    warn "Hermes gateway status command failed; inspect /tmp/sirinx-hermes-gateway-status.txt"
  fi

  local pairing
  if pairing="$(hermes pairing list 2>&1)"; then
    printf '%s\n%s\n' "== Hermes pairing list ==" "$pairing"
    ok "Hermes pairing list is readable."
  else
    warn "Hermes pairing list failed."
  fi

  warn "Codex Mobile QR/MFA remains a manual human gate; this script cannot and should not bypass MFA."
}

check_messaging_gate() {
  if [[ -x /Users/sirinx/.local/bin/hermes-telegram-test ]]; then
    warn "Telegram smoke helper exists but is intentionally not executed until token and recipient are confirmed."
  else
    warn "Telegram smoke helper not found; recipient/token setup remains blocked."
  fi

  warn "LINE setup remains blocked until LINE OA channel, webhook signature validation, and allowed recipient are confirmed."
}

check_solis_gate() {
  if [[ -f "$ROOT/policies/solis-load-control-policy.yaml" ]]; then
    ok "Solis load-control policy exists."
  else
    warn "Solis load-control policy is missing."
  fi

  if command -v solis >/dev/null 2>&1; then
    warn "A solis command exists, but it is not executed until consent, credential storage, and station mapping are confirmed."
  else
    warn "No verified Solis CLI found; telemetry adapter remains blocked."
  fi
}

check_public_cloudflare_state() {
  local headers
  if ! headers="$(curl -fsSI --max-time 15 "$PUBLIC_URL" | tr -d '\r')"; then
    fail "Could not fetch live public headers from $PUBLIC_URL"
    return
  fi

  local csp
  csp="$(printf '%s\n' "$headers" | grep -i '^content-security-policy:' || true)"
  if [[ -n "$csp" ]]; then
    printf '%s\n%s\n' "== Live CSP ==" "$csp"
    ok "Live CSP header is present."
  else
    warn "Live CSP header was not found."
  fi

  if printf '%s\n' "$csp" | grep -q '/assets/'; then
    ok "Live CSP references deployed /assets/ scripts."
  else
    warn "Live CSP does not visibly reference /assets/ scripts."
  fi

  if printf '%s\n' "$csp" | grep -q '/cdn-cgi/challenge-platform'; then
    fail "Live CSP allows Cloudflare challenge-platform scripts."
  else
    ok "Live CSP does not allow Cloudflare challenge-platform scripts."
  fi

  local html
  if ! html="$(curl -fsSL --max-time 15 "$PUBLIC_URL")"; then
    fail "Could not fetch live public HTML from $PUBLIC_URL"
    return
  fi

  if printf '%s' "$html" | grep -q '/cdn-cgi/challenge-platform'; then
    warn "Live public HTML contains an edge-injected challenge-platform tag, but CSP should block execution."
  else
    ok "Live public HTML does not reference Cloudflare challenge-platform script."
  fi
}

main() {
  printf 'SIRINX external gate readiness check\n'
  printf 'Root: %s\n' "$ROOT"
  printf 'Public repo: %s\n' "$PUBLIC_REPO"
  printf 'API: %s\n' "$API_BASE"
  printf 'Dashboard: %s\n' "$DASHBOARD_URL"
  printf 'Public URL: %s\n\n' "$PUBLIC_URL"

  git_status_check "sirinx-os" "$ROOT"
  git_status_check "public website" "$PUBLIC_REPO"
  check_command_center_api
  check_dashboard
  check_hermes_pairing
  check_messaging_gate
  check_solis_gate
  check_public_cloudflare_state

  printf '\nHard failures: %s\n' "$hard_failures"
  if [[ "$hard_failures" -gt 0 ]]; then
    exit 1
  fi
}

main "$@"
