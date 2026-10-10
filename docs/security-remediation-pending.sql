-- PREPARED ONLY — NOT APPLIED.
-- Review the project ID and migration history before running.
-- Run only after the corresponding frontend code is released and the schema is confirmed.

begin;

-- Restrict public profile reads to fields that are intended to be public.
revoke all privileges on table public.profiles from anon, authenticated;
grant select (
  user_id,
  pseudo,
  avatar,
  profile_photo,
  bio,
  created_at,
  updated_at
) on table public.profiles to anon, authenticated;

-- Allow signed-in users to edit public profile fields only.
grant update (pseudo, avatar, profile_photo, bio, updated_at)
  on table public.profiles to authenticated;

-- Ensure ordinary users cannot forge moderation metadata on comments.
create or replace function public.guard_comment_moderation_fields()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  can_moderate boolean;
begin
  can_moderate :=
    public.has_role('moderator'::public.app_role)
    or public.has_role('admin'::public.app_role);

  if tg_op = 'INSERT' then
    if not can_moderate then
      new.moderation_status := 'visible';
      new.moderated_by := null;
      new.moderated_at := null;
      new.moderation_reason := null;
    end if;
    return new;
  end if;

  if not can_moderate and (
    new.moderation_status is distinct from old.moderation_status
    or new.moderated_by is distinct from old.moderated_by
    or new.moderated_at is distinct from old.moderated_at
    or new.moderation_reason is distinct from old.moderation_reason
  ) then
    raise exception 'Only moderators can change comment moderation fields'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_comment_moderation_fields() from public, anon, authenticated;
drop trigger if exists guard_comment_moderation_fields on public.comments;
create trigger guard_comment_moderation_fields
before insert or update on public.comments
for each row execute function public.guard_comment_moderation_fields();

commit;
