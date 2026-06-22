create extension if not exists pgcrypto;

do $$
begin
  create type photo_status as enum (
    'awaiting_upload',
    'processing',
    'ready',
    'matched',
    'reported',
    'rejected',
    'expired'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type photo_location_source as enum (
    'ip',
    'browser_gps',
    'photo_exif',
    'manual'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type spend_status as enum (
    'quote',
    'pending',
    'confirmed',
    'failed'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  wallet_address text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  storage_bucket text not null default 'photos',
  original_path text not null,
  processed_path text,
  thumbnail_path text,
  status photo_status not null default 'awaiting_upload',
  content_type text not null,
  byte_size integer not null check (byte_size > 0),
  city_name text,
  region_name text,
  country_code char(2),
  country_name text,
  location_source photo_location_source not null default 'ip',
  display_lat numeric(9, 6),
  display_lng numeric(9, 6),
  accuracy_m integer,
  report_count integer not null default 0,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  expires_at timestamptz not null default now() + interval '90 days'
);

create table if not exists public.photo_matches (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.photos(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  delivered_at timestamptz not null default now(),
  opened_at timestamptz,
  reported_at timestamptz,
  receiver_deleted_at timestamptz,
  constraint no_self_match check (sender_id <> receiver_id)
);

create table if not exists public.where_spends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  utility_key text not null,
  amount integer not null check (amount > 0),
  burn_amount integer not null check (burn_amount >= 0),
  treasury_amount integer not null check (treasury_amount >= 0),
  rewards_amount integer not null check (rewards_amount >= 0),
  tx_signature text unique,
  status spend_status not null default 'quote',
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  utility_target_match_id uuid references public.photo_matches(id) on delete set null,
  applied_at timestamptz
);

create index if not exists photos_owner_created_idx
  on public.photos(owner_id, created_at desc);

create index if not exists photos_ready_country_city_idx
  on public.photos(status, country_code, city_name)
  where status = 'ready';

create index if not exists photo_matches_receiver_idx
  on public.photo_matches(receiver_id, delivered_at desc)
  where receiver_deleted_at is null;

create index if not exists where_spends_user_created_idx
  on public.where_spends(user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.photos enable row level security;
alter table public.photo_matches enable row level security;
alter table public.where_spends enable row level security;

drop policy if exists "Profiles are visible to owner" on public.profiles;
create policy "Profiles are visible to owner"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Owners can view own photos" on public.photos;
create policy "Owners can view own photos"
  on public.photos for select
  using (auth.uid() = owner_id);

drop policy if exists "Receivers can view matched photos" on public.photos;
create policy "Receivers can view matched photos"
  on public.photos for select
  using (
    exists (
      select 1
      from public.photo_matches matches
      where matches.photo_id = photos.id
        and matches.receiver_id = auth.uid()
        and matches.receiver_deleted_at is null
    )
  );

drop policy if exists "Users can create own photo rows" on public.photos;
create policy "Users can create own photo rows"
  on public.photos for insert
  with check (auth.uid() = owner_id);

drop policy if exists "Users can update own pending photos" on public.photos;
create policy "Users can update own pending photos"
  on public.photos for update
  using (auth.uid() = owner_id and status in ('awaiting_upload', 'processing'))
  with check (auth.uid() = owner_id);

drop policy if exists "Users can view received matches" on public.photo_matches;
create policy "Users can view received matches"
  on public.photo_matches for select
  using (
    (auth.uid() = receiver_id and receiver_deleted_at is null)
    or auth.uid() = sender_id
  );

drop policy if exists "Users can view own spends" on public.where_spends;
create policy "Users can view own spends"
  on public.where_spends for select
  using (auth.uid() = user_id);
