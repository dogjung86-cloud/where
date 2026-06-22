alter table public.photo_matches
  add column if not exists receiver_deleted_at timestamptz;

drop index if exists photo_matches_receiver_idx;
create index if not exists photo_matches_receiver_idx
  on public.photo_matches(receiver_id, delivered_at desc)
  where receiver_deleted_at is null;

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

drop policy if exists "Users can view received matches" on public.photo_matches;
create policy "Users can view received matches"
  on public.photo_matches for select
  using (
    (auth.uid() = receiver_id and receiver_deleted_at is null)
    or auth.uid() = sender_id
  );
