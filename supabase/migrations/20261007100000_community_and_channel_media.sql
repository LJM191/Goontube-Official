-- Goontube community forums and photo/GIF posts
create table if not exists public.community_forums (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 60),
  slug text not null,
  description text,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists community_forums_slug_unique on public.community_forums (lower(slug));

create table if not exists public.community_threads (
  id uuid primary key default gen_random_uuid(),
  forum_id uuid not null references public.community_forums(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 160),
  body text not null check (char_length(body) between 1 and 10000),
  is_pinned boolean not null default false,
  is_locked boolean not null default false,
  view_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_replies (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.community_threads(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists community_threads_forum_created_idx on public.community_threads(forum_id, created_at desc);
create index if not exists community_replies_thread_created_idx on public.community_replies(thread_id, created_at);
create index if not exists community_forums_owner_idx on public.community_forums(owner_id);

alter table public.community_forums enable row level security;
alter table public.community_threads enable row level security;
alter table public.community_replies enable row level security;

drop policy if exists "public forums readable" on public.community_forums;
create policy "public forums readable" on public.community_forums for select using (is_public or owner_id = auth.uid());
drop policy if exists "users create forums" on public.community_forums;
create policy "users create forums" on public.community_forums for insert with check (owner_id = auth.uid());
drop policy if exists "owners update forums" on public.community_forums;
create policy "owners update forums" on public.community_forums for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "owners delete forums" on public.community_forums;
create policy "owners delete forums" on public.community_forums for delete using (owner_id = auth.uid());

drop policy if exists "public threads readable" on public.community_threads;
create policy "public threads readable" on public.community_threads for select using (
  exists (select 1 from public.community_forums f where f.id = forum_id and (f.is_public or f.owner_id = auth.uid()))
);
drop policy if exists "users create threads" on public.community_threads;
create policy "users create threads" on public.community_threads for insert with check (author_id = auth.uid());
drop policy if exists "authors update threads" on public.community_threads;
create policy "authors update threads" on public.community_threads for update using (author_id = auth.uid()) with check (author_id = auth.uid());

drop policy if exists "public replies readable" on public.community_replies;
create policy "public replies readable" on public.community_replies for select using (
  exists (
    select 1 from public.community_threads t
    join public.community_forums f on f.id = t.forum_id
    where t.id = thread_id and (f.is_public or f.owner_id = auth.uid())
  )
);
drop policy if exists "users create replies" on public.community_replies;
create policy "users create replies" on public.community_replies for insert with check (author_id = auth.uid());
drop policy if exists "authors update replies" on public.community_replies;
create policy "authors update replies" on public.community_replies for update using (author_id = auth.uid()) with check (author_id = auth.uid());

create table if not exists public.channel_media (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  media_type text not null check (media_type in ('photo','gif')),
  title text not null default '' check (char_length(title) <= 120),
  description text,
  media_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists channel_media_channel_created_idx on public.channel_media(channel_id, created_at desc);
alter table public.channel_media enable row level security;

drop policy if exists "public channel media readable" on public.channel_media;
create policy "public channel media readable" on public.channel_media for select using (true);
drop policy if exists "owners create channel media" on public.channel_media;
create policy "owners create channel media" on public.channel_media for insert with check (
  owner_id = auth.uid() and exists (select 1 from public.channels c where c.id = channel_id and c.owner_id = auth.uid())
);
drop policy if exists "owners update channel media" on public.channel_media;
create policy "owners update channel media" on public.channel_media for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "owners delete channel media" on public.channel_media;
create policy "owners delete channel media" on public.channel_media for delete using (owner_id = auth.uid());

insert into storage.buckets (id, name, public) values ('photos', 'photos', false)
on conflict (id) do nothing;

drop policy if exists "users upload photos" on storage.objects;
create policy "users upload photos" on storage.objects for insert to authenticated
with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users read photos" on storage.objects;
create policy "users read photos" on storage.objects for select to authenticated
using (bucket_id = 'photos');

drop policy if exists "users delete own photos" on storage.objects;
create policy "users delete own photos" on storage.objects for delete to authenticated
using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
