-- Harden community visibility, keep profile email addresses private, and cover
-- foreign keys identified by the Supabase performance advisor.
begin;

drop policy if exists "threads_public_select" on public.community_threads;
create policy "threads_public_select" on public.community_threads
  for select to anon, authenticated
  using (
    exists (
      select 1
      from public.community_forums f
      where f.id = community_threads.forum_id
        and (f.is_public or f.owner_id = (select auth.uid()))
    )
  );

drop policy if exists "replies_public_select" on public.community_replies;
create policy "replies_public_select" on public.community_replies
  for select to anon, authenticated
  using (
    exists (
      select 1
      from public.community_threads t
      join public.community_forums f on f.id = t.forum_id
      where t.id = community_replies.thread_id
        and (f.is_public or f.owner_id = (select auth.uid()))
    )
  );

drop policy if exists "thread_likes_public_read" on public.community_thread_likes;
create policy "thread_likes_public_read" on public.community_thread_likes
  for select to anon, authenticated
  using (
    exists (
      select 1
      from public.community_threads t
      join public.community_forums f on f.id = t.forum_id
      where t.id = community_thread_likes.thread_id
        and (f.is_public or f.owner_id = (select auth.uid()))
    )
  );

drop policy if exists "community votes are readable" on public.community_votes;
create policy "community votes are readable" on public.community_votes
  for select to anon, authenticated
  using (
    exists (
      select 1
      from public.community_threads t
      join public.community_forums f on f.id = t.forum_id
      where t.id = community_votes.thread_id
        and (f.is_public or f.owner_id = (select auth.uid()))
    )
  );

-- Prevent ordinary users from pinning or locking their own threads via direct API calls.
drop policy if exists "threads_owner_insert" on public.community_threads;
create policy "threads_owner_insert" on public.community_threads
  for insert to authenticated
  with check (user_id = (select auth.uid()) and is_pinned = false and is_locked = false);

drop policy if exists "threads_owner_update" on public.community_threads;
create policy "threads_owner_update" on public.community_threads
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and is_pinned = false and is_locked = false);

drop policy if exists "replies_owner_insert" on public.community_replies;
create policy "replies_owner_insert" on public.community_replies
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and not exists (
      select 1 from public.community_threads t
      where t.id = community_replies.thread_id and t.is_locked
    )
  );

-- The public profile UI never needs the email column. Remove table-wide SELECT
-- and grant only the fields used by public profile, comments, and Studio screens.
revoke select on public.profiles from public, anon, authenticated;
grant select (user_id, pseudo, avatar, school_level, profile_photo, bio, created_at, updated_at)
  on public.profiles to anon, authenticated;

create index if not exists comments_moderated_by_idx
  on public.comments (moderated_by);
create index if not exists community_forums_owner_id_idx
  on public.community_forums (owner_id);
create index if not exists community_thread_likes_user_id_idx
  on public.community_thread_likes (user_id);

commit;
