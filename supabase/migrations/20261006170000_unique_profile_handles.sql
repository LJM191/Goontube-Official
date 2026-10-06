alter table public.profiles
  add constraint profiles_username_format
  check (username ~ '^[A-Za-z0-9_]{3,30}$');

create unique index if not exists profiles_username_lower_unique
  on public.profiles (lower(username));