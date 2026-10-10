-- Let a channel owner remove comments posted under videos on their own channel.
-- Authors can still delete their own comments through the existing policy.
drop policy if exists comments_owner_delete on public.comments;

create policy comments_owner_delete
on public.comments
for delete
to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.videos v
    join public.channels ch on ch.id = v.channel_id
    where v.id = comments.video_id
      and ch.user_id = auth.uid()
  )
);
