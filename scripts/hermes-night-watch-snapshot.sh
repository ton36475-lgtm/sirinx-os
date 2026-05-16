#!/usr/bin/env bash
set -u

ROOT="/Users/sirinx/sirinx-os"
PUBLIC_REPO="/Users/sirinx/restore-sources/ton36475-lgtm-sirinx"
VAULT="/Users/sirinx/Documents/Obsidian Vault/SIRINX"
LOG_FILE="$VAULT/Hermes Night Watch Log.md"

mkdir -p "$VAULT"

now="$(TZ=Asia/Bangkok date '+%Y-%m-%d %H:%M:%S %Z')"

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
  {
    printf '\n## %s\n\n' "$now"
    printf '### Scope\n\n'
    printf -- '- Mode: observation and local logging only.\n'
    printf -- '- No deploy, no git push, no DNS change, no SaaS write, no customer messaging, no secret reads.\n'
    printf -- '- Obsidian log target: `%s`.\n\n' "$LOG_FILE"

    printf '### Local Stack\n\n```text\n'
    (cd "$ROOT" && pnpm stack:status) 2>&1 | sed -e 's/[[:cntrl:]]//g' | head -40
    printf '```\n\n'

    printf '### Hermes\n\n```text\n'
    hermes-desktop status 2>&1 | sed -e 's/[[:cntrl:]]//g' | head -20
    hermes gateway status 2>&1 | sed -e 's/[[:cntrl:]]//g' | head -20
    hermes kanban --board sirinx-os stats 2>&1 | sed -e 's/[[:cntrl:]]//g' | head -40
    printf '```\n\n'

    printf '### Public Website\n\n'
    printf -- '- `https://www.sirinx.co/`: HTTP %s\n' "$(http_code 'https://www.sirinx.co/')"
    printf -- '- `https://www.sirinx.co/assessment`: HTTP %s\n' "$(http_code 'https://www.sirinx.co/assessment')"
    printf -- '- `https://www.sirinx.co/solar-carport/phitsanulok`: HTTP %s\n' "$(http_code 'https://www.sirinx.co/solar-carport/phitsanulok')"
    printf -- '- Sitemap URL count: %s\n' "$(sitemap_count)"
    printf -- '- Province route count in sitemap: %s\n\n' "$(province_count)"

    printf '### Git\n\n```text\n'
    git_snapshot "$PUBLIC_REPO" "public-website"
    git_snapshot "$ROOT" "sirinx-os"
    printf '```\n\n'

    printf '### Ready Hermes Tasks\n\n```text\n'
    hermes kanban --board sirinx-os list 2>&1 | sed -e 's/[[:cntrl:]]//g' | head -40
    printf '```\n\n'

    printf '### Operator Rule\n\n'
    printf -- '- If all checks are green, continue with the first ready dry-run task only.\n'
    printf -- '- If anything is red, stop at diagnosis and request approval for risky action.\n'
  } >> "$LOG_FILE"
}

append_section
printf 'Hermes night-watch snapshot appended to %s\n' "$LOG_FILE"
