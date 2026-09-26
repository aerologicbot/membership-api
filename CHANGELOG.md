# Changelog

Satu baris per perubahan, terbaru di atas. Detail ada di commit dan `README.md`.

## 2026-09-23

- **Pendaftaran:** halaman daftar di `/` dengan 8 field (nama, email, WhatsApp, username Telegram, jenis kelamin, pengalaman, range modal, sumber referral). Tabel baru `members`. ⚠️ Jalankan migration `002_members_and_start_tokens.sql`.
- **Bot:** verifikasi lewat deep-link `t.me/<bot>?start=<token>` menggantikan "bagikan kontak" — nomor WhatsApp di form tidak perlu sama dengan nomor akun Telegram.
- **Payment:** titik sambung `POST /api/membership/activate` (idempotent) untuk dipanggil webhook gateway. Sementara gateway belum ada, `AUTO_ACTIVATE_ON_REGISTER=true` mengaktifkan langsung saat daftar.
- **Keamanan:** `TELEGRAM_WEBHOOK_SECRET` kini wajib — sebelumnya webhook menerima semua request kalau secret kosong. `/api/membership/status` dan `/api/telegram/invite` butuh Bearer `CRON_SECRET`; `/api/telegram/verify` dihapus.
- **Desain:** halaman pendaftaran memakai sistem desain `aerologicbot-web-app` — token `app/globals.css` disalin apa adanya, primitives form (`cms-primitives.tsx`) di-port, font Inter, aksen `#E16602`. Repo ini sekarang pakai Tailwind v4.
- **Deploy:** `docker compose` kini menyertakan Caddy (HTTPS otomatis), `scripts/setup-webhook.sh` dan `scripts/run-expire-cron.sh` menggantikan script PowerShell. `README.md` ditulis ulang untuk VPS.
- **Cron:** membership expired yang tidak punya `telegram_user_id` kini ditandai selesai — sebelumnya baris itu diambil ulang tiap menit tanpa henti.
- **Test:** `npm test` (`node --test`) menutup validasi pendaftaran.
