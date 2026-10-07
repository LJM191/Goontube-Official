drop function if exists public.increment_view(uuid);
create function public.increment_view(_video_id uuid) returns bigint
language plpgsql security definer set search_path = public as $$
declare n bigint;
begin
  update public.videos set view_count = view_count + 1 where id = _video_id and visibility <> 'private' returning view_count into n;
  if auth.uid() is not null then
    insert into public.watch_history (user_id, video_id) values (auth.uid(), _video_id)
    on conflict (user_id, video_id) do update set watched_at = now();
  end if;
  return n;
end $$;
grant execute on function public.increment_view(uuid) to anon, authenticated;

create unique index if not exists profiles_username_key on public.profiles (lower(username));
create or replace function public.tg_sync_handle() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.username is distinct from old.username then
    if new.username !~ '^[A-Za-z0-9_]{3,30}$' then raise exception 'Arobase invalide'; end if;
    update public.channels set handle = new.username where owner_id = new.id;
  end if;
  return new;
end $$;
revoke execute on function public.tg_sync_handle() from public, anon, authenticated;
create trigger sync_handle after update of username on public.profiles for each row execute function public.tg_sync_handle();

create or replace function public.update_updated_at_column() returns trigger language plpgsql set search_path = public as $$ begin new.updated_at = now(); return new; end $$;

create table public.playlists (id uuid primary key default gen_random_uuid(), user_id uuid not null, name text not null check (char_length(name) between 1 and 100), description text, is_public boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
grant select, insert, update, delete on public.playlists to authenticated; grant all on public.playlists to service_role;
alter table public.playlists enable row level security;
create policy "own playlists" on public.playlists for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger playlists_updated before update on public.playlists for each row execute function public.update_updated_at_column();

create table public.playlist_items (playlist_id uuid not null references public.playlists(id) on delete cascade, video_id uuid not null references public.videos(id) on delete cascade, position integer not null default 0, added_at timestamptz not null default now(), primary key (playlist_id, video_id));
grant select, insert, update, delete on public.playlist_items to authenticated; grant all on public.playlist_items to service_role;
alter table public.playlist_items enable row level security;
create policy "own playlist items" on public.playlist_items for all to authenticated
  using (exists (select 1 from public.playlists p where p.id = playlist_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.playlists p where p.id = playlist_id and p.user_id = auth.uid()));

create table public.community_forums (id uuid primary key default gen_random_uuid(), owner_id uuid not null, name text not null check (char_length(name) between 1 and 100), slug text not null unique, description text, is_public boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
grant select on public.community_forums to anon; grant select, insert, update, delete on public.community_forums to authenticated; grant all on public.community_forums to service_role;
alter table public.community_forums enable row level security;
create policy "forums readable" on public.community_forums for select using (is_public or auth.uid() = owner_id);
create policy "own forum insert" on public.community_forums for insert to authenticated with check (auth.uid() = owner_id);
create policy "own forum update" on public.community_forums for update to authenticated using (auth.uid() = owner_id);
create policy "own forum delete" on public.community_forums for delete to authenticated using (auth.uid() = owner_id);
create trigger forums_updated before update on public.community_forums for each row execute function public.update_updated_at_column();

create table public.community_threads (id uuid primary key default gen_random_uuid(), forum_id uuid not null references public.community_forums(id) on delete cascade, author_id uuid not null, title text not null check (char_length(title) between 1 and 200), body text not null check (char_length(body) between 1 and 10000), is_pinned boolean not null default false, is_locked boolean not null default false, view_count integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
grant select on public.community_threads to anon; grant select, insert, update, delete on public.community_threads to authenticated; grant all on public.community_threads to service_role;
alter table public.community_threads enable row level security;
create policy "threads readable" on public.community_threads for select using (true);
create policy "own thread insert" on public.community_threads for insert to authenticated with check (auth.uid() = author_id and is_pinned = false and is_locked = false);
create policy "own thread delete" on public.community_threads for delete to authenticated using (auth.uid() = author_id);
create trigger threads_updated before update on public.community_threads for each row execute function public.update_updated_at_column();

create table public.community_replies (id uuid primary key default gen_random_uuid(), thread_id uuid not null references public.community_threads(id) on delete cascade, author_id uuid not null, body text not null check (char_length(body) between 1 and 5000), created_at timestamptz not null default now());
grant select on public.community_replies to anon; grant select, insert, delete on public.community_replies to authenticated; grant all on public.community_replies to service_role;
alter table public.community_replies enable row level security;
create policy "replies readable" on public.community_replies for select using (true);
create policy "own reply insert" on public.community_replies for insert to authenticated with check (auth.uid() = author_id and not exists (select 1 from public.community_threads t where t.id = thread_id and t.is_locked));
create policy "own reply delete" on public.community_replies for delete to authenticated using (auth.uid() = author_id);

create table public.channel_media (id uuid primary key default gen_random_uuid(), channel_id uuid not null references public.channels(id) on delete cascade, owner_id uuid not null, media_type text not null default 'photo', title text not null check (char_length(title) between 1 and 150), description text, media_path text not null, created_at timestamptz not null default now());
grant select on public.channel_media to anon; grant select, insert, delete on public.channel_media to authenticated; grant all on public.channel_media to service_role;
alter table public.channel_media enable row level security;
create policy "media readable" on public.channel_media for select using (true);
create policy "own media insert" on public.channel_media for insert to authenticated with check (auth.uid() = owner_id and exists (select 1 from public.channels c where c.id = channel_id and c.owner_id = auth.uid()));
create policy "own media delete" on public.channel_media for delete to authenticated using (auth.uid() = owner_id);

create policy "photos read" on storage.objects for select using (bucket_id = 'photos');
create policy "photos upload own" on storage.objects for insert to authenticated with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos delete own" on storage.objects for delete to authenticated using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);