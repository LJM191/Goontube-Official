-- Count public video views for anonymous and authenticated visitors.
-- Keep the privileged helper in a non-exposed schema; expose only a narrow RPC wrapper.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated;

CREATE OR REPLACE FUNCTION private.increment_public_video_view(video_uuid uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.videos
  SET view_count = COALESCE(view_count, 0) + 1,
      updated_at = pg_catalog.now()
  WHERE id = video_uuid
    AND visibility = 'public';
$$;

REVOKE ALL ON FUNCTION private.increment_public_video_view(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.increment_public_video_view(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.increment_view(video_uuid uuid)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.increment_public_video_view(video_uuid);
$$;

REVOKE ALL ON FUNCTION public.increment_view(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_view(uuid) TO anon, authenticated;
