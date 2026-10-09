import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Bucket = "videos" | "thumbnails" | "avatars" | "banners";

const PUBLIC_BUCKETS = new Set<Bucket>(["thumbnails", "avatars", "banners"]);
const TTL = 60 * 60;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

const BUCKET_RULES: Record<Bucket, { maxBytes: number; mimeTypes: readonly string[] }> = {
  videos: { maxBytes: 2 * 1024 * 1024 * 1024, mimeTypes: ["video/mp4", "video/webm", "video/quicktime", "video/ogg"] },
  thumbnails: { maxBytes: 10 * 1024 * 1024, mimeTypes: IMAGE_TYPES },
  avatars: { maxBytes: 5 * 1024 * 1024, mimeTypes: IMAGE_TYPES },
  banners: { maxBytes: 10 * 1024 * 1024, mimeTypes: IMAGE_TYPES },
};

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
  const rules = BUCKET_RULES[bucket];
  if (file.size > rules.maxBytes) {
    throw new Error(`Fichier trop volumineux pour le stockage ${bucket}.`);
  }
  if (file.type && !rules.mimeTypes.includes(file.type)) {
    throw new Error(`Format de fichier non autorisé pour le stockage ${bucket}.`);
  }

  const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const path = `${userId}/${crypto.randomUUID()}.${safeExt}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    ...(file.type ? { contentType: file.type } : {}),
  });
  if (error) throw error;
  return path;
}
