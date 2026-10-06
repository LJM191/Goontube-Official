import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Bucket = "videos" | "thumbnails" | "avatars";

const TTL = 60 * 60; // seconds

/** Resolve a private storage path to a short-lived signed URL. */
export function useMediaUrl(bucket: Bucket, path: string | null | undefined) {
  const { data } = useQuery({
    queryKey: ["media", bucket, path],
    enabled: !!path,
    staleTime: (TTL - 300) * 1000,
    gcTime: (TTL - 300) * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path!, TTL);
      if (error) throw error;
      return data.signedUrl;
    },
  });
  return data ?? null;
}

export async function uploadMedia(bucket: Bucket, userId: string, file: Blob, ext: string) {
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  return path;
}
