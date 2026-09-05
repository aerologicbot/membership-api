-- Aerologic Access: consolidated Supabase schema.
-- Safe for a new project and safe to rerun after a successful prior version.

create extension if not exists pgcrypto;

do $$
begin
  create type public.membership_status as enum ('ACTIVE', 'EXPIRED');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  telegram_phone text not null unique,
  telegram_user_id bigint unique,
  package text not null default 'DEMO_1_HOUR',
  status public.membership_status not null default 'ACTIVE',
  started_at timestamptz not null default now(),
  expired_at timestamptz not null,
  kick_processed_at timestamptz,
  kick_last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Upgrade compatibility for databases created from an earlier version.
alter table public.memberships
  add column if not exists kick_processed_at timestamptz,
  add column if not exists kick_last_error text;

-- Recreate final constraints, including repair of the old phone regex.
alter table public.memberships
  drop constraint if exists memberships_telegram_phone_check,
  drop constraint if exists membership_dates_valid;

alter table public.memberships
  add constraint memberships_telegram_phone_check
    check (telegram_phone ~ '^[+][1-9][0-9]{7,14}$'),
  add constraint membership_dates_valid
    check (expired_at > started_at);

create table if not exists public.invite_logs (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.memberships(id) on delete cascade,
  telegram_user_id bigint not null,
  invite_link text not null unique,
  created_at timestamptz not null default now(),
  used_at timestamptz
);

create index if not exists memberships_expiration_idx
  on public.memberships(expired_at)
  where status = 'ACTIVE';

create index if not exists memberships_pending_kick_idx
  on public.memberships(expired_at)
  where kick_processed_at is null;

create index if not exists invite_logs_membership_idx
  on public.invite_logs(membership_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists memberships_updated_at on public.memberships;
create trigger memberships_updated_at
before update on public.memberships
for each row execute function public.set_updated_at();

-- Marks new expirations and returns earlier kick failures for retry.
create or replace function public.claim_expired_memberships()
returns setof public.memberships
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.memberships m
  set status = 'EXPIRED', kick_last_error = null
  where m.id in (
    select id
    from public.memberships
    where expired_at <= now()
      and kick_processed_at is null
      and status in ('ACTIVE', 'EXPIRED')
    for update skip locked
  )
  returning m.*;
end;
$$;

create or replace function public.renew_membership(
  p_membership_id uuid,
  p_hours double precision default 1
)
returns public.memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.memberships;
begin
  if p_hours <= 0 or p_hours > 8760 then
    raise exception 'Invalid renewal duration';
  end if;

  update public.memberships
  set status = 'ACTIVE',
      kick_processed_at = null,
      kick_last_error = null,
      started_at = case when expired_at <= now() then now() else started_at end,
      expired_at = greatest(expired_at, now()) + make_interval(secs => p_hours * 3600)
  where id = p_membership_id
  returning * into result;

  return result;
end;
$$;

alter table public.memberships enable row level security;
alter table public.invite_logs enable row level security;

-- No public policies: only the server-side service role may access these tables.
revoke all on function public.claim_expired_memberships() from public, anon, authenticated;
revoke all on function public.renew_membership(uuid, double precision) from public, anon, authenticated;
grant execute on function public.claim_expired_memberships() to service_role;
grant execute on function public.renew_membership(uuid, double precision) to service_role;

-- Optional demo member:
-- insert into public.memberships (telegram_phone, expired_at)
-- values ('+628123456789', now() + interval '1 hour')
-- on conflict (telegram_phone) do nothing;
