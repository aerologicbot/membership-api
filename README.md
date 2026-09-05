# Aerologic Access — Telegram Premium Membership Demo

Demo ini mengontrol akses ke private Telegram group berdasarkan status membership di Supabase.

Alur utamanya:

```text
User Telegram
  → Telegram mengirim update ke webhook HTTPS
  → Cloudflare Tunnel meneruskan update ke Next.js lokal
  → Next.js membaca membership dari Supabase
  → Bot membuat invite untuk member ACTIVE
  → Cron menandai membership yang habis dan mengeluarkan user dari grup
```

> Panduan utama di bawah menggunakan **Windows + Git Bash**. Command yang harus dijalankan dengan PowerShell ditandai secara eksplisit.

## Daftar isi

1. [Prasyarat](#1-prasyarat)
2. [Setup Supabase](#2-setup-supabase)
3. [Setup bot Telegram](#3-setup-bot-telegram)
4. [Setup private group](#4-setup-private-group)
5. [Konfigurasi environment](#5-konfigurasi-environment)
6. [Menjalankan aplikasi lokal](#6-menjalankan-aplikasi-lokal)
7. [Menjalankan Cloudflare Tunnel](#7-menjalankan-cloudflare-tunnel)
8. [Mendaftarkan webhook](#8-mendaftarkan-webhook)
9. [Menjalankan cron lokal](#9-menjalankan-cron-lokal)
10. [Menguji lifecycle lengkap](#10-menguji-lifecycle-lengkap)
11. [Cara menjalankan ulang setelah terminal/laptop ditutup](#11-cara-menjalankan-ulang-setelah-terminallaptop-ditutup)
12. [Troubleshooting](#12-troubleshooting)
13. [Deployment VM](#13-deployment-vm)
14. [Referensi API](#14-referensi-api)

## 1. Prasyarat

Pastikan sudah tersedia:

- Node.js 20 atau lebih baru
- npm
- Project Supabase
- Akun Telegram
- Bot Telegram dari `@BotFather`
- Private Telegram group
- Git Bash

Periksa Node dan npm:

```bash
node --version
npm --version
```

Install dependency project:

```bash
cd /d/AEROLOGIC/Aerologic-access
npm install
```

## 2. Setup Supabase

### 2.1 Membuat tabel dan function

1. Buka Supabase Dashboard.
2. Pilih project yang akan digunakan.
3. Buka **SQL Editor**.
4. Buka file [`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql).
5. Salin seluruh isinya ke SQL Editor.
6. Klik **Run**.

Migration `001_initial_schema.sql` adalah schema final yang sudah terkonsolidasi. File yang sama dapat dijalankan pada project baru maupun dijalankan ulang untuk memperbarui schema versi sebelumnya.

Setelah berhasil, buka **Table Editor**. Tabel berikut harus tersedia:

- `memberships`
- `invite_logs`

Function berikut juga dibuat:

- `claim_expired_memberships`
- `renew_membership`

Perbaikan constraint nomor telepon dan retry kick sudah termasuk dalam migration tunggal tersebut. Tidak ada migration tambahan yang perlu dijalankan.

### 2.2 Menambahkan member demo

Gunakan nomor yang sama dengan nomor akun Telegram yang akan melakukan tes. Nomor wajib menggunakan format internasional `+62`, bukan `08`.

```sql
insert into public.memberships (
  telegram_phone,
  package,
  status,
  started_at,
  expired_at
)
values (
  '+6285710884081',
  'DEMO_1_HOUR',
  'ACTIVE',
  now(),
  now() + interval '1 hour'
)
on conflict (telegram_phone)
do update set
  package = excluded.package,
  status = 'ACTIVE',
  started_at = now(),
  expired_at = now() + interval '1 hour'
returning *;
```

Ganti `+6285710884081` dengan nomor akun Telegram yang digunakan untuk tes.

Kolom `telegram_user_id` boleh kosong saat insert. Bot akan mengisinya setelah user membagikan kontak.

### 2.3 Mengambil URL dan service-role key

Di Supabase Dashboard buka **Project Settings → API** atau **Data API**.

Ambil:

- **Project URL**, berbentuk `https://project-id.supabase.co`
- **service_role key**, bukan `anon` key

Project URL tidak boleh memiliki `/rest/v1/` di belakangnya.

Benar:

```env
SUPABASE_URL=https://project-id.supabase.co
```

Salah:

```env
SUPABASE_URL=https://project-id.supabase.co/rest/v1/
```

## 3. Setup bot Telegram

1. Buka chat dengan `@BotFather`.
2. Kirim `/newbot`.
3. Tentukan nama dan username bot.
4. Simpan bot token yang diberikan.
5. Kirim `/setcommands` ke BotFather.
6. Pilih bot dan masukkan:

```text
start - Verifikasi membership
status - Lihat status membership
```

Jangan membagikan bot token atau memasukkannya ke source code.

## 4. Setup private group

1. Buat Telegram group.
2. Ubah group menjadi **Private**.
3. Tambahkan bot ke group.
4. Jadikan bot sebagai administrator.
5. Aktifkan permission untuk:
   - membuat atau mengelola invite link;
   - ban/restrict member.

Bot harus memiliki kedua permission tersebut agar dapat membuat invite dan mengeluarkan member expired.

### 4.1 Mendapatkan Group ID

Metode `getUpdates` hanya dapat dipakai ketika webhook belum aktif.

1. Tambahkan bot ke group.
2. Setelah webhook dihapus pada langkah berikutnya, kirim command baru di group, misalnya `/start@USERNAME_BOT`. Command lebih andal daripada pesan biasa ketika privacy mode bot aktif.
3. Jika webhook pernah aktif, hapus sementara:

```text
https://api.telegram.org/bot<TOKEN>/deleteWebhook?drop_pending_updates=false
```

4. Buka:

```text
https://api.telegram.org/bot<TOKEN>/getUpdates
```

5. Refresh `getUpdates` jika hasil masih kosong. Respons harus memiliki `"ok": true`.
6. Cari object dengan `chat.type` berupa `group` atau `supergroup`, cocokkan `chat.title`, lalu salin nilai `chat.id`.

ID private supergroup biasanya seperti:

```text
-1001234567890
```

Setelah mendapatkan ID, webhook akan dipasang kembali pada langkah 8.

URL Bot API mengandung token. Jangan membagikan screenshot, browser history, atau URL lengkap tersebut.

## 5. Konfigurasi environment

Jika `.env` belum ada:

```bash
cp .env.example .env
```

Isi `.env`:

```env
SUPABASE_URL=https://project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=service-role-key-asli

TELEGRAM_BOT_TOKEN=token-dari-botfather
TELEGRAM_GROUP_ID=-1001234567890

CRON_SECRET=secret-random-pertama
TELEGRAM_WEBHOOK_SECRET=secret-random-kedua
```

Buat dua secret berbeda lewat Git Bash:

```bash
openssl rand -hex 32
openssl rand -hex 32
```

Jika `openssl` tidak tersedia:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Jalankan command Node tersebut dua kali.

Kegunaan secret:

- `CRON_SECRET` melindungi endpoint cron dan renewal.
- `TELEGRAM_WEBHOOK_SECRET` memvalidasi request webhook dari Telegram.

Aturan penting:

- Jangan commit `.env`.
- Jangan memakai service-role key di frontend/browser.
- Jangan menambahkan tanda kutip kecuali nilainya memang mengandung tanda kutip.
- Restart `npm run dev` setiap kali `.env` berubah.

## 6. Menjalankan aplikasi lokal

Buka **Terminal 1**:

```bash
cd /d/AEROLOGIC/Aerologic-access
npm run dev
```

Biarkan terminal tetap terbuka.

Buka browser:

```text
http://localhost:3000
```

Periksa health endpoint:

```bash
curl "http://localhost:3000/api/health"
```

Expected response:

```json
{"status":"healthy","timestamp":"..."}
```

Periksa membership berdasarkan nomor:

```bash
curl "http://localhost:3000/api/membership/status?phone=%2B6285710884081"
```

`%2B` adalah URL encoding untuk karakter `+`. Ganti digit nomor sesuai data Supabase.

Expected response untuk member aktif berisi:

```json
{
  "telegram_phone": "+6285710884081",
  "status": "ACTIVE"
}
```

Jangan lanjut ke Telegram sebelum endpoint membership memberikan HTTP 200.

## 7. Menjalankan Cloudflare Tunnel

Telegram tidak dapat mengakses `localhost`. Cloudflare Tunnel memberikan URL HTTPS publik dan meneruskan request ke `http://localhost:3000`.

Alurnya:

```text
Telegram → URL trycloudflare.com → localhost:3000 → Next.js
```

Binary portable tersedia di `.tools/cloudflared.exe`. Buka **Terminal 2**:

```bash
cd /d/AEROLOGIC/Aerologic-access
./.tools/cloudflared.exe tunnel --url http://localhost:3000
```

Jika file portable belum tersedia, download executable Windows 64-bit dari dokumentasi resmi Cloudflare dan simpan sebagai `.tools/cloudflared.exe`.

Tunggu sampai muncul URL seperti:

```text
https://random-words.trycloudflare.com
```

Salin URL tersebut dan biarkan Terminal 2 terbuka.

Penting:

- Quick Tunnel hanya aktif selama proses `cloudflared` hidup.
- Menutup terminal akan mematikan URL tersebut.
- Setiap kali tunnel dijalankan ulang, URL biasanya berubah.
- Jika URL berubah, webhook harus didaftarkan ulang.

## 8. Mendaftarkan webhook

Script webhook otomatis membaca token dan secret dari `.env`.

Buka **Terminal 3**, lalu jalankan dari Git Bash:

```bash
cd /d/AEROLOGIC/Aerologic-access
powershell.exe -ExecutionPolicy Bypass -File "./scripts/setup-telegram.ps1" -BaseUrl "https://random-words.trycloudflare.com"
```

Ganti URL dengan URL dari Terminal 2. Jangan tambahkan `/api/telegram/webhook`; script menambahkannya otomatis.

Expected output mengandung:

```json
{
  "ok": true,
  "result": true
}
```

Webhook info harus menunjukkan URL seperti:

```text
https://random-words.trycloudflare.com/api/telegram/webhook
```

Update yang diizinkan harus mencakup:

```text
message
chat_member
```

Webhook dinyatakan sehat jika:

- `pending_update_count` turun menuju `0`;
- `last_error_message` kosong;
- URL sama dengan URL tunnel terbaru.

Tes jalur tunnel secara langsung:

```bash
curl "https://random-words.trycloudflare.com/api/health"
```

Respons harus memiliki `"status":"healthy"` sebelum mengetes bot.

Tes bot melalui chat pribadi:

1. Kirim `/start`.
2. Bot harus menampilkan tombol **Bagikan kontak**.
3. Tekan tombol tersebut; jangan mengirim nomor dengan mengetik manual.
4. Kontak harus merupakan kontak milik akun Telegram yang sedang digunakan.

## 9. Menjalankan cron lokal

Membership tidak otomatis diproses hanya karena `expired_at` sudah lewat. Endpoint expiration harus dipanggil scheduler.

Buka **Terminal 3 atau Terminal 4**:

```bash
cd /d/AEROLOGIC/Aerologic-access
npm run cron:dev
```

Expected output:

```text
Local expiration cron aktif: http://localhost:3000/api/cron/expire (setiap 60 detik)
```

Runner langsung memanggil cron sekali, lalu mengulang setiap 60 detik.

Ketika ada membership expired, output yang berhasil akan berisi hasil seperti:

```json
{
  "processed": 1,
  "results": [
    {
      "id": "...",
      "kicked": true
    }
  ]
}
```

Jika `processed` bernilai `0`, tidak ada row `ACTIVE` dengan `expired_at <= now()`.

Jika Telegram gagal mengeluarkan user, hasil berisi `kicked:false` dan pesan error disimpan di `kick_last_error`. Cron akan mencoba lagi setiap menit sampai `kick_processed_at` terisi.

## 10. Menguji lifecycle lengkap

### 10.1 Kondisi awal

Pastikan ketiga proses berikut hidup:

```text
Terminal 1: npm run dev
Terminal 2: ./.tools/cloudflared.exe tunnel --url http://localhost:3000
Terminal 3: npm run cron:dev
```

Pastikan webhook sudah didaftarkan ke URL Terminal 2.

### 10.2 Verifikasi member aktif

1. Pastikan nomor akun Telegram ada di `memberships` dan status `ACTIVE`.
2. Kirim `/start` lewat private chat dengan bot.
3. Tekan **Bagikan kontak**.
4. Bot menyimpan `telegram_user_id` ke Supabase.
5. Bot membuat invite yang berlaku 15 menit dan maksimal dipakai satu member.
6. Klik invite dan masuk ke private group.
7. Periksa `invite_logs` di Supabase.

Setelah join, row invite terkait seharusnya memiliki `used_at`.

### 10.3 Memeriksa status

Kirim:

```text
/status
```

Bot harus menampilkan package, status, dan expiration time.

### 10.4 Mempercepat expiration untuk demo

Di Supabase SQL Editor:

```sql
update public.memberships
set expired_at = now()
where telegram_phone = '+6285710884081'
returning id, telegram_phone, telegram_user_id, status, expired_at;
```

Pastikan `telegram_user_id` tidak kosong. Tunggu maksimal satu menit atau lihat Terminal cron.

Hasil yang diharapkan:

1. Status database berubah dari `ACTIVE` menjadi `EXPIRED`.
2. User dikeluarkan dari private group.
3. `kick_processed_at` terisi dan `kick_last_error` kosong.
4. User tidak mendapat invite baru ketika menjalankan `/start`.

Bot memakai pola ban lalu unban. User langsung keluar, tetapi tidak diblokir permanen sehingga dapat join kembali setelah renewal.

### 10.5 Menjalankan cron manual

Jika ingin memproses tanpa menunggu satu menit, jalankan dari Git Bash. Ganti secret dengan nilai `CRON_SECRET` dari `.env`:

```bash
curl -X POST "http://localhost:3000/api/cron/expire" \
  -H "Authorization: Bearer CRON_SECRET_KAMU"
```

### 10.6 Renewal

Ambil UUID membership dari Table Editor atau hasil query SQL. Jalankan:

```bash
curl -X POST "http://localhost:3000/api/membership/renew" \
  -H "Authorization: Bearer CRON_SECRET_KAMU" \
  -H "Content-Type: application/json" \
  -d '{"membership_id":"UUID-MEMBERSHIP","hours":1}'
```

Aturan renewal:

- Jika masih aktif, durasi ditambahkan dari `expired_at`.
- Jika sudah expired, durasi dihitung dari waktu sekarang.
- Status diubah kembali menjadi `ACTIVE`.

Setelah renewal:

1. Kirim `/start`.
2. Bagikan kontak kembali.
3. Bot membuat invite baru.
4. User dapat masuk kembali ke group.

## 11. Cara menjalankan ulang setelah terminal/laptop ditutup

### Jika hanya `npm run dev` berhenti

Jalankan kembali:

```bash
npm run dev
```

Jika tunnel masih hidup dan tetap mengarah ke port 3000, webhook tidak perlu diubah.

Hentikan proses yang sedang berjalan secara bersih dengan `Ctrl+C` pada terminal terkait.

### Jika Cloudflare Tunnel berhenti

1. Jalankan tunnel kembali:

```bash
./.tools/cloudflared.exe tunnel --url http://localhost:3000
```

2. Salin URL baru.
3. Daftarkan webhook kembali:

```bash
powershell.exe -ExecutionPolicy Bypass -File "./scripts/setup-telegram.ps1" -BaseUrl "https://URL-BARU.trycloudflare.com"
```

### Jika cron berhenti

Jalankan kembali:

```bash
npm run cron:dev
```

Membership yang sudah terlanjur melewati `expired_at` akan diproses saat runner dimulai.

### Setelah laptop direstart

Jalankan ulang dalam urutan berikut, selalu dari folder project:

1. `cd /d/AEROLOGIC/Aerologic-access && npm run dev`
2. `cd /d/AEROLOGIC/Aerologic-access && ./.tools/cloudflared.exe tunnel --url http://localhost:3000`
3. Daftarkan webhook ke URL tunnel baru.
4. `cd /d/AEROLOGIC/Aerologic-access && npm run cron:dev`

### Jika `npm run dev` mengatakan port 3000 sudah digunakan

Kemungkinan proses lama masih hidup. Cari PID dari PowerShell:

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen | Select-Object OwningProcess
```

Periksa prosesnya:

```powershell
Get-Process -Id PID_DARI_COMMAND_SEBELUMNYA
```

Hentikan hanya jika sudah yakin itu proses Next.js lama:

```powershell
Stop-Process -Id PID_DARI_COMMAND_SEBELUMNYA
```

Kemudian jalankan `npm run dev` kembali.

## 12. Troubleshooting

### Bot tidak merespons, tetapi frontend terbuka

Frontend hanya membuktikan Next.js lokal aktif. Periksa juga:

1. Cloudflare Tunnel masih hidup.
2. Webhook memakai URL tunnel terbaru.
3. Endpoint membership tidak menghasilkan HTTP 500.

Periksa webhook:

```text
https://api.telegram.org/bot<TOKEN>/getWebhookInfo
```

Perhatikan:

- `url`
- `pending_update_count`
- `last_error_message`

`530` biasanya berarti Quick Tunnel lama sudah mati. Jalankan tunnel dan daftarkan URL baru.

### Webhook menghasilkan HTTP 500

Lihat error pada Terminal 1 (`npm run dev`). Kemudian cek:

```bash
curl "http://localhost:3000/api/membership/status?phone=%2B6285710884081"
```

Penyebab umum:

- `SUPABASE_URL` masih placeholder.
- `SUPABASE_URL` salah karena memiliki `/rest/v1/`.
- service-role key salah atau memakai anon key.
- migration belum dijalankan.
- server belum direstart setelah `.env` berubah.

### Membership tidak ditemukan

Pastikan nomor di Supabase sama dengan nomor kontak Telegram setelah dinormalisasi:

```text
085710884081 → +6285710884081
```

Jangan membuat beberapa row untuk nomor yang sama.

### Bot meminta kontak, tetapi tidak memberi invite

Periksa:

- kontak yang dibagikan adalah milik user itu sendiri;
- membership ditemukan dan masih `ACTIVE`;
- `expired_at` belum lewat;
- bot adalah admin group;
- bot dapat membuat invite link;
- `TELEGRAM_GROUP_ID` mengarah ke group yang benar.

### User expired tidak dikeluarkan

Periksa Terminal cron. Selain itu pastikan:

- `npm run cron:dev` hidup;
- row sebelumnya berstatus `ACTIVE`;
- `expired_at <= now()`;
- `telegram_user_id` sudah terisi;
- user sedang berada di group yang benar;
- bot memiliki permission ban/restrict members.
- migration `001_initial_schema.sql` versi terbaru sudah dijalankan.

Jalankan cron manual dan baca hasilnya:

```bash
curl -X POST "http://localhost:3000/api/cron/expire" \
  -H "Authorization: Bearer CRON_SECRET_KAMU"
```

### Status terlihat expired tetapi kolom database masih ACTIVE

Endpoint status menghitung expiration berdasarkan waktu saat ini. Perubahan permanen kolom database dan proses kick dilakukan cron. Pastikan cron berjalan.

### Perbedaan jam Supabase dan waktu lokal

Supabase menyimpan `timestamptz` dalam UTC. Bot menampilkan waktu dalam zona `Asia/Jakarta`. Gunakan `now()` dan interval SQL untuk menghindari salah konversi manual.

### `cloudflared: command not found`

Gunakan binary portable dari folder project:

```bash
./.tools/cloudflared.exe --version
./.tools/cloudflared.exe tunnel --url http://localhost:3000
```

### Telegram menyimpan banyak pending update

Setelah webhook kembali sehat, Telegram akan mencoba mengirim update lama. Beberapa balasan lama dapat muncul berurutan. Jika ingin menghapus semuanya, `deleteWebhook` memiliki opsi `drop_pending_updates=true`, tetapi tindakan itu menghilangkan update yang belum diproses.

## 13. Deployment VM

Cloudflare Quick Tunnel hanya digunakan untuk development lokal. Di VM, gunakan domain HTTPS permanen:

```text
Telegram → https://domain-kamu.com/api/telegram/webhook → Next.js di VM
```

### 13.1 Menjalankan container

VM membutuhkan Docker Engine, Docker Compose plugin, domain yang sudah diarahkan ke IP VM, dan firewall yang membuka port `80`/`443`. Port aplikasi `3000` di Compose hanya dibind ke `127.0.0.1` agar tidak melewati reverse proxy HTTPS.

Upload atau clone project ke VM, buat `.env`, lalu:

```bash
docker compose up -d --build
```

Periksa:

```bash
docker compose ps
docker compose logs -f app
```

Batasi permission `.env`:

```bash
chmod 600 .env
```

Pasang Nginx atau Caddy sebagai HTTPS reverse proxy menuju `127.0.0.1:3000`.

### 13.2 Mendaftarkan webhook production

Daftarkan:

```text
https://domain-kamu.com/api/telegram/webhook
```

Gunakan `TELEGRAM_WEBHOOK_SECRET` yang sama dengan environment aplikasi di VM.

Contoh pendaftaran dari folder project di VM:

```bash
set -a
. ./.env
set +a
curl -fsS -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"https://domain-kamu.com/api/telegram/webhook\",\"secret_token\":\"${TELEGRAM_WEBHOOK_SECRET}\",\"allowed_updates\":[\"message\",\"chat_member\"]}"
```

### 13.3 Cron production

Buka crontab:

```bash
crontab -e
```

Tambahkan:

```cron
* * * * * curl -fsS -X POST -H "Authorization: Bearer GANTI_DENGAN_CRON_SECRET" https://domain-kamu.com/api/cron/expire >> /var/log/telegram-membership-cron.log 2>&1
```

Cron production menggantikan `npm run cron:dev`. Jangan menjalankan keduanya untuk environment yang sama.

## 14. Referensi API

> **Batas keamanan MVP:** endpoint `/api/telegram/verify`, `/api/telegram/invite`, dan status belum memiliki autentikasi user. Jangan mengekspos prototype ini sebagai layanan production publik. Sebelum production nyata, tambahkan autentikasi/otorisasi, rate limiting, validasi kepemilikan user, logging, dan rotasi secret.

| Method | Route | Proteksi | Fungsi |
|---|---|---|---|
| `GET` | `/api/health` | Tidak ada | Memeriksa aplikasi hidup |
| `POST` | `/api/telegram/webhook` | Telegram secret header | Menerima update Telegram |
| `POST` | `/api/telegram/verify` | Tidak ada pada MVP | Verifikasi phone dan Telegram ID |
| `POST` | `/api/telegram/invite` | Tidak ada pada MVP | Membuat invite untuk user aktif |
| `GET` | `/api/membership/status` | Tidak ada pada MVP | Status melalui `phone` atau `telegram_user_id` |
| `POST` | `/api/membership/renew` | Bearer `CRON_SECRET` | Memperpanjang membership |
| `POST` | `/api/cron/expire` | Bearer `CRON_SECRET` | Expire membership dan kick user |

## Checklist cepat sebelum demo

- [ ] Migration Supabase sudah dijalankan.
- [ ] Nomor user tersedia di tabel `memberships` dalam format `+62...`.
- [ ] Membership berstatus `ACTIVE` dan `expired_at` belum lewat.
- [ ] `.env` terisi tanpa placeholder.
- [ ] `SUPABASE_URL` tidak memiliki `/rest/v1/`.
- [ ] Bot menjadi admin private group.
- [ ] Bot memiliki permission invite dan ban.
- [ ] Terminal Next.js hidup.
- [ ] Terminal Cloudflare Tunnel hidup.
- [ ] Webhook memakai URL tunnel terbaru.
- [ ] Terminal cron lokal hidup.
- [ ] `/start` meminta kontak.
- [ ] Share Contact mengisi `telegram_user_id`.
- [ ] Invite dapat dipakai satu kali.
- [ ] Cron mengubah status menjadi `EXPIRED` dan mengeluarkan user.
- [ ] Renewal mengaktifkan membership kembali.
