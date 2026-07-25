#!/usr/bin/env bash
# Report — and optionally close — the skill gap between agent skill directories.
#
# Dry run by default, matching project-hermes/install-trending-repos.sh:
#   ./sync-agent-skills.sh              show what differs, change nothing
#   ./sync-agent-skills.sh --execute    copy missing skills into every agent dir
#
# Why copy rather than symlink: a symlinked skill that later changes upstream
# changes what every agent is told to do, silently. Copies are inspectable and
# stay put. `skills add --copy` takes the same position.
#
# This only moves skills that are ALREADY on this machine. It installs nothing
# from the network — see docs/specs/agent-skills-rollout/INSTALL_PLAN.md for that.
set -uo pipefail

EXECUTE="${1:-}"

# Every agent skill directory found on this host. The list was wrong the first
# time — it had four entries and missed seven, including ~/.agents/skills, which
# `skills` treats as the shared location. Re-derive it rather than trusting this
# list if agents get added:
#   find ~ -maxdepth 3 -type d -name skills -not -path '*/node_modules/*'
AGENT_DIRS=(
  "$HOME/.agents/skills"
  "$HOME/.claude/skills"
  "$HOME/.codex/skills"
  "$HOME/.opencode/skills"
  "$HOME/.zcode/skills"
  "$HOME/.deepseek/skills"
  "$HOME/.gemini/skills"
  "$HOME/.hermes/skills"
  "$HOME/.openjarvis/skills"
  "$HOME/.cua-driver/skills"
)

echo "── current state ──"
declare -a present=()
for d in "${AGENT_DIRS[@]}"; do
  if [[ -d "$d" ]]; then
    n=$(find "$d" -mindepth 1 -maxdepth 1 -type d ! -name '.*' 2>/dev/null | wc -l | tr -d ' ')
    printf '  %-34s %s skills\n' "${d/#$HOME/~}" "$n"
    present+=("$d")
  else
    printf '  %-34s (missing)\n' "${d/#$HOME/~}"
  fi
done

if [[ ${#present[@]} -lt 2 ]]; then
  echo "need at least two existing skill directories to compare" >&2
  exit 1
fi

# Union of every skill name across all directories.
# A skill is a directory containing SKILL.md. Dotfile directories are excluded:
# .curator_backups and .hub sit alongside skills but are not skills, and copying
# them everywhere would spread backup state rather than capability.
all_names=$(for d in "${present[@]}"; do
  find "$d" -mindepth 1 -maxdepth 1 -type d ! -name '.*' 2>/dev/null \
    | while read -r s; do [[ -f "$s/SKILL.md" ]] && basename "$s"; done
done | sort -u)

echo
echo "── gap ──"
total_missing=0
for d in "${present[@]}"; do
  missing=()
  while IFS= read -r name; do
    [[ -z "$name" ]] && continue
    [[ -d "$d/$name" ]] || missing+=("$name")
  done <<< "$all_names"

  if [[ ${#missing[@]} -eq 0 ]]; then
    printf '  %-34s complete\n' "${d/#$HOME/~}"
  else
    printf '  %-34s missing %s\n' "${d/#$HOME/~}" "${#missing[@]}"
    for m in "${missing[@]}"; do echo "      $m"; done
    total_missing=$((total_missing + ${#missing[@]}))
  fi
done

if [[ "$EXECUTE" != "--execute" ]]; then
  echo
  echo "DRY RUN: would copy $total_missing skill(s) into place."
  echo "Read a few of them first — a skill is an instruction your agents follow,"
  echo "not a library they call. Then: $0 --execute"
  exit 0
fi

echo
echo "── copying ──"
copied=0
for d in "${present[@]}"; do
  while IFS= read -r name; do
    [[ -z "$name" ]] && continue
    [[ -d "$d/$name" ]] && continue
    # Take the first directory that has it.
    for src in "${present[@]}"; do
      if [[ -d "$src/$name" ]]; then
        cp -R "$src/$name" "$d/$name"
        echo "  ${d/#$HOME/~}/$name  ← ${src/#$HOME/~}"
        copied=$((copied + 1))
        break
      fi
    done
  done <<< "$all_names"
done

echo
echo "copied $copied skill(s)"
