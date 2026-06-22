do $$
begin
  create type photo_report_reason as enum (
    'sexual',
    'abuse',
    'gore',
    'spam',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type photo_report_status as enum (
    'open',
    'reviewed',
    'dismissed',
    'actioned'
  );
exception
  when duplicate_object then null;
end $$;

alter table public.photos
  add column if not exists uploader_ip_hash text;

alter table public.photos
  add column if not exists uploader_user_agent text;

create table if not exists public.photo_reports (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.photos(id) on delete cascade,
  match_id uuid references public.photo_matches(id) on delete set null,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_owner_id uuid not null references auth.users(id) on delete cascade,
  reason photo_report_reason not null,
  details text,
  reporter_ip_hash text,
  status photo_report_status not null default 'open',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint photo_reports_details_length check (char_length(coalesce(details, '')) <= 500),
  constraint photo_reports_no_self_report check (reporter_id <> reported_owner_id),
  constraint photo_reports_one_per_photo unique (photo_id, reporter_id)
);

create table if not exists public.banned_ip_hashes (
  ip_hash text primary key,
  reason text not null,
  source_report_id uuid references public.photo_reports(id) on delete set null,
  permanent boolean not null default true,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists photos_uploader_ip_hash_idx
  on public.photos(uploader_ip_hash)
  where uploader_ip_hash is not null;

create index if not exists photo_reports_photo_created_idx
  on public.photo_reports(photo_id, created_at desc);

create index if not exists photo_reports_reporter_created_idx
  on public.photo_reports(reporter_id, created_at desc);

alter table public.photo_reports enable row level security;
alter table public.banned_ip_hashes enable row level security;

drop policy if exists "Users can view own reports" on public.photo_reports;
create policy "Users can view own reports"
  on public.photo_reports for select
  using (auth.uid() = reporter_id);

drop policy if exists "Users can create own reports" on public.photo_reports;
create policy "Users can create own reports"
  on public.photo_reports for insert
  with check (auth.uid() = reporter_id);
