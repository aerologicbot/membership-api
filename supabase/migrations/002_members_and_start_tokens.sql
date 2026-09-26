-- Aerologic Access 002: pendaftaran member + deep-link token.
-- Jalankan setelah 001_initial_schema.sql. Aman dijalankan ulang.
--
-- Perubahan alur dibanding 001:
--   001  user share kontak di Telegram -> bot cocokkan nomor -> invite
--   002  user daftar di web -> dapat link t.me/<bot>?start=<token> -> invite
--
-- Alasan pindah dari nomor ke token: nomor WhatsApp yang diisi di form belum
-- tentu sama dengan nomor akun Telegram, dan user tidak punya cara
-- memperbaikinya sendiri kalau beda. Token tidak bisa salah cocok.

-- Satu baris per orang yang mendaftar, dibuat sebelum pembayaran.
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(btrim(full_name)) between 2 and 120),
  email text not null unique check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  -- Format internasional, hasil normalisasi normalizeIndonesianPhone().
  whatsapp text not null check (whatsapp ~ '^[+][1-9][0-9]{7,14}$'),
  -- Tanpa "@". Hanya untuk kontak manual admin; pencocokan bot pakai token.
  telegram_username text not null check (telegram_username ~ '^[A-Za-z][A-Za-z0-9_]{4,31}$'),
  gender text not null,
  experience_level text not null,
  capital_range text not null,
  referral_source text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Nilai yang sah didefinisikan di lib/catalog.ts dan divalidasi Zod sebelum
-- insert. Constraint di sini hanya jaring pengaman terakhir, sengaja longgar
-- supaya menambah opsi tidak perlu migration baru.
alter table public.members
  drop constraint if exists members_enum_values_check;
alter table public.members
  add constraint members_enum_values_check check (
    length(btrim(gender)) > 0
    and length(btrim(experience_level)) > 0
    and length(btrim(capital_range)) > 0
    and length(btrim(referral_source)) > 0
  );

drop trigger if exists members_updated_at on public.members;
create trigger members_updated_at
before update on public.members
for each row execute function public.set_updated_at();

-- Membership sekarang milik seorang member, dan dibuat hanya setelah
-- pembayaran berhasil. Satu member satu baris; perpanjangan memakai
-- renew_membership() yang menggeser expired_at, bukan membuat baris baru.
alter table public.memberships
  add column if not exists member_id uuid references public.members(id) on delete restrict,
  add column if not exists start_token text,
  add column if not exists start_token_used_at timestamptz;

create unique index if not exists memberships_member_idx
  on public.memberships(member_id);

create unique index if not exists memberships_start_token_idx
  on public.memberships(start_token);

-- telegram_phone tidak lagi dipakai untuk mencocokkan user (token yang
-- melakukannya), jadi tidak wajib diisi. Kolomnya dipertahankan supaya baris
-- lama dari 001 tetap valid.
alter table public.memberships
  alter column telegram_phone drop not null;

alter table public.memberships
  alter column package set default '1_BULAN';

alter table public.members enable row level security;

-- Tidak ada policy: hanya service role (server) yang boleh menyentuh tabel
-- ini. Baris members berisi data pribadi — nama, email, nomor WhatsApp —
-- jadi anon key tidak boleh bisa membacanya sama sekali.
