create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  description text,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.playlist_items (
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  position integer not null default 0,
  added_at timestamptz not null default now(),
  primary key (playlist_id, video_id)
);

create table if not exists public.gems (
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, video_id)
);

alter table public.playlists enable row level security;
alter table public.playlist_items enable row level security;
alter table public.gems enable row level security;

drop policy if exists "Users can view own playlists" on public.playlists;
create policy "Users can view own playlists" on public.playlists for select using (auth.uid() = user_id or is_public);

drop policy if exists "Users can create own playlists" on public.playlists;
create policy "Users can create own playlists" on public.playlists for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own playlists" on public.playlists;
create policy "Users can update own playlists" on public.playlists for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own playlists" on public.playlists;
create policy "Users can delete own playlists" on public.playlists for delete using (auth.uid() = user_id);

drop policy if exists "Users can view playlist items" on public.playlist_items;
create policy "Users can view playlist items" on public.playlist_items for select using (
  exists (select 1 from public.playlists p where p.id = playlist_id and (p.user_id = auth.uid() or p.is_public))
);

drop policy if exists "Users can add to own playlists" on public.playlist_items;
create policy "Users can add to own playlists" on public.playlist_items for insert with check (
  exists (select 1 from public.playlists p where p.id = playlist_id and p.user_id = auth.uid())
);

drop policy if exists "Users can update own playlist items" on public.playlist_items;
create policy "Users can update own playlist items" on public.playlist_items for update using (
  exists (select 1 from public.playlists p where p.id = playlist_id and p.user_id = auth.uid())
);

drop policy if exists "Users can delete from own playlists" on public.playlist_items;
create policy "Users can delete from own playlists" on public.playlist_items for delete using (
  exists (select 1 from public.playlists p where p.id = playlist_id and p.user_id = auth.uid())
);

drop policy if exists "Users can view own gems" on public.gems;
create policy "Users can view own gems" on public.gems for select using (auth.uid() = user_id);

drop policy if exists "Users can create own gems" on public.gems;
create policy "Users can create own gems" on public.gems for insert with check (auth.uid() = user_id);

drop policy if exists "Users can delete own gems" on public.gems;
create policy "Users can delete own gems" on public.gems for delete using (auth.uid() = user_id);

create index if not exists playlists_user_id_idx on public.playlists(user_id);
create index if not exists playlist_items_video_id_idx on public.playlist_items(video_id);
create index if not exists gems_video_id_idx on public.gems(video_id);
