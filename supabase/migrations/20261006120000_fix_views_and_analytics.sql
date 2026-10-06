create or replace function public.increment_view(_video_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare new_count bigint;
begin
  update public.videos
  set view_count = view_count + 1
  where id = _video_id
    and visibility <> 'private'
  returning view_count into new_count;

  if new_count is null then
    return null;
  end if;

  if auth.uid() is not null then
    insert into public.watch_history (user_id, video_id)
    values (auth.uid(), _video_id)
    on conflict (user_id, video_id) do update set watched_at = now();
  end if;

  return new_count;
end
$$;

grant execute on function public.increment_view(uuid) to anon, authenticated;
