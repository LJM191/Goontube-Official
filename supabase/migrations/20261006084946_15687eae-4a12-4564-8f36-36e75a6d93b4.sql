create type public.app_role as enum ('admin','moderator','user');
create type public.video_visibility as enum ('public','unlisted','private');

create table public.profiles (
  id uuid primary key,
  username text unique not null,
  display_name text not null,
  avatar_path text,
  bio text,
  created_at timestamptz not null default now()
);
grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles readable" on public.profiles for select using (true);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create table public.channels (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique,
  handle text unique not null,
  name text not null,
  description text,
  avatar_path text,
  banner_path text,
  verified boolean not null default false,
  subscriber_count integer not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.channels to anon, authenticated;
grant insert, update on public.channels to authenticated;
grant all on public.channels to service_role;
alter table public.channels enable row level security;
create policy "channels readable" on public.channels for select using (true);
create policy "own channel insert" on public.channels for insert to authenticated with check (auth.uid() = owner_id);
create policy "own channel update" on public.channels for update to authenticated using (auth.uid() = owner_id);

create table public.categories (
  id serial primary key,
  slug text unique not null,
  name text not null
);
grant select on public.categories to anon, authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "categories readable" on public.categories for select using (true);
insert into public.categories (slug, name) values
 ('musique','Musique'),('gaming','Gaming'),('documentaires','Documentaires'),('design','Design'),
 ('sciences','Sciences'),('sport','Sport'),('education','Éducation'),('divertissement','Divertissement'),('tech','Tech');

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  owner_id uuid not null,
  title text not null,
  description text,
  video_path text not null,
  thumbnail_path text,
  duration_seconds integer not null default 0,
  category_id integer references public.categories(id),
  tags text[] not null default '{}',
  visibility video_visibility not null default 'public',
  is_live boolean not null default false,
  view_count bigint not null default 0,
  like_count integer not null default 0,
  dislike_count integer not null default 0,
  comment_count integer not null default 0,
  created_at timestamptz not null default now()
);
create index videos_created_idx on public.videos (created_at desc);
create index videos_channel_idx on public.videos (channel_id);
grant select on public.videos to anon, authenticated;
grant insert, update, delete on public.videos to authenticated;
grant all on public.videos to service_role;
alter table public.videos enable row level security;
create policy "videos readable" on public.videos for select using (visibility <> 'private' or auth.uid() = owner_id);
create policy "own video insert" on public.videos for insert to authenticated
  with check (auth.uid() = owner_id and exists (select 1 from public.channels c where c.id = channel_id and c.owner_id = auth.uid()));
create policy "own video update" on public.videos for update to authenticated using (auth.uid() = owner_id);
create policy "own video delete" on public.videos for delete to authenticated using (auth.uid() = owner_id or public.has_role(auth.uid(),'admin'));

create table public.video_reactions (
  video_id uuid not null references public.videos(id) on delete cascade,
  user_id uuid not null,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (video_id, user_id)
);
grant select, insert, update, delete on public.video_reactions to authenticated;
grant all on public.video_reactions to service_role;
alter table public.video_reactions enable row level security;
create policy "own reactions" on public.video_reactions for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);
create index comments_video_idx on public.comments (video_id, created_at desc);
grant select on public.comments to anon, authenticated;
grant insert, update, delete on public.comments to authenticated;
grant all on public.comments to service_role;
alter table public.comments enable row level security;
create policy "comments readable" on public.comments for select using (true);
create policy "own comment insert" on public.comments for insert to authenticated with check (auth.uid() = user_id);
create policy "own comment update" on public.comments for update to authenticated using (auth.uid() = user_id);
create policy "own comment delete" on public.comments for delete to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'moderator') or public.has_role(auth.uid(),'admin'));

create table public.subscriptions (
  subscriber_id uuid not null,
  channel_id uuid not null references public.channels(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (subscriber_id, channel_id)
);
grant select, insert, delete on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;
alter table public.subscriptions enable row level security;
create policy "own subs select" on public.subscriptions for select to authenticated using (auth.uid() = subscriber_id);
create policy "own subs insert" on public.subscriptions for insert to authenticated with check (auth.uid() = subscriber_id);
create policy "own subs delete" on public.subscriptions for delete to authenticated using (auth.uid() = subscriber_id);

create table public.watch_history (
  user_id uuid not null,
  video_id uuid not null references public.videos(id) on delete cascade,
  watched_at timestamptz not null default now(),
  primary key (user_id, video_id)
);
grant select, insert, update, delete on public.watch_history to authenticated;
grant all on public.watch_history to service_role;
alter table public.watch_history enable row level security;
create policy "own history" on public.watch_history for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.tg_reaction_counts() returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.videos v set
    like_count = (select count(*) from public.video_reactions r where r.video_id = v.id and r.value = 1),
    dislike_count = (select count(*) from public.video_reactions r where r.video_id = v.id and r.value = -1)
  where v.id = coalesce(new.video_id, old.video_id);
  return null;
end $$;
create trigger reaction_counts after insert or update or delete on public.video_reactions for each row execute function public.tg_reaction_counts();

create or replace function public.tg_comment_counts() returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.videos v set comment_count = (select count(*) from public.comments c where c.video_id = v.id)
  where v.id = coalesce(new.video_id, old.video_id);
  return null;
end $$;
create trigger comment_counts after insert or delete on public.comments for each row execute function public.tg_comment_counts();

create or replace function public.tg_sub_counts() returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.channels c set subscriber_count = (select count(*) from public.subscriptions s where s.channel_id = c.id)
  where c.id = coalesce(new.channel_id, old.channel_id);
  return null;
end $$;
create trigger sub_counts after insert or delete on public.subscriptions for each row execute function public.tg_sub_counts();

create or replace function public.increment_view(_video_id uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  update public.videos set view_count = view_count + 1 where id = _video_id and visibility <> 'private';
  if auth.uid() is not null then
    insert into public.watch_history (user_id, video_id) values (auth.uid(), _video_id)
    on conflict (user_id, video_id) do update set watched_at = now();
  end if;
end $$;
grant execute on function public.increment_view(uuid) to anon, authenticated;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare base text; uname text; dname text;
begin
  base := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1), 'user'), '[^a-zA-Z0-9_]', '', 'g'));
  if base = '' then base := 'user'; end if;
  uname := base || '_' || substr(replace(new.id::text,'-',''),1,6);
  dname := coalesce(new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', base);
  insert into public.profiles (id, username, display_name) values (new.id, uname, dname);
  insert into public.channels (owner_id, handle, name) values (new.id, uname, dname);
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create policy "media read" on storage.objects for select using (bucket_id in ('videos','thumbnails','avatars'));
create policy "media own upload" on storage.objects for insert to authenticated
  with check (bucket_id in ('videos','thumbnails','avatars') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media own update" on storage.objects for update to authenticated
  using (bucket_id in ('videos','thumbnails','avatars') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media own delete" on storage.objects for delete to authenticated
  using (bucket_id in ('videos','thumbnails','avatars') and (storage.foldername(name))[1] = auth.uid()::text);