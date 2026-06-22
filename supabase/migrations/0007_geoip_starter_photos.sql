create table if not exists public.starter_photos (
  id uuid primary key default gen_random_uuid(),
  storage_bucket text not null default 'photos',
  processed_path text not null,
  thumbnail_path text,
  city_name text not null,
  region_name text,
  country_code char(2),
  country_name text not null,
  display_lat numeric(9, 6),
  display_lng numeric(9, 6),
  active boolean not null default true,
  delivered_count integer not null default 0,
  created_at timestamptz not null default now(),
  constraint starter_photos_city_country_present check (
    char_length(trim(city_name)) > 0
    and char_length(trim(country_name)) > 0
  )
);

alter table public.photo_matches
  add column if not exists starter_photo_id uuid references public.starter_photos(id) on delete set null;

alter table public.photo_matches
  alter column photo_id drop not null;

alter table public.photo_matches
  alter column sender_id drop not null;

alter table public.photo_matches
  drop constraint if exists photo_matches_one_source;

alter table public.photo_matches
  add constraint photo_matches_one_source check (
    (
      photo_id is not null
      and starter_photo_id is null
      and sender_id is not null
    )
    or (
      photo_id is null
      and starter_photo_id is not null
      and sender_id is null
    )
  );

alter table public.photo_reports
  add column if not exists starter_photo_id uuid references public.starter_photos(id) on delete cascade;

alter table public.photo_reports
  alter column photo_id drop not null;

alter table public.photo_reports
  alter column reported_owner_id drop not null;

alter table public.photo_reports
  drop constraint if exists photo_reports_one_per_photo;

alter table public.photo_reports
  drop constraint if exists photo_reports_one_source;

alter table public.photo_reports
  add constraint photo_reports_one_source check (
    (
      photo_id is not null
      and starter_photo_id is null
      and reported_owner_id is not null
    )
    or (
      photo_id is null
      and starter_photo_id is not null
      and reported_owner_id is null
    )
  );

alter table public.share_events
  add column if not exists starter_photo_id uuid references public.starter_photos(id) on delete set null;

drop index if exists public.photo_reports_one_per_seed_photo;
drop index if exists public.photo_reports_seed_photo_created_idx;
drop function if exists public.increment_seed_photo_delivery(uuid);

create unique index if not exists photo_reports_one_per_photo
  on public.photo_reports(photo_id, reporter_id)
  where photo_id is not null;

create unique index if not exists photo_reports_one_per_starter_photo
  on public.photo_reports(starter_photo_id, reporter_id)
  where starter_photo_id is not null;

create index if not exists starter_photos_active_city_idx
  on public.starter_photos(active, country_code, city_name)
  where active = true;

create unique index if not exists starter_photos_processed_path_key
  on public.starter_photos(processed_path);

create index if not exists photo_matches_starter_photo_idx
  on public.photo_matches(starter_photo_id)
  where starter_photo_id is not null;

create index if not exists photo_reports_starter_photo_created_idx
  on public.photo_reports(starter_photo_id, created_at desc)
  where starter_photo_id is not null;

create index if not exists share_events_starter_photo_idx
  on public.share_events(starter_photo_id)
  where starter_photo_id is not null;

alter table public.starter_photos enable row level security;

create or replace function public.increment_starter_photo_delivery(
  starter_photo_id_input uuid
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.starter_photos
  set delivered_count = delivered_count + 1
  where id = starter_photo_id_input;
$$;
