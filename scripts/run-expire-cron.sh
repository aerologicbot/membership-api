#!/usr/bin/env bash
# Memanggil job expiration. Dipasang di crontab host:
#
#   * * * * * /opt/aerologic/membership-api/scripts/run-expire-cron.sh >> /var/log/aerologic-expire.log 2>&1
#
# Secret dibaca dari .env, bukan ditulis di baris crontab — baris crontab
# terlihat di `ps` dan di /var/log/syslog milik cron.
set -euo pipefail
cd "$(dirname "$0")/.."

set -a
# shellcheck disable=SC1091
. ./.env
set +a

printf '[%s] ' "$(date -Is)"
# Lewat 127.0.0.1: tidak keluar-masuk internet, dan tetap jalan kalau
# sertifikat HTTPS sedang bermasalah.
curl -fsS --max-time 60 -X POST "http://127.0.0.1:3000/api/cron/expire" \
  -H "Authorization: Bearer ${CRON_SECRET}"
echo
