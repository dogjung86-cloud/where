alter table public.where_spends
  add column if not exists utility_target_match_id uuid references public.photo_matches(id) on delete set null,
  add column if not exists applied_at timestamptz;
