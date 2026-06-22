do $$
begin
  create type share_target as enum (
    'x',
    'instagram',
    'native',
    'copy_link',
    'save'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.share_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.photo_matches(id) on delete set null,
  photo_id uuid references public.photos(id) on delete set null,
  target share_target not null,
  share_url text,
  viewer_ip_hash text,
  viewer_user_agent text,
  created_at timestamptz not null default now(),
  constraint share_events_share_url_length check (char_length(coalesce(share_url, '')) <= 500)
);

create index if not exists share_events_created_idx
  on public.share_events(created_at desc);

create index if not exists share_events_target_idx
  on public.share_events(target, created_at desc);

create index if not exists share_events_photo_idx
  on public.share_events(photo_id)
  where photo_id is not null;

alter table public.share_events enable row level security;
