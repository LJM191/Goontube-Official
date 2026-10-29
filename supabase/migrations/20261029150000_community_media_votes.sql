-- Extend community posts with native image/GIF attachments and Reddit-style voting.
alter table public.community_threads
  add column if not exists media_path text,
  add column if not exists media_type text,
  add column if not exists is_pinned boolean not null default false;

alter table public.community_threads
  drop constraint if exists community_threads_media_type_check;

alter table public.community_threads
  add constraint community_threads_media_type_check
  check (media_type is null or media_type in ('photo', 'gif'));

create table if not exists public.community_votes (
  thread_id uuid not null references public.community_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (thread_id, user_id)
);

create index if not exists community_votes_thread_idx on public.community_votes(thread_id);
alter table public.community_votes enable row level security;

drop policy if exists "community votes are readable" on public.community_votes;
create policy "community votes are readable" on public.community_votes
  for select using (true);

drop policy if exists "users create own community votes" on public.community_votes;
create policy "users create own community votes" on public.community_votes
  for insert with check (user_id = auth.uid());

drop policy if exists "users update own community votes" on public.community_votes;
create policy "users update own community votes" on public.community_votes
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "users delete own community votes" on public.community_votes;
create policy "users delete own community votes" on public.community_votes
  for delete using (user_id = auth.uid());
