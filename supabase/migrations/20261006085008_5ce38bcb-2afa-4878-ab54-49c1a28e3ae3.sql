revoke execute on function public.tg_reaction_counts() from public, anon, authenticated;
revoke execute on function public.tg_comment_counts() from public, anon, authenticated;
revoke execute on function public.tg_sub_counts() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.has_role(uuid, app_role) from public, anon;