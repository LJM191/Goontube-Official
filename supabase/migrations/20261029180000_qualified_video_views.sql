-- Count a public video view only after meaningful playback.
-- The private session table cannot be accessed directly through the API.
create table if not exists public.video_view_sessions (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos(id) on delete cascade,
  started_at timestamptz not null default now(),
  counted_at timestamptz
);

create index if not exists video_view_sessions_video_id_idx
  on public.video_view_sessions (video_id);

alter table public.video_view_sessions enable row level security;
revoke all on public.video_view_sessions from public, anon, authenticated;

create or replace function public.start_video_view(video_uuid uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  session_uuid uuid;
begin
  if not exists (
    select 1 from public.videos v
    where v.id = video_uuid and v.visibility = 'public'
  ) then
    raise exception 'Video not found or not public';
  end if;

  insert into public.video_view_sessions (video_id)
  values (video_uuid)
  returning id into session_uuid;

  return session_uuid;
end;
$function$;

create or replace function public.complete_video_view(
  session_uuid uuid,
  watched_seconds numeric,
  watched_to_end boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  session_row public.video_view_sessions%rowtype;
  video_duration integer;
  required_elapsed numeric;
begin
  if watched_seconds is null or watched_seconds < 0 then
    return false;
  end if;

  select s.* into session_row
  from public.video_view_sessions s
  where s.id = session_uuid
    and s.counted_at is null
  for update;

  if not found then
    return false;
  end if;

  select v.duration_seconds into video_duration
  from public.videos v
  where v.id = session_row.video_id
    and v.visibility = 'public';

  if not found then
    return false;
  end if;

  if video_duration is not null and video_duration < 5 then
    if not watched_to_end or watched_seconds + 0.25 < video_duration then
      return false;
    end if;
    required_elapsed := video_duration;
  elsif video_duration is null and watched_to_end and watched_seconds < 5 then
    -- If duration metadata is missing, use the player's observed duration for short videos.
    required_elapsed := greatest(watched_seconds, 0.1);
  else
    if watched_seconds < 5 then
      return false;
    end if;
    required_elapsed := 5;
  end if;

  if extract(epoch from (pg_catalog.now() - session_row.started_at)) < required_elapsed then
    return false;
  end if;

  update public.video_view_sessions
  set counted_at = pg_catalog.now()
  where id = session_uuid and counted_at is null;

  if not found then
    return false;
  end if;

  update public.videos
  set view_count = coalesce(view_count, 0) + 1,
      updated_at = pg_catalog.now()
  where id = session_row.video_id
    and visibility = 'public';

  return found;
end;
$function$;

revoke all on function public.start_video_view(uuid) from public;
revoke all on function public.complete_video_view(uuid, numeric, boolean) from public;
grant execute on function public.start_video_view(uuid) to anon, authenticated;
grant execute on function public.complete_video_view(uuid, numeric, boolean) to anon, authenticated;

-- Disable the old unqualified endpoint so a page load alone cannot increment views.
revoke all on function public.increment_view(uuid) from public, anon, authenticated;
