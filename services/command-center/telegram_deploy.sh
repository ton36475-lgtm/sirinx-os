# telegram_deploy.sh
# Deploy Telegram bot (uses TELEGRAM_BOT_TOKEN / TELOXIDE_TOKEN)

set -euo pipefail

echo "=== TELEGRAM BOT DEPLOY ==="

: "${TELEGRAM_BOT_TOKEN:?TELEGRAM_BOT_TOKEN required}"

echo "✅ Telegram credentials verified (hidden)"
echo "Ready for: cargo run --release -p ghostclaw-telegram"