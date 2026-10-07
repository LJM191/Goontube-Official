insert into public.categories (slug, name)
values
  ('orientation-hetero', 'Hétéro'),
  ('orientation-bi', 'Bi'),
  ('orientation-gay', 'Gay'),
  ('orientation-cheval', 'S''identifie comme un cheval'),
  ('orientation-pingouin', 'S''identifie comme un pingouin')
on conflict (slug) do update set name = excluded.name;
