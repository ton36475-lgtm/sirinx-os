#!/bin/bash
# ═══════════════════════════════════════════════════════════
# GhostClaw OS - Multi-System Parallel Runner (tmux) v3
# All systems run simultaneously on Mac mini M2
# ═══════════════════════════════════════════════════════════

SESSION="ghostclaw"

tmux kill-session -t "$SESSION" 2>/dev/null

tmux new-session -d -s "$SESSION" -n "overview"

# ═══════════════════════════════════════════════════════════
# Window 1: Overview Dashboard
# ═══════════════════════════════════════════════════════════
tmux send-keys -t "$SESSION:overview" "echo '╔════════════════════════════════════════════╗'; echo '║  GhostClaw OS - System Dashboard v3       ║'; echo '╠════════════════════════════════════════════╣'; echo '║  Skills API: :3800  | Dev Control: :8711   ║'; echo '║  Rust: ✓compile     | Tests: vitest         ║'; echo '╚════════════════════════════════════════════╝'; echo ''; watch -n 5 'echo \"=== Services ===\"; curl -s http://localhost:3800/health 2>/dev/null | jq -r \".status // \\\"DOWN\\\"\" | xargs -I{} echo \"Skills API: {}\"; curl -s http://localhost:8711/health 2>/dev/null | jq -r \".status // \\\"DOWN\\\"\" | xargs -I{} echo \"Dev Control API: {}\"; echo; echo \"=== Ports ===\"; lsof -iTCP -sTCP:LISTEN -P 2>/dev/null | grep -E \"3800|8711|8888|6379\" | awk \"{print \\$1, \\$9}\"'" Enter

# ═══════════════════════════════════════════════════════════
# Window 2: Skills API (port 3800)
# ═══════════════════════════════════════════════════════════
tmux new-window -t "$SESSION" -n "skills-api"
tmux send-keys -t "$SESSION:skills-api" "cd /Users/sirinx/sirinx-os && SKILLS_DRY_RUN=true node services/skills-api/src/server-zero-dep.mjs" Enter

# ═══════════════════════════════════════════════════════════
# Window 3: Dev Control API (port 8711)
# ═══════════════════════════════════════════════════════════
tmux new-window -t "$SESSION" -n "dev-api"
tmux send-keys -t "$SESSION:dev-api" "cd /Users/sirinx/sirinx-os && node services/dev-control-api/server.mjs" Enter

# ═══════════════════════════════════════════════════════════
# Window 4: Codex CLI
# ═══════════════════════════════════════════════════════════
tmux new-window -t "$SESSION" -n "codex"
tmux send-keys -t "$SESSION:codex" "echo 'Codex CLI - 26 agents ready'; echo ''; echo 'Agents:'; ls ~/.codex/agents/*.toml | xargs -I{} basename {} .toml | column; echo ''; echo 'Usage: codex --agent <name>'" Enter

# ═══════════════════════════════════════════════════════════
# Window 5: Claude Code
# ═══════════════════════════════════════════════════════════
tmux new-window -t "$SESSION" -n "claude"
tmux send-keys -t "$SESSION:claude" "echo 'Claude Code - 26 agents ready'; echo ''; echo 'Agents:'; ls ~/.claude/agents/*.md | xargs -I{} basename {} .md | column; echo ''; echo 'Usage: claude --agent <name>'" Enter

# ═══════════════════════════════════════════════════════════
# Window 6: OpenCode
# ═══════════════════════════════════════════════════════════
tmux new-window -t "$SESSION" -n "opencode"
tmux send-keys -t "$SESSION:opencode" "echo 'OpenCode CLI - 26 agents ready'; echo ''; echo 'Agents:'; ls ~/.config/opencode/agents/*.md | xargs -I{} basename {} .md | column" Enter

# ═══════════════════════════════════════════════════════════
# Window 7: Hermes Agent
# ═══════════════════════════════════════════════════════════
tmux new-window -t "$SESSION" -n "hermes"
tmux send-keys -t "$SESSION:hermes" "echo 'Hermes Agent - 33 skills loaded'; echo ''; echo 'Categories:'; ls ~/.hermes/skills/development/" Enter

# ═══════════════════════════════════════════════════════════
# Window 8: Test Runner
# ═══════════════════════════════════════════════════════════
tmux new-window -t "$SESSION" -n "tests"
tmux send-keys -t "$SESSION:tests" "echo 'Test Runner - vitest + cargo'; echo ''; echo 'Commands:'; echo '  JS:  cd /Users/sirinx/sirinx-os && npx vitest run services/dev-control-api/src/*.test.mjs'; echo '  Rust: cd /Users/sirinx/sirinx-os && cargo test'" Enter

# ═══════════════════════════════════════════════════════════
# Window 9: Cloudflare Simulation
# ═══════════════════════════════════════════════════════════
tmux new-window -t "$SESSION" -n "cloudflare"
tmux send-keys -t "$SESSION:cloudflare" "echo 'Cloudflare Workers - Local Simulation'; echo ''; echo 'Commands:'; echo '  Local run: bash scripts/run-local-cloudflare.sh'; echo '  KV/R2: .cloudflare_simulation/kv_r2/'; ls .cloudflare_simulation/kv_r2/ 2>/dev/null || echo '  (run script to create)'" Enter

# ═══════════════════════════════════════════════════════════
# Window 10: System Watcher (Infrastructure)
# ═══════════════════════════════════════════════════════════
tmux new-window -t "$SESSION" -n "infra"
tmux send-keys -t "$SESSION:infra" "cd /Users/sirinx/sirinx-os && echo 'Infrastructure Simulation Hub'; echo ''; echo 'Services:'; docker-compose -f infrastructure/docker-compose.yml ps 2>/dev/null || echo 'docker not running'; echo ''; echo 'Skills:'; ls skills/grid-guist/ skills/respect-aso/ 2>/dev/null | head -10; echo ''; echo 'Access:'; echo '  Firecrawl: http://localhost:3002'; echo '  Crawl4AI:   http://localhost:8080'; echo '  PostHog:    http://localhost:8000'" Enter

# ═══════════════════════════════════════════════════════════
# Window 11: GridGuist UI Framework
# ═══════════════════════════════════════════════════════════
tmux new-window -t "$SESSION" -n "gridguist"
tmux send-keys -t "$SESSION:gridguist" "cd /Users/sirinx/sirinx-os/skills/grid-guist && echo 'GridGuist v1 - UI/Design Agent'; echo 'Swiss Design | Editorial Grid | Technical Minimalism'; echo ''; echo 'Modules:'; echo '  analyzer.js  — Swiss Design layout analyzer'; echo '  reviewer.js  — Minimalism code reviewer'; echo '  auditor.js   — Perf + A11y auditor'; echo ''; echo 'Commands:'; echo '  node run.js --mode redesign --target <component>'; echo '  node run.js --mode review --target <component>'; echo '  node run.js --mode audit --target <component>'; echo '  node run.js --full --target <component>'; echo '  node run.js --file path/to/style.css --mode review'; echo ''; echo 'API: curl http://localhost:3800/api/gridguist?mode=redesign&target=dashboard'; echo 'Telegram: /gridguist --mode redesign --target <component>'; echo ''; ls -la" Enter

# ═══════════════════════════════════════════════════════════
# Window 12: System Watcher (Legacy)
# ═══════════════════════════════════════════════════════════
tmux new-window -t "$SESSION" -n "watcher"
tmux send-keys -t "$SESSION:watcher" "echo 'System Watcher'; echo ''; watch -n 10 'echo \"=== status ===\"; echo; echo \"CPU:\"; top -l 1 -n 0 | grep CPU; echo; echo \"Memory:\"; vm_stat | head -5; echo; echo \"Ports:\"; lsof -iTCP -sTCP:LISTEN -P 2>/dev/null | grep -E \"3800|8711|8888|6379|3002|8080|8000\" | awk \"{print \\$1, \\$2, \\$9}\"'" Enter

# ═══════════════════════════════════════════════════════════
# Window 13: YouTube Live Knowledge Extractor
# ═══════════════════════════════════════════════════════════
tmux new-window -t "$SESSION" -n "live-extractor"
tmux send-keys -t "$SESSION:live-extractor" "cd /Users/sirinx/sirinx-os && echo 'YouTube Live Knowledge Extractor'; echo ''; echo 'Monitoring: https://www.youtube.com/live/FeX7eMenpYI'; echo 'Topic: LLM Deployment & Hardware Planning'; echo ''; echo 'Commands:'; echo '  Run digest: node agents/youtube-live-extractor/digest.mjs'; echo '  Monitor: every 30s'; echo '  Storage: Obsidian Vault/SIRINX/Live Knowledge/'; echo ''; node agents/youtube-live-extractor/digest.mjs" Enter

# ═══════════════════════════════════════════════════════════
# Window 14: ThaiMart K01-K15 Workflow Engine
# ═══════════════════════════════════════════════════════════
tmux new-window -t "$SESSION" -n "thaimart-workflow"
tmux send-keys -t "$SESSION:thaimart-workflow" "cd /Users/sirinx/sirinx-os && echo 'ThaiMart K01-K15 Workflow Engine'; echo ''; echo 'States:'; echo '  INTAKE → CONTEXT_LOCKED → PLANNED → DRAFTED → CHANNEL_ADAPTED → QA1_REVIEW → QA2_REVIEW → WAITING_APPROVAL → REJECTED/APPROVED'; echo ''; echo 'Approval Gates:'; echo '  listing_publish: admin + brand_owner'; echo '  price_stock: admin + owner'; echo '  chat_send: admin + brand_owner'; echo '  order_status: warehouse_operator'; echo ''; echo 'Connector status: thaimart = disabled_pending_contract'" Enter

echo "✅ GhostClaw OS tmux session created: $SESSION"
echo ""
echo "Windows:"
echo "  1  = Overview Dashboard (health monitor)"
echo "  2  = Skills API (:3800)"
echo "  3  = Dev Control API (:8711)"
echo "  4  = Codex CLI (26 agents)"
echo "  5  = Claude Code (26 agents)"
echo "  6  = OpenCode (26 agents)"
echo "  7  = Hermes Agent (33 skills)"
echo "  8  = Test Runner (vitest + cargo)"
echo "  9  = Cloudflare Simulation (local KV/R2)"
echo "  10 = Infrastructure Hub (Docker sim)"
echo "  11 = GridGuist UI Framework"
echo "  12 = System Watcher (CPU/RAM/Ports)"
echo "  13 = YouTube Live Knowledge Extractor"
echo "  14 = ThaiMart K01-K15 Workflow Engine"
echo ""
echo "Attach: tmux attach -t ghostclaw"
echo "Detach: Ctrl+B then D"