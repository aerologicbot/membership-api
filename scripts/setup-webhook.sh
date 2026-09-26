#!/usr/bin/env bash
# Mendaftarkan webhook Telegram ke domain production.
#
#   ./scripts/setup-webhook.sh https://api.aerologic.id
#
# Membaca TELEGRAM_BOT_TOKEN dan TELEGRAM_WEBHOOK_SECRET dari .env di folder
# yang sama. Path /api/telegram/webhook ditambahkan otomatis.
set -euo pipefail

BASE_URL="${1:-}"
if [[ -z "$BASE_URL" ]]; then
  echo "Pakai: $0 https://domain-kamu.com" >&2
  exit 1
fi
if [[ "$BASE_URL" != https://* ]]; then
  echo "Telegram hanya menerima webhook HTTPS. URL harus diawali https://" >&2
  exit 1
fi

ENV_FILE="$(dirname "$0")/../.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "File .env tidak ditemukan di $ENV_FILE" >&2
  exit 1
fi
set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

: "${TELEGRAM_BOT_TOKEN:?TELEGRAM_BOT_TOKEN belum diisi di .env}"
: "${TELEGRAM_WEBHOOK_SECRET:?TELEGRAM_WEBHOOK_SECRET belum diisi di .env}"

WEBHOOK_URL="${BASE_URL%/}/api/telegram/webhook"
API="https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}"

echo "Mendaftarkan webhook: $WEBHOOK_URL"
# allowed_updates dibatasi dua jenis yang benar-benar dipakai: "message" untuk
# /start dan /status, "chat_member" untuk menandai invite yang sudah terpakai.
curl -fsS -X POST "${API}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"${WEBHOOK_URL}\",\"secret_token\":\"${TELEGRAM_WEBHOOK_SECRET}\",\"allowed_updates\":[\"message\",\"chat_member\"]}"
echo

echo "Status webhook sekarang:"
curl -fsS "${API}/getWebhookInfo"
echo
