# AeroLogic Membership API

Layanan pendaftaran member AeroLogic sekaligus bot Telegram yang menjaga pintu
grup VIP. Satu service Next.js: halaman daftar, API, dan webhook bot ada di
sini.

```text
1. User isi form pendaftaran        →  baris di tabel members
2. User membayar                    →  (belum terpasang — lihat §9)
3. Pembayaran sukses                →  membership ACTIVE + start_token dibuat
4. User dapat link t.me/<bot>?start=<token>
5. User tekan Start                 →  bot mengirim undangan grup, 15 menit, 1 orang
6. Cron tiap menit                  →  membership lewat tanggal ditandai EXPIRED
                                        dan user dikeluarkan dari grup
```

Kenapa deep-link token, bukan "bagikan kontak": nomor WhatsApp yang diisi di
form belum tentu sama dengan nomor akun Telegram, dan kalau beda user tidak
punya cara memperbaikinya sendiri. Token tidak bisa salah cocok.

## Daftar isi

1. [Prasyarat](#1-prasyarat)
2. [Setup Supabase](#2-setup-supabase)
3. [Setup bot dan grup Telegram](#3-setup-bot-dan-grup-telegram)
4. [Environment variables](#4-environment-variables)
5. [Menjalankan lokal](#5-menjalankan-lokal)
6. [Deploy ke VPS](#6-deploy-ke-vps)
7. [Uji end-to-end di production](#7-uji-end-to-end-di-production)
8. [Operasional harian](#8-operasional-harian)
9. [Menyambungkan payment gateway](#9-menyambungkan-payment-gateway)
10. [Referensi API](#10-referensi-api)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Prasyarat

- Node.js 22+ dan npm (untuk pengembangan lokal)
- Project Supabase — **project yang sama dengan `aerologicbot-web-app`**
- Bot Telegram dari `@BotFather`
- Grup Telegram privat
- Untuk production: VPS Linux (Ubuntu 24.04 LTS, 1 vCPU / 1 GB RAM sudah cukup)
  dan satu domain/subdomain

## 2. Setup Supabase

### 2.1 Jalankan migration

Buka **SQL Editor** di Supabase Dashboard, jalankan berurutan:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_members_and_start_tokens.sql`

Keduanya aman dijalankan ulang. Setelah selesai, **Table Editor** harus
memuat: `members`, `memberships`, `invite_logs`.

Ketiganya memakai Row Level Security tanpa satu pun policy — artinya hanya
service role (server ini) yang bisa membacanya. Tabel `members` berisi nama,
email, dan nomor WhatsApp; anon key tidak boleh bisa menyentuhnya.

### 2.2 Ambil kredensial

**Project Settings → API**:

- **Project URL** → `SUPABASE_URL` (tanpa `/rest/v1/` di belakang)
- **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (bukan anon key)

## 3. Setup bot dan grup Telegram

### 3.1 Bot

1. Chat `@BotFather` → `/newbot` → simpan token.
2. Catat username bot (tanpa `@`) untuk `TELEGRAM_BOT_USERNAME`.
3. `/setcommands` → pilih bot → isi:

```text
start - Aktifkan akses grup VIP
status - Lihat status membership
```

### 3.2 Grup

1. Buat grup, ubah jadi **Private**.
2. Tambahkan bot, jadikan **administrator**.
3. Aktifkan permission: **invite users via link** dan **ban users**.

Tanpa dua permission itu bot tidak bisa membuat undangan maupun mengeluarkan
member yang habis masa aktifnya.

### 3.3 Ambil Group ID

`getUpdates` hanya bisa dipakai saat webhook belum aktif:

```bash
curl "https://api.telegram.org/bot<TOKEN>/deleteWebhook"
# kirim /start@NamaBot di dalam grup, lalu:
curl "https://api.telegram.org/bot<TOKEN>/getUpdates"
```

Cari object dengan `chat.type` = `group`/`supergroup`, salin `chat.id`
(biasanya berbentuk `-1001234567890`) ke `TELEGRAM_GROUP_ID`.

URL Bot API mengandung token — jangan di-screenshot atau dibagikan.

## 4. Environment variables

```bash
cp .env.example .env
```

| Variable | Isi |
|---|---|
| `SUPABASE_URL` | Project URL Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key |
| `TELEGRAM_BOT_TOKEN` | Token dari BotFather |
| `TELEGRAM_GROUP_ID` | ID grup VIP |
| `TELEGRAM_BOT_USERNAME` | Username bot tanpa `@` |
| `TELEGRAM_WEBHOOK_SECRET` | Secret acak, divalidasi di tiap webhook |
| `DOMAIN` | Domain production, dipakai Caddy |
| `CRON_SECRET` | Secret acak, melindungi semua endpoint internal |
| `AUTO_ACTIVATE_ON_REGISTER` | `true` selama payment belum ada, `false` setelahnya |

Dua secret acak yang berbeda:

```bash
openssl rand -hex 32
openssl rand -hex 32
```

> **`AUTO_ACTIVATE_ON_REGISTER=true` membuat siapa pun yang mengisi form
> langsung dapat akses grup VIP tanpa membayar.** Itu memang gunanya selama
> pembayaran belum tersambung, tapi jangan tinggalkan dalam keadaan `true`
> setelah gateway hidup.

## 5. Menjalankan lokal

```bash
npm install
npm run dev          # http://localhost:3000 — halaman pendaftaran
npm run cron:dev     # job expiration tiap 60 detik
npm test             # unit test validasi pendaftaran
npm run build        # verifikasi sebelum deploy
```

Bot tidak bisa diuji dari `localhost` — Telegram hanya mengirim webhook ke
HTTPS publik. Untuk mencoba bot dari mesin lokal, pakai Cloudflare Quick
Tunnel:

```bash
cloudflared tunnel --url http://localhost:3000
./scripts/setup-webhook.sh https://url-yang-muncul.trycloudflare.com
```

URL Quick Tunnel berubah tiap kali dijalankan, jadi webhook harus didaftarkan
ulang setiap kali. Di production hal ini tidak berlaku — domainnya tetap.

## 6. Deploy ke VPS

Hasil akhir: `https://domain-kamu.com` menyajikan halaman pendaftaran dan
menerima webhook Telegram, dengan sertifikat HTTPS yang diperpanjang sendiri.

### 6.1 Siapkan VPS

Pilih provider mana pun (Hetzner, DigitalOcean, Contabo, Biznet, Idcloudhost).
Spesifikasi minimum: 1 vCPU, 1 GB RAM, 20 GB disk, Ubuntu 24.04 LTS.

Masuk sebagai root, lalu buat user non-root:

```bash
adduser aerologic
usermod -aG sudo aerologic
rsync --archive --chown=aerologic:aerologic ~/.ssh /home/aerologic
```

Keluar, lalu masuk lagi sebagai user itu: `ssh aerologic@IP_VPS`.

### 6.2 Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

Port 3000 sengaja **tidak** dibuka — aplikasi hanya bisa dicapai lewat Caddy.

### 6.3 Arahkan domain

Di panel DNS, buat A record:

```text
api.aerologic.id   A   IP_VPS_KAMU
```

Tunggu sampai resolve sebelum lanjut:

```bash
dig +short api.aerologic.id
```

Harus mengembalikan IP VPS. Kalau belum, tunggu propagasi DNS — Caddy akan
gagal menerbitkan sertifikat kalau domainnya belum mengarah ke sini.

### 6.4 Install Docker

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
newgrp docker
docker --version
docker compose version
```

### 6.5 Ambil kode dan isi .env

```bash
sudo mkdir -p /opt/aerologic && sudo chown "$USER" /opt/aerologic
cd /opt/aerologic
git clone https://github.com/aerologicbot/membership-api.git
cd membership-api

cp .env.example .env
nano .env          # isi semua nilai, termasuk DOMAIN
chmod 600 .env     # hanya pemilik yang boleh membaca
```

Repo ini privat? Pakai deploy key atau `gh auth login` di VPS.

### 6.6 Nyalakan

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f app
```

Tunggu sampai `app` berstatus `healthy`. Cek dari VPS sendiri:

```bash
curl -fsS http://127.0.0.1:3000/api/health
```

Lalu dari luar (mesin kamu):

```bash
curl -fsS https://api.aerologic.id/api/health
```

Keduanya harus membalas `{"status":"healthy",...}`. Kalau HTTPS gagal, lihat
log Caddy: `docker compose logs caddy`.

### 6.7 Daftarkan webhook Telegram

```bash
./scripts/setup-webhook.sh https://api.aerologic.id
```

Output harus memuat `"ok":true` dan `getWebhookInfo` harus menunjukkan URL
tersebut dengan `last_error_message` kosong.

### 6.8 Pasang cron expiration

Membership tidak berhenti sendiri hanya karena tanggalnya lewat — job ini yang
menandai EXPIRED dan mengeluarkan user dari grup.

```bash
sudo touch /var/log/aerologic-expire.log
sudo chown "$USER" /var/log/aerologic-expire.log
crontab -e
```

Tambahkan satu baris:

```cron
* * * * * /opt/aerologic/membership-api/scripts/run-expire-cron.sh >> /var/log/aerologic-expire.log 2>&1
```

Script-nya membaca `CRON_SECRET` dari `.env` dan memanggil `127.0.0.1`, jadi
secret tidak pernah muncul di baris crontab maupun di `ps`.

Pastikan jalan:

```bash
tail -f /var/log/aerologic-expire.log
```

Dalam satu menit harus muncul baris berisi `{"processed":0,...}`.

### 6.9 Rotasi log

Supaya log cron tidak menggerogoti disk:

```bash
sudo tee /etc/logrotate.d/aerologic >/dev/null <<'CONF'
/var/log/aerologic-expire.log {
  weekly
  rotate 4
  compress
  missingok
  notifempty
  copytruncate
}
CONF
```

## 7. Uji end-to-end di production

1. Set `AUTO_ACTIVATE_ON_REGISTER=true` di `.env`, lalu
   `docker compose up -d` untuk memuat ulang.
2. Buka `https://api.aerologic.id` dan isi form dengan data kamu sendiri.
3. Layar sukses menampilkan link `t.me/<bot>?start=<token>` — klik.
4. Tekan **Start** di Telegram. Bot mengirim tombol **Gabung Grup VIP**.
5. Klik tombolnya — kamu masuk grup.
6. Cek Supabase: `members` bertambah satu baris, `memberships` berstatus
   `ACTIVE` dengan `telegram_user_id` dan `start_token_used_at` terisi,
   `invite_logs` punya baris dengan `used_at`.
7. Kirim `/status` ke bot — harus menampilkan paket dan tanggal berakhir.
8. Uji expiration. Di SQL Editor:

```sql
update public.memberships
set expired_at = now()
where member_id = (select id from public.members where email = 'email-kamu@contoh.com')
returning id, status, expired_at, telegram_user_id;
```

Dalam satu menit kamu harus keluar dari grup sendirinya, `status` jadi
`EXPIRED`, dan `kick_processed_at` terisi.

9. Buka lagi link `?start=` yang sama — bot harus menolak karena membership
   sudah berakhir.
10. Perpanjang lewat API, lalu ulangi langkah 3–5:

```bash
curl -fsS -X POST https://api.aerologic.id/api/membership/activate \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"email":"email-kamu@contoh.com","package":"1_BULAN"}'
```

11. **Kembalikan `AUTO_ACTIVATE_ON_REGISTER=false`** kalau pengujian sudah
    selesai dan kamu tidak sedang menjual akses gratis.

## 8. Operasional harian

**Update kode:**

```bash
cd /opt/aerologic/membership-api
git pull
docker compose up -d --build
docker compose logs -f app
```

**Ubah .env:** wajib restart supaya terbaca.

```bash
nano .env && docker compose up -d
```

**Melihat log:**

```bash
docker compose logs -f app         # aplikasi
docker compose logs -f caddy       # HTTPS
tail -f /var/log/aerologic-expire.log
```

**Backup:** semua data ada di Supabase, bukan di VPS. Aktifkan Point-in-Time
Recovery di Supabase kalau datanya sudah bernilai. Yang perlu disalin dari VPS
hanya `.env`.

**Mengaktifkan member secara manual** (misalnya pembayaran lewat transfer):

```bash
cd /opt/aerologic/membership-api && set -a && . ./.env && set +a
curl -fsS -X POST http://127.0.0.1:3000/api/membership/activate \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"email":"member@contoh.com"}'
```

Responsnya berisi `start_url` — kirimkan itu ke member.

## 9. Menyambungkan payment gateway

Titik sambungnya sudah ada: `POST /api/membership/activate`.

1. Pasang Midtrans Snap di halaman pendaftaran: setelah `register()` berhasil,
   arahkan user ke Snap alih-alih menampilkan layar sukses.
2. Buat route webhook Midtrans, verifikasi `signature_key`.
3. Saat status `settlement`/`capture`, panggil `activateMembership()` (atau
   `POST /api/membership/activate`) dengan email pembeli.
4. Kirim `start_url` ke email member.
5. Set `AUTO_ACTIVATE_ON_REGISTER=false`.

`activateMembership()` sudah idempotent — Midtrans sering mengirim notifikasi
yang sama lebih dari sekali, dan pemanggilan kedua hanya memperpanjang, tidak
menggandakan baris.

## 10. Referensi API

| Method | Route | Proteksi | Fungsi |
|---|---|---|---|
| `GET` | `/` | — | Halaman pendaftaran |
| `GET` | `/api/health` | — | Health check |
| `POST` | `/api/telegram/webhook` | Header secret Telegram | Menerima update bot |
| `POST` | `/api/membership/activate` | Bearer `CRON_SECRET` | Aktifkan/perpanjang + terbitkan token |
| `GET` | `/api/membership/status` | Bearer `CRON_SECRET` | Status via `email` atau `telegram_user_id` |
| `POST` | `/api/membership/renew` | Bearer `CRON_SECRET` | Perpanjang berdasarkan `membership_id` |
| `POST` | `/api/telegram/invite` | Bearer `CRON_SECRET` | Terbitkan ulang undangan grup |
| `POST` | `/api/cron/expire` | Bearer `CRON_SECRET` | Tandai expired + keluarkan dari grup |

Semua endpoint selain halaman pendaftaran, health check, dan webhook butuh
`CRON_SECRET`. Tidak ada satu pun yang boleh dipanggil dari browser — respons
`/api/membership/status` berisi data pribadi member.

## 11. Troubleshooting

**Caddy tidak dapat sertifikat.** Cek `dig +short DOMAIN` mengembalikan IP VPS,
port 80 dan 443 terbuka di ufw *dan* di firewall provider, lalu
`docker compose logs caddy`. Let's Encrypt punya rate limit — jangan restart
berulang-ulang saat gagal.

**Bot diam saja.** Cek `getWebhookInfo`:

```bash
curl -fsS "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

Perhatikan `url`, `pending_update_count`, dan `last_error_message`. Kalau ada
`401`, `TELEGRAM_WEBHOOK_SECRET` di `.env` berbeda dengan yang didaftarkan —
jalankan ulang `./scripts/setup-webhook.sh`.

**"Link ini tidak dikenali".** Token tidak ada di database. Terbitkan ulang
lewat `/api/membership/activate`.

**"Link ini sudah dipakai akun Telegram lain".** Token sudah diklaim akun lain.
Kalau memang salah orang, kosongkan `telegram_user_id` dan
`start_token_used_at` di baris itu, lalu terbitkan token baru.

**Bot tidak bisa membuat undangan.** Bot belum admin, atau permission "invite
users via link" mati. Cek juga `TELEGRAM_GROUP_ID` benar-benar grup yang sama.

**User expired tidak dikeluarkan.** Lihat `/var/log/aerologic-expire.log` dan
kolom `kick_last_error`. `NO_TELEGRAM_USER_ID` berarti user tidak pernah
membuka link bot-nya, jadi tidak ada yang bisa dikeluarkan.

**Pendaftaran gagal terus.** `docker compose logs -f app`. Penyebab umum:
`SUPABASE_URL` masih placeholder atau berakhiran `/rest/v1/`, anon key terpakai
sebagai service role key, atau migration `002` belum dijalankan.

**Jam berbeda dengan Supabase.** Supabase menyimpan `timestamptz` dalam UTC;
bot menampilkannya dalam Asia/Jakarta. Pakai `now()` dan interval SQL, jangan
konversi manual.
