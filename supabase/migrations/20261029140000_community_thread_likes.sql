create table if not exists public.community_thread_likes (
  thread_id uuid not null references public.community_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (thread_id, user_id)
);

alter table public.community_thread_likes enable row level security;

drop policy if exists "thread_likes_public_read" on public.community_thread_likes;
create policy "thread_likes_public_read"
  on public.community_thread_likes for select to anon, authenticated
  using (true);

drop policy if exists "thread_likes_owner_insert" on public.community_thread_likes;
create policy "thread_likes_owner_insert"
  on public.community_thread_likes for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "thread_likes_owner_delete" on public.community_thread_likes;
create policy "thread_likes_owner_delete"
  on public.community_thread_likes for delete to authenticated
  using (user_id = (select auth.uid()));

grant select on public.community_thread_likes to anon, authenticated;
grant insert, delete on public.community_thread_likes to authenticated;
