-- Allow public video views to be counted for visitors who are not signed in.
-- SECURITY DEFINER lets this narrowly scoped function update the counter despite
-- the videos table's row-level security policies. It only touches public videos.
CREATE OR REPLACE FUNCTION public.increment_view(video_uuid uuid)
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

REVOKE ALL ON FUNCTION public.increment_view(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_view(uuid) TO anon, authenticated;
