import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Bucket = "videos" | "thumbnails" | "avatars" | "photos";

const PUBLIC_BUCKETS = new Set<Bucket>(["thumbnails", "avatars"]);
const TTL = 60 * 60; // seconds

/** Resolve public assets directly through the CDN and private assets through a short-lived signed URL. */
export function useMediaUrl(bucket: Bucket, path: string | null | undefined) {
  const publicUrl =
    path && PUBLIC_BUCKETS.has(bucket)
      ? supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
      : null;

  const { data } = useQuery({
    queryKey: ["media", bucket, path],
    enabled: !!path && !publicUrl,
    staleTime: (TTL - 300) * 1000,
    gcTime: (TTL - 300) * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path!, TTL);
      if (error) throw error;
      return data.signedUrl;
    },
  });

  return publicUrl ?? data ?? null;
}

export async function uploadMedia(bucket: Bucket, userId: string, file: Blob, ext: string) {
  const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const path = `${userId}/${crypto.randomUUID()}.${safeExt}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw error;
  return path;
}
