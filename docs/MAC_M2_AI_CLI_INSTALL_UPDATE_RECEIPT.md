# Mac mini M2 — Codex CLI / Claude Code CLI Install Gate Packet

**Gate ID:** GATE-INSTALL-001-20260702-001  
**Mission:** GHOSTCLAW-MAC-M2-AI-CLI-INTEGRATION-20260702-001  
**Scope:** Install or update OpenAI Codex CLI and Anthropic Claude Code CLI on Mac mini M2  
**Policy Tier:** D_HIGH_IMPACT — requires explicit human gate approval  
**Created:** 2026-07-02  

---

## 1. Approval Checklist

Before running any installer, the operator must confirm:

- [ ] This machine is the target Mac mini M2 (`uname -m` returns `arm64`)
- [ ] macOS version is supported (`sw_vers -productVersion`)
- [ ] Xcode Command Line Tools are installed or the operator accepts the system prompt
- [ ] Operator has a valid OpenAI account / API key for Codex
- [ ] Operator has a valid Anthropic account / API key for Claude Code
- [ ] No production secrets will be pasted into shared logs
- [ ] `~/.zshrc` backup is acceptable
- [ ] This is a local development machine, not a production server
- [ ] Rollback plan is understood

---

## 2. Rollback Plan

| Asset | Rollback Action |
|---|---|
| `~/.codex/` | `rm -rf ~/.codex` |
| `~/.claude/` | `rm -rf ~/.claude` |
| `~/.zshrc` | restore from `~/.zshrc.bak-{timestamp}` |
| `~/.local/bin/codex` | remove manually if standalone installer placed it there |
| `~/.local/bin/claude` | remove manually if standalone installer placed it there |

---

## 3. Pre-Install Diagnostics

Run these commands first and record output in a local-only log:

```bash
uname -m
sw_vers -productVersion
xcode-select -p
which codex || true
codex --version 2>/dev/null || true
which claude || true
claude --version 2>/dev/null || true
```

---

## 4. Install Procedure

### 4.1 Prepare log directory

```bash
mkdir -p ~/.ghostclaw/install_logs
STAMP=$(date +%Y%m%d_%H%M%S)
```

### 4.2 Ensure PATH

```bash
mkdir -p ~/.local/bin
touch ~/.zshrc
if ! grep -Fq 'export PATH="$HOME/.local/bin:$PATH"' ~/.zshrc; then
  echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
fi
export PATH="$HOME/.local/bin:$PATH"
```

### 4.3 Install / Update Codex CLI (standalone installer — preferred)

```bash
curl -fsSL https://chatgpt.com/codex/install.sh -o ~/.ghostclaw/install_logs/codex-install-${STAMP}.sh
sh ~/.ghostclaw/install_logs/codex-install-${STAMP}.sh 2>&1 | tee ~/.ghostclaw/install_logs/codex_install_${STAMP}.log
```

### 4.4 Install / Update Claude Code CLI (standalone installer — preferred)

```bash
curl -fsSL https://claude.ai/install.sh -o ~/.ghostclaw/install_logs/claude-install-${STAMP}.sh
bash ~/.ghostclaw/install_logs/claude-install-${STAMP}.sh 2>&1 | tee ~/.ghostclaw/install_logs/claude_install_${STAMP}.log
```

---

## 5. Fallback Install (only if standalone fails)

Do not mix methods unless the standalone installer is confirmed broken.

```bash
# Codex fallback
npm install -g @openai/codex

# Claude Code fallback
npm install -g @anthropic-ai/claude-code@latest
```

**Warning:** `npm install -g` may require Node.js 18+ and can create permission issues on macOS. Do not use `sudo npm install -g`.

---

## 6. Post-Install Verification

Open a new terminal and run:

```bash
which codex
codex --version
codex doctor

which claude
claude --version
claude doctor
```

Record results below:

| Check | Expected | Actual | Pass/Fail |
|---|---|---|---|
| `which codex` | path to binary | | |
| `codex --version` | version string | | |
| `codex doctor` | no critical errors | | |
| `which claude` | path to binary | | |
| `claude --version` | version string | | |
| `claude doctor` | no critical errors | | |

---

## 7. Receipt

After install completes, write a local receipt:

```bash
mkdir -p /Users/sirinx/sirinx-os/.ghostclaw_runtime/a2a2a/receipts
cat > /Users/sirinx/sirinx-os/.ghostclaw_runtime/a2a2a/receipts/GHOSTCLAW-MAC-M2-AI-CLI-INSTALL-20260702-001.receipt.json <<'EOF'
{
  "mission_id": "GHOSTCLAW-MAC-M2-AI-CLI-INSTALL-20260702-001",
  "gate_id": "GATE-INSTALL-001-20260702-001",
  "agent": "human-operator",
  "approver": "human-operator",
  "policy_tier": "D_HIGH_IMPACT",
  "install_status": "completed",
  "codex_version": "<fill>",
  "claude_version": "<fill>",
  "blocked_items": [],
  "timestamp": "<fill ISO8601>"
}
EOF
```

---

## 8. Hard Blocks Remain After Install

Installing the CLI does **not** authorize:

- `git push`
- deploy to Vercel/Netlify/Firebase/Supabase/Railway/Fly/AWS/GCP/Azure
- cloud mutation
- migration
- merge
- secret reading
- customer send
- Telegram live send
- paid/provider API calls without a separate gate

---

## 9. Evidence Requirements

Attach to this gate packet:

1. Pre-install diagnostic output
2. Install log files from `~/.ghostclaw/install_logs/`
3. Post-install verification output
4. Signed receipt JSON

---

**Status:** PENDING_APPROVAL  
**Next:** Operator reviews, approves, runs, then writes receipt.
