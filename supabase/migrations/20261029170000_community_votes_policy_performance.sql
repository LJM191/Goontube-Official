-- Cover the votes user foreign key and avoid per-row auth.uid() evaluation.
create index if not exists community_votes_user_id_idx
  on public.community_votes (user_id);

drop policy if exists "users create own community votes" on public.community_votes;
create policy "users create own community votes" on public.community_votes
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "users update own community votes" on public.community_votes;
create policy "users update own community votes" on public.community_votes
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "users delete own community votes" on public.community_votes;
create policy "users delete own community votes" on public.community_votes
  for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "comments_owner_delete" on public.comments;
create policy "comments_owner_delete" on public.comments
  for delete to authenticated
  using (
    (user_id = (select auth.uid()))
    or exists (
      select 1
      from public.videos v
      join public.channels ch on ch.id = v.channel_id
      where v.id = comments.video_id
        and ch.user_id = (select auth.uid())
    )
  );
